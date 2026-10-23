/**
 * Looper for YouTube - Content Script (content.js)
 * Compatível com Manifest V3, Modo Normal, Teatro, Fullscreen e Miniplayer
 */
(function (global) {
  'use strict';

  // 1. Gerenciamento de Estado Interno
  let isLoopActive = false;
  let isGlobalListenersAttached = false;
  let observerInstance = null;
  let observerDebounceTimeout = null;
  let toastTimeout = null;
  let toastHideTimeout = null;

  /**
   * Obtém o estado atual de repetição
   * @returns {boolean}
   */
  function getLoopState() {
    return isLoopActive;
  }

  /**
   * Define o estado interno de repetição em memória
   * @param {boolean} state
   * @returns {boolean}
   */
  function setLoopState(state) {
    isLoopActive = Boolean(state);
    return isLoopActive;
  }

  /**
   * Lê o estado do loop assincronamente a partir de chrome.storage.local
   * com fallback seguro para localStorage.
   * @returns {Promise<boolean>}
   */
  async function loadLoopState() {
    // 1. Tentar ler do chrome.storage.local
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await new Promise((resolve) => {
          try {
            chrome.storage.local.get(['ytLoopActive'], (result) => {
              if (chrome.runtime && chrome.runtime.lastError) {
                resolve(null);
              } else {
                resolve(result);
              }
            });
          } catch (err) {
            resolve(null);
          }
        });

        if (stored && typeof stored.ytLoopActive === 'boolean') {
          isLoopActive = stored.ytLoopActive;
          return isLoopActive;
        }
      }
    } catch (e) {
      // Ignora falhas no chrome.storage e tenta o fallback
    }

    // 2. Fallback para localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const localValue = localStorage.getItem('ytLoopActive');
        if (localValue !== null) {
          isLoopActive = localValue === 'true';
          return isLoopActive;
        }
      }
    } catch (e) {
      // localStorage pode estar bloqueado em contextos específicos
    }

    return isLoopActive;
  }

  /**
   * Grava o estado do loop em chrome.storage.local e também no localStorage (fallback).
   * @param {boolean} state
   * @returns {Promise<boolean>}
   */
  async function saveLoopState(state) {
    isLoopActive = Boolean(state);

    // Gravar no chrome.storage.local
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise((resolve) => {
          try {
            chrome.storage.local.set({ ytLoopActive: isLoopActive }, () => {
              resolve();
            });
          } catch (err) {
            resolve();
          }
        });
      }
    } catch (e) {
      // Falha silenciosa no storage API
    }

    // Gravar no localStorage (fallback)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ytLoopActive', String(isLoopActive));
      }
    } catch (e) {
      // Falha silenciosa no localStorage
    }

    return isLoopActive;
  }

  /**
   * Verifica se o player do YouTube está exibindo anúncio in-stream
   * @returns {boolean}
   */
  function isAdShowing() {
    if (typeof document === 'undefined') return false;
    const player =
      document.querySelector('.html5-video-player') ||
      document.querySelector('#movie_player');
    const isPlayerAd = Boolean(
      player && player.classList && (
        (typeof player.classList.contains === 'function' && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) ||
        (typeof player.classList.has === 'function' && (player.classList.has('ad-showing') || player.classList.has('ad-interrupting')))
      )
    );
    return isPlayerAd || (typeof AdDestroyer !== 'undefined' && AdDestroyer.isHandlingAd);
  }

  /**
   * Localiza o elemento <video> principal ativo no player do YouTube
   * @returns {HTMLVideoElement|null}
   */
  function getVideoElement() {
    if (typeof document === 'undefined') return null;

    return (
      document.querySelector('video.html5-main-video') ||
      document.querySelector('.html5-video-player video') ||
      document.querySelector('video')
    );
  }

  /**
   * AdDestroyer: Motor de detecção e aniquilação instantânea e silenciosa de anúncios do YouTube.
   * Silencia o áudio, acelera o vídeo a 16x e avança para o final (duration), acionando o botão 'Pular Anúncio'.
   */
  const AdDestroyer = {
    savedVolume: 1,
    savedMuted: false,
    savedPlaybackRate: 1.0,
    isHandlingAd: false,
    checkIntervalId: null,

    init(container, vid) {
      if (this.checkIntervalId) return;
      this.checkIntervalId = setInterval(() => {
        this.checkAndDestroyAds(container, vid);
      }, 250);
      if (this.checkIntervalId && typeof this.checkIntervalId.unref === 'function') {
        this.checkIntervalId.unref();
      }
    },

    restoreAudio(vid) {
      const targetVideo = vid || getVideoElement();
      if (targetVideo) {
        targetVideo.muted = this.savedMuted;
        targetVideo.playbackRate = this.savedPlaybackRate || 1.0;
        if (this.savedVolume !== undefined) {
          try {
            targetVideo.volume = this.savedVolume;
          } catch (e) {}
        }
      }
      this.isHandlingAd = false;
    },

    checkAndDestroyAds(container, vid) {
      const targetContainer =
        container ||
        (typeof document !== 'undefined'
          ? (document.querySelector('.html5-video-player') || document.querySelector('#movie_player'))
          : null);
      const targetVideo = vid || getVideoElement();

      if (!targetContainer || !targetVideo) return;

      const isAd = Boolean(
        targetContainer.classList && (
          (typeof targetContainer.classList.contains === 'function' &&
            (targetContainer.classList.contains('ad-showing') || targetContainer.classList.contains('ad-interrupting'))) ||
          (typeof targetContainer.classList.has === 'function' &&
            (targetContainer.classList.has('ad-showing') || targetContainer.classList.has('ad-interrupting')))
        )
      );

      if (isAd) {
        if (!this.isHandlingAd) {
          this.savedMuted = Boolean(targetVideo.muted);
          this.savedVolume = targetVideo.volume !== undefined ? targetVideo.volume : 1;
          this.savedPlaybackRate = targetVideo.playbackRate || 1.0;
          this.isHandlingAd = true;
        }

        // Silenciar e acelerar ao máximo (16x)
        targetVideo.muted = true;
        targetVideo.playbackRate = 16.0;

        // Pular diretamente para o final do vídeo de anúncio se a duração for válida
        if (isFinite(targetVideo.duration) && targetVideo.duration > 0) {
          try {
            targetVideo.currentTime = targetVideo.duration;
          } catch (e) {}
        }

        // Clicar no botão pular anúncio se presente
        if (typeof targetContainer.querySelector === 'function') {
          const skipBtn = targetContainer.querySelector(
            '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot'
          );
          if (skipBtn && typeof skipBtn.click === 'function') {
            try {
              skipBtn.click();
            } catch (e) {}
          }
        }
      } else if (this.isHandlingAd) {
        this.restoreAudio(targetVideo);
      }
    }
  };

  /**
   * Listener de redundância para o evento 'ended' do elemento <video>.
   * Se o vídeo chegar ao fim e o loop estiver ativo, força reinício imediato.
   * Não executa reinício durante a exibição de anúncios.
   * @param {Event} event
   */
  function handleVideoEnded(event) {
    if (!isLoopActive || isAdShowing()) return;

    const video = (event && event.target) || getVideoElement();
    if (video) {
      video.currentTime = 0;
      try {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } catch (e) {
        // Ignora erros de reprodução automática restrita pelo navegador
      }
    }
  }

  /**
   * Sincroniza o estado de loop com o elemento <video> ativo.
   * Aplica video.loop = isLoopActive (se não houver anúncio) e registra listener de redundância para 'ended'.
   * @returns {HTMLVideoElement|null}
   */
  function applyLoopToVideo() {
    const video = getVideoElement();
    if (!video) return null;

    const isAd = isAdShowing();
    video.loop = isLoopActive && !isAd;

    if (typeof video.addEventListener === 'function' && !video.__ytLoopEndedAttached) {
      video.addEventListener('ended', handleVideoEnded);
      video.__ytLoopEndedAttached = true;
    }

    return video;
  }

  /**
   * Atualiza a aparência visual, classes e atributos ARIA do botão de loop
   * @param {HTMLElement} [button]
   * @param {boolean} [active]
   */
  function updateButtonVisual(button, active) {
    const targetButton =
      button || (typeof document !== 'undefined' ? document.querySelector('.ytp-loop-button') : null);
    if (!targetButton) return;

    const isActive = active !== undefined ? Boolean(active) : isLoopActive;
    if (isActive) {
      targetButton.classList.add('active');
      targetButton.setAttribute('aria-pressed', 'true');
      targetButton.setAttribute('title', 'Repetir (Ativado) (Shift+L)');
      targetButton.setAttribute('data-title-no-tooltip', 'Repetir (Ativado) (Shift+L)');
    } else {
      targetButton.classList.remove('active');
      targetButton.setAttribute('aria-pressed', 'false');
      targetButton.setAttribute('title', 'Repetir (Shift+L)');
      targetButton.setAttribute('data-title-no-tooltip', 'Repetir (Shift+L)');
    }
  }

  /**
   * Exibe notificação flutuante tipo Toast sobre o player do YouTube com feedback de estado.
   * @param {string} [customMessage]
   * @returns {HTMLElement|null}
   */
  function showToast(customMessage) {
    if (typeof document === 'undefined') return null;

    const message =
      typeof customMessage === 'string' && customMessage.trim() !== ''
        ? customMessage
        : (isLoopActive ? 'Repetição ativada (Shift+L)' : 'Repetição desativada (Shift+L)');

    const container =
      document.querySelector('.html5-video-player') ||
      document.querySelector('#movie_player') ||
      document.body;

    if (!container) return null;

    let toast =
      (container && typeof container.querySelector === 'function' ? container.querySelector('.ytp-loop-toast') : null) ||
      (typeof document.querySelector === 'function' ? document.querySelector('.ytp-loop-toast') : null);

    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'ytp-loop-toast';
      container.appendChild(toast);
    } else if (toast.parentNode !== container) {
      container.appendChild(toast);
    }

    // Limpa temporizadores anteriores de animação pendente
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    if (toastHideTimeout) {
      clearTimeout(toastHideTimeout);
      toastHideTimeout = null;
    }

    // Configura classes de estado e animação
    toast.classList.remove('animate-out', 'fade-out');
    if (isLoopActive) {
      toast.classList.add('toast-enabled');
      toast.classList.remove('toast-disabled');
    } else {
      toast.classList.add('toast-disabled');
      toast.classList.remove('toast-enabled');
    }

    const safeMessage = String(message)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    toast.innerHTML = `
      <span class="ytp-loop-toast-icon">
        <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
          <path class="ytp-svg-fill" d="M 7 11 L 10 8 L 10 10 L 23 10 C 25.2 10 27 11.8 27 14 L 27 18 L 24 18 L 24 14 C 24 13.4 23.6 13 23 13 L 10 13 L 10 15 Z M 29 25 L 26 28 L 26 26 L 13 26 C 10.8 26 9 24.2 9 22 L 9 18 L 12 18 L 12 22 C 12 22.6 12.4 23 13 23 L 26 23 L 26 21 Z" />
        </svg>
      </span>
      <span class="ytp-loop-toast-text">${safeMessage}</span>
    `.trim();

    toast.classList.add('show', 'animate-in');

    // Temporizador de 1.5s (1500ms) para animação de saída e remoção do DOM
    toastTimeout = setTimeout(() => {
      toast.classList.remove('animate-in');
      toast.classList.add('animate-out');

      toastHideTimeout = setTimeout(() => {
        if (toast) {
          if (typeof toast.remove === 'function') {
            toast.remove();
          } else if (toast.parentNode && typeof toast.parentNode.removeChild === 'function') {
            toast.parentNode.removeChild(toast);
          }
        }
        toastHideTimeout = null;
      }, 250);

      toastTimeout = null;
    }, 1500);

    return toast;
  }

  /**
   * Alterna o estado de repetição (on/off), persiste no storage,
   * sincroniza com o elemento de vídeo, atualiza o botão e exibe toast.
   * @returns {boolean} Novo estado de repetição
   */
  function toggleLoopState() {
    isLoopActive = !isLoopActive;

    // Salvar estado em segundo plano
    saveLoopState(isLoopActive).catch(() => {});

    // Sincronizar vídeo
    applyLoopToVideo();

    // Atualizar visual do botão
    updateButtonVisual();

    // Notificar usuário via Toast
    showToast();

    // Sincronizar com miniplayer PiP se aberto
    if (typeof MiniPlayerController !== 'undefined' && MiniPlayerController && MiniPlayerController.pipWindow && !MiniPlayerController.pipWindow.closed) {
      MiniPlayerController.syncPlaybackState(MiniPlayerController.pipWindow.document);
    }

    return isLoopActive;
  }

  /**
   * Cria o elemento do botão DOM para inserção na barra de controles do player
   * @returns {HTMLButtonElement}
   */
  function createLoopButton() {
    const button = document.createElement('button');
    button.className = 'ytp-button ytp-loop-button';
    button.setAttribute('aria-label', 'Repetir (Shift+L)');
    button.setAttribute('title', 'Repetir (Shift+L)');
    button.setAttribute('data-title-no-tooltip', 'Repetir (Shift+L)');
    button.setAttribute('aria-pressed', isLoopActive ? 'true' : 'false');

    button.innerHTML = `
      <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path class="ytp-svg-fill" d="M 7 11 L 10 8 L 10 10 L 23 10 C 25.2 10 27 11.8 27 14 L 27 18 L 24 18 L 24 14 C 24 13.4 23.6 13 23 13 L 10 13 L 10 15 Z M 29 25 L 26 28 L 26 26 L 13 26 C 10.8 26 9 24.2 9 22 L 9 18 L 12 18 L 12 22 C 12 22.6 12.4 23 13 23 L 26 23 L 26 21 Z" />
      </svg>
    `.trim();

    // Listener de clique para alternar o estado do loop
    button.addEventListener('click', (event) => {
      if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
      }
      toggleLoopState();
    });
    button.__ytLoopClickAttached = true;

    updateButtonVisual(button, isLoopActive);
    return button;
  }

  /**
   * Injeta o botão na barra de controles à esquerda (.ytp-left-controls)
   * Evita duplicação caso o botão já exista.
   * @returns {HTMLButtonElement|null}
   */
  function injectLoopButton() {
    if (typeof document === 'undefined') return null;

    const leftControls = document.querySelector('.ytp-left-controls');
    if (!leftControls) {
      return null;
    }

    // Verifica se já existe um botão de loop na barra ou no DOM
    let existingButton = leftControls.querySelector('.ytp-loop-button');
    if (!existingButton) {
      existingButton = document.querySelector('.ytp-loop-button');
    }

    if (existingButton) {
      if (!existingButton.__ytLoopClickAttached) {
        existingButton.addEventListener('click', (event) => {
          if (event) {
            if (typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
          }
          toggleLoopState();
        });
        existingButton.__ytLoopClickAttached = true;
      }
      updateButtonVisual(existingButton, isLoopActive);
      return existingButton;
    }

    const button = createLoopButton();

    const nextButton = leftControls.querySelector('.ytp-next-button');
    const playButton = leftControls.querySelector('.ytp-play-button');

    if (nextButton) {
      nextButton.insertAdjacentElement('afterend', button);
    } else if (playButton) {
      playButton.insertAdjacentElement('afterend', button);
    } else {
      leftControls.appendChild(button);
    }

    updateButtonVisual(button, isLoopActive);
    return button;
  }
  /**
   * Cria o elemento do botão nativo de acionamento do Mini Player Flutuante (.ytp-pip-button)
   * @returns {HTMLButtonElement|null}
   */
  function createPipButton() {
    if (typeof document === 'undefined') return null;

    const button = document.createElement('button');
    button.className = 'ytp-button ytp-pip-button';
    button.setAttribute('aria-label', 'Mini Player Flutuante (Shift+P)');
    button.setAttribute('title', 'Mini Player Flutuante (Shift+P)');
    button.setAttribute('data-title-no-tooltip', 'Mini Player Flutuante (Shift+P)');

    button.innerHTML = `
      <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path class="ytp-svg-fill" d="M 25 11 L 11 11 C 9.9 11 9 11.9 9 13 L 9 23 C 9 24.1 9.9 25 11 25 L 25 25 C 26.1 25 27 24.1 27 23 L 27 13 C 27 11.9 26.1 11 25 11 Z M 25 23 L 11 23 L 11 13 L 25 13 L 25 23 Z M 24 17 L 17 17 C 16.4 17 16 17.4 16 18 L 16 22 C 16 22.6 16.4 23 17 23 L 24 23 C 24.6 23 25 22.6 25 22 L 25 18 C 25 17.4 24.6 17 24 17 Z" />
      </svg>
    `.trim();

    button.addEventListener('click', (event) => {
      if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
      }
      if (typeof MiniPlayerController !== 'undefined' && MiniPlayerController && typeof MiniPlayerController.open === 'function') {
        MiniPlayerController.open();
      }
    });
    button.__ytPipClickAttached = true;

    return button;
  }

  /**
   * Injeta o botão do Mini Player na barra de controles à esquerda (.ytp-left-controls)
   * Imediatamente após o .ytp-loop-button (ou .ytp-play-button).
   * Idempotente: evita duplicações no DOM.
   * @param {HTMLElement} [targetContainer]
   * @returns {HTMLButtonElement|null}
   */
  function injectPipButton(targetContainer) {
    if (typeof document === 'undefined') return null;

    const leftControls = targetContainer || document.querySelector('.ytp-left-controls');
    if (!leftControls) {
      return null;
    }

    // Verifica se já existe um botão de PiP na barra ou no DOM
    let existingButton = null;
    if (typeof leftControls.querySelector === 'function') {
      existingButton = leftControls.querySelector('.ytp-pip-button');
    }
    if (!existingButton && leftControls.children && Array.isArray(leftControls.children)) {
      existingButton = leftControls.children.find(child => child && child.classList && (
        (typeof child.classList.contains === 'function' && child.classList.contains('ytp-pip-button')) ||
        (typeof child.classList.has === 'function' && child.classList.has('ytp-pip-button'))
      ));
    }
    if (!existingButton && !targetContainer && typeof document.querySelector === 'function') {
      existingButton = document.querySelector('.ytp-pip-button');
    }

    if (existingButton) {
      if (!existingButton.__ytPipClickAttached) {
        existingButton.addEventListener('click', (event) => {
          if (event) {
            if (typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
          }
          if (typeof MiniPlayerController !== 'undefined' && MiniPlayerController && typeof MiniPlayerController.open === 'function') {
            MiniPlayerController.open();
          }
        });
        existingButton.__ytPipClickAttached = true;
      }
      return existingButton;
    }

    const button = createPipButton();
    if (!button) return null;

    let loopButton = typeof leftControls.querySelector === 'function' ? leftControls.querySelector('.ytp-loop-button') : null;
    if (!loopButton && leftControls.children && Array.isArray(leftControls.children)) {
      loopButton = leftControls.children.find(c => c && c.classList && (
        (typeof c.classList.contains === 'function' && c.classList.contains('ytp-loop-button')) ||
        (typeof c.classList.has === 'function' && c.classList.has('ytp-loop-button'))
      ));
    }

    let nextButton = typeof leftControls.querySelector === 'function' ? leftControls.querySelector('.ytp-next-button') : null;
    if (!nextButton && leftControls.children && Array.isArray(leftControls.children)) {
      nextButton = leftControls.children.find(c => c && c.classList && (
        (typeof c.classList.contains === 'function' && c.classList.contains('ytp-next-button')) ||
        (typeof c.classList.has === 'function' && c.classList.has('ytp-next-button'))
      ));
    }

    let playButton = typeof leftControls.querySelector === 'function' ? leftControls.querySelector('.ytp-play-button') : null;
    if (!playButton && leftControls.children && Array.isArray(leftControls.children)) {
      playButton = leftControls.children.find(c => c && c.classList && (
        (typeof c.classList.contains === 'function' && c.classList.contains('ytp-play-button')) ||
        (typeof c.classList.has === 'function' && c.classList.has('ytp-play-button'))
      ));
    }

    if (loopButton && typeof loopButton.insertAdjacentElement === 'function') {
      loopButton.insertAdjacentElement('afterend', button);
    } else if (nextButton && typeof nextButton.insertAdjacentElement === 'function') {
      nextButton.insertAdjacentElement('afterend', button);
    } else if (playButton && typeof playButton.insertAdjacentElement === 'function') {
      playButton.insertAdjacentElement('afterend', button);
    } else if (typeof leftControls.appendChild === 'function') {
      leftControls.appendChild(button);
    }

    return button;
  }

  /**
   * Verifica se o elemento alvo do evento de teclado é um campo editável de texto
   * @param {EventTarget|HTMLElement|null} target
   * @returns {boolean}
   */
  function isTextInputElement(target) {
    if (!target) return false;

    const tagName = target.tagName ? target.tagName.toUpperCase() : '';
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
      return true;
    }

    if (target.isContentEditable) {
      return true;
    }

    if (typeof target.closest === 'function') {
      if (
        target.closest('[contenteditable="true"]') ||
        target.closest('[contenteditable=""]') ||
        target.closest('[role="textbox"]') ||
        target.closest('input, textarea, select')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Manipulador global para atalho de teclado Shift+L.
   * Ignora digitação em inputs/textareas/contenteditable.
   * @param {KeyboardEvent} event
   */
  function handleKeyDown(event) {
    if (!event) return;

    if (isTextInputElement(event.target)) {
      return;
    }

    // Evita conflitos com outros modificadores de sistema (Ctrl, Alt, Meta/Command)
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // Atalho Shift + L: Repetir
    if (event.shiftKey && (event.key === 'L' || event.key === 'l' || event.code === 'KeyL')) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      toggleLoopState();
      return;
    }

    // Atalho Shift + P: Mini Player Flutuante
    if (event.shiftKey && (event.key === 'P' || event.key === 'p' || event.code === 'KeyP')) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      if (typeof MiniPlayerController !== 'undefined' && MiniPlayerController && typeof MiniPlayerController.open === 'function') {
        MiniPlayerController.open();
      }
    }
  }

  /**
   * Lida com transições SPA do YouTube (evento 'yt-navigate-finish')
   */
  function handleNavigation() {
    injectLoopButton();
    injectPipButton();
    applyLoopToVideo();
    AdDestroyer.checkAndDestroyAds();
    if (typeof MiniPlayerController !== 'undefined' && MiniPlayerController && MiniPlayerController.pipWindow && !MiniPlayerController.pipWindow.closed) {
      MiniPlayerController.updateMetadata();
      MiniPlayerController.attachMediaListeners();
    }
  }

  /**
   * Configura MutationObserver para reinjetar botão e re-sincronizar vídeo
   * caso a interface do player do YouTube seja redesenhada pelo framework SPA.
   * @returns {MutationObserver|null}
   */
  function setupObserver() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    if (observerInstance) {
      observerInstance.disconnect();
      observerInstance = null;
    }

    const targetNode =
      document.querySelector('#movie_player') ||
      document.querySelector('.html5-video-player') ||
      document.querySelector('#player') ||
      document.body;

    if (!targetNode) return null;

    observerInstance = new MutationObserver(() => {
      AdDestroyer.checkAndDestroyAds();

      if (observerDebounceTimeout) {
        clearTimeout(observerDebounceTimeout);
      }
      observerDebounceTimeout = setTimeout(() => {
        const leftControls = document.querySelector('.ytp-left-controls');
        const loopButton = leftControls ? leftControls.querySelector('.ytp-loop-button') : null;
        if (leftControls && !loopButton) {
          injectLoopButton();
        }

        const pipButton = leftControls ? leftControls.querySelector('.ytp-pip-button') : null;
        if (leftControls && !pipButton) {
          injectPipButton(leftControls);
        }

        const video = getVideoElement();
        if (video && (video.loop !== isLoopActive || !video.__ytLoopEndedAttached)) {
          applyLoopToVideo();
        }
      }, 100);
    });

    observerInstance.observe(targetNode, {
      childList: true,
      subtree: true
    });

    return observerInstance;
  }

  /**
   * Inicializa a extensão: carrega estado do storage, injeta botão,
   * sincroniza vídeo e anexa listeners globais e observer.
   * @returns {Promise<HTMLButtonElement|null>}
   */
  async function initLoopExtension() {
    await loadLoopState();
    const button = injectLoopButton();
    injectPipButton();
    applyLoopToVideo();
    AdDestroyer.init();

    if (typeof window !== 'undefined' && !isGlobalListenersAttached) {
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('yt-navigate-finish', handleNavigation);
      setupObserver();
      isGlobalListenersAttached = true;
    }

    return button;
  }

  /**
   * Escapa caracteres especiais HTML para prevenir injeção de script (XSS).
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Ícones SVG inline para autonomia e compatibilidade estrita Manifest V3 CSP
  const svgPrev = '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/></svg>';
  const svgPlay = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  const svgPause = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/></svg>';
  const svgNext = '<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg>';
  const svgLoop = '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" fill="currentColor"/></svg>';
  const svgExpand = '<svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  const svgCollapse = '<svg viewBox="0 0 24 24"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  const svgClose = '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  /**
   * Gera a string HTML completa estruturada para a janela Document Picture-in-Picture.
   * Suporta os modos Pílula (~54px) e Expandido (~180px).
   * @param {Object} [params]
   * @param {boolean} [params.isPill=false]
   * @param {string} [params.title='']
   * @param {string} [params.channel='']
   * @param {string} [params.thumbnail='']
   * @param {boolean} [params.isLoopActive=false]
   * @param {boolean} [params.isPlaying=false]
   * @param {string} [params.currentTimeStr='0:00']
   * @param {string} [params.durationStr='0:00']
   * @param {number} [params.progressPercent=0]
   * @returns {string}
   */
  function renderMiniPlayerHTML(params) {
    const opts = params || {};
    const isPill = Boolean(opts.isPill);
    const title = escapeHtml(opts.title || 'YouTube Video');
    const channel = escapeHtml(opts.channel || 'YouTube');
    const isLoopActive = Boolean(opts.isLoopActive);
    const isPlaying = Boolean(opts.isPlaying);
    const currentTimeStr = escapeHtml(opts.currentTimeStr || '0:00');
    const durationStr = escapeHtml(opts.durationStr || '0:00');
    const progressPercent = typeof opts.progressPercent === 'number' ? Math.max(0, Math.min(100, opts.progressPercent)) : 0;

    // Miniatura com fallback seguro
    const defaultThumbSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="%23666"><rect width="24" height="24" fill="%23222"/><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="%23aaa"/></svg>';
    const thumbnail = opts.thumbnail ? escapeHtml(opts.thumbnail) : defaultThumbSvg;

    const playIcon = isPlaying ? svgPause : svgPlay;
    const playTitle = isPlaying ? 'Pausar' : 'Reproduzir';
    const playClass = isPlaying ? 'btn-control btn-play playing' : 'btn-control btn-play';
    const loopClass = isLoopActive ? 'btn-control btn-loop active' : 'btn-control btn-loop';
    const loopTitle = isLoopActive ? 'Repetir (Ativado)' : 'Repetir';

    if (isPill) {
      return `
<div class="miniplayer-container pill" id="miniplayer-container">
  <div class="pill-info">
    <span class="track-title" title="${title}">${title}</span>
  </div>
  <div class="pill-controls">
    <button class="btn-control btn-prev" title="Anterior" aria-label="Anterior">
      ${svgPrev}
    </button>
    <button class="${playClass}" title="${playTitle}" aria-label="${playTitle}">
      ${playIcon}
    </button>
    <button class="btn-control btn-next" title="Próximo" aria-label="Próximo">
      ${svgNext}
    </button>
    <button class="${loopClass}" title="${loopTitle}" aria-label="${loopTitle}">
      ${svgLoop}
    </button>
    <button class="btn-control btn-toggle-mode btn-expand" data-mode="pill" title="Expandir" aria-label="Expandir">
      ${svgExpand}
    </button>
    <button class="btn-control btn-close" title="Fechar" aria-label="Fechar">
      ${svgClose}
    </button>
  </div>
</div>`.trim();
    }

    return `
<div class="miniplayer-container expanded" id="miniplayer-container">
  <div class="expanded-header">
    <div class="thumbnail-wrapper">
      <img class="track-thumbnail" src="${thumbnail}" alt="${title}" />
    </div>
    <div class="track-info">
      <div class="track-title" title="${title}">${title}</div>
      <div class="track-channel" title="${channel}">${channel}</div>
    </div>
    <div class="header-actions">
      <button class="btn-control btn-toggle-mode btn-collapse" data-mode="expanded" title="Recolher para Pílula" aria-label="Recolher">
        ${svgCollapse}
      </button>
      <button class="btn-control btn-close" title="Fechar" aria-label="Fechar">
        ${svgClose}
      </button>
    </div>
  </div>
  <div class="expanded-progress">
    <span class="time-current">${currentTimeStr}</span>
    <input type="range" class="progress-bar" min="0" max="100" value="${progressPercent}" step="0.1" aria-label="Progresso de reprodução" />
    <span class="time-total">${durationStr}</span>
  </div>
  <div class="expanded-controls">
    <button class="btn-control btn-prev" title="Anterior" aria-label="Anterior">
      ${svgPrev}
    </button>
    <button class="${playClass}" title="${playTitle}" aria-label="${playTitle}">
      ${playIcon}
    </button>
    <button class="btn-control btn-next" title="Próximo" aria-label="Próximo">
      ${svgNext}
    </button>
    <button class="${loopClass}" title="${loopTitle}" aria-label="${loopTitle}">
      ${svgLoop}
    </button>
  </div>
</div>`.trim();
  }

  // ==========================================================================
  // 6. Gerenciador Document Picture-in-Picture (Mini Player Flutuante)
  // ==========================================================================
  const STORAGE_KEY_PIP_MODE = 'yt_looper_pip_mode';

  /**
   * Formata segundos no padrão MM:SS
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  const MiniPlayerController = {
    pipWindow: null,
    isPillMode: true,
    isScrubbing: false,
    _beforeUnloadAttached: false,
    _navListenerAttached: false,
    _boundVideo: null,
    _onVideoPlay: null,
    _onVideoPause: null,
    _onVideoTimeUpdate: null,
    _onVideoDurationChange: null,
    _onVideoEnded: null,

    /**
     * Formata tempo em string MM:SS
     * @param {number} seconds
     * @returns {string}
     */
    formatTime,

    /**
     * Extrai metadados do vídeo em reprodução de forma resiliente
     * @returns {{ title: string, channel: string, thumbnail: string, currentTime: number, duration: number, isPlaying: boolean }}
     */
    getTrackMetadata() {
      let title = '';
      if (typeof document !== 'undefined') {
        const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, ytd-watch-metadata h1 yt-formatted-string');
        if (titleEl && titleEl.textContent) {
          title = titleEl.textContent.trim();
        }
        if (!title && document.title) {
          title = document.title.replace(' - YouTube', '').trim();
        }
      }
      if (!title) {
        title = 'YouTube Video';
      }

      let channel = '';
      if (typeof document !== 'undefined') {
        const channelEl = document.querySelector('#channel-name a, ytd-channel-name a, .ytd-channel-name a');
        if (channelEl && channelEl.textContent) {
          channel = channelEl.textContent.trim();
        }
      }
      if (!channel) {
        channel = 'YouTube';
      }

      let thumbnail = '';
      let videoId = '';
      if (typeof window !== 'undefined' && window.location) {
        try {
          if (window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            videoId = urlParams.get('v') || '';
          }
          if (!videoId && window.location.href) {
            const match = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
            if (match) {
              videoId = match[1];
            }
          }
        } catch (e) {
          // Fallback silencioso
        }
      }
      if (videoId) {
        thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }

      const video = typeof getVideoElement === 'function' ? getVideoElement() : (typeof document !== 'undefined' ? document.querySelector('video') : null);
      const currentTime = video && typeof video.currentTime === 'number' ? video.currentTime : 0;
      const duration = video && typeof video.duration === 'number' && isFinite(video.duration) ? video.duration : 0;
      const isPlaying = Boolean(video && !video.paused && !video.ended && (video.readyState === undefined || video.readyState > 2));

      return {
        title,
        channel,
        thumbnail,
        currentTime,
        duration,
        isPlaying
      };
    },

    /**
     * Carrega a preferência de layout (Pílula ou Expandido) do storage
     * @returns {Promise<boolean>}
     */
    async loadModePreference() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const stored = await new Promise((resolve) => {
            try {
              chrome.storage.local.get([STORAGE_KEY_PIP_MODE], (result) => {
                if (chrome.runtime && chrome.runtime.lastError) {
                  resolve(null);
                } else {
                  resolve(result);
                }
              });
            } catch (err) {
              resolve(null);
            }
          });
          if (stored && typeof stored[STORAGE_KEY_PIP_MODE] === 'boolean') {
            this.isPillMode = stored[STORAGE_KEY_PIP_MODE];
            return this.isPillMode;
          }
        }
      } catch (e) {
        // Fallback silencioso
      }

      try {
        if (typeof localStorage !== 'undefined') {
          const localVal = localStorage.getItem(STORAGE_KEY_PIP_MODE);
          if (localVal !== null) {
            this.isPillMode = localVal === 'true';
            return this.isPillMode;
          }
        }
      } catch (e) {
        // Fallback silencioso
      }

      if (typeof this.isPillMode !== 'boolean') {
        this.isPillMode = true;
      }
      return this.isPillMode;
    },

    /**
     * Salva a preferência de layout no storage
     * @param {boolean} isPill
     * @returns {Promise<boolean>}
     */
    async saveModePreference(isPill) {
      this.isPillMode = Boolean(isPill);

      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await new Promise((resolve) => {
            try {
              chrome.storage.local.set({ [STORAGE_KEY_PIP_MODE]: this.isPillMode }, () => {
                resolve();
              });
            } catch (err) {
              resolve();
            }
          });
        }
      } catch (e) {
        // Fallback silencioso
      }

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_PIP_MODE, String(this.isPillMode));
        }
      } catch (e) {
        // Fallback silencioso
      }

      return this.isPillMode;
    },

    /**
     * Injeta folha de estilos miniplayer.css no documento PiP
     * @param {Document} pipDoc
     */
    injectStyles(pipDoc) {
      if (!pipDoc || !pipDoc.head) return;
      const link = pipDoc.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      const cssUrl = (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function')
        ? chrome.runtime.getURL('miniplayer.css')
        : 'miniplayer.css';
      link.setAttribute('href', cssUrl);
      pipDoc.head.appendChild(link);
    },

    /**
     * Renderiza o HTML do miniplayer dentro da janela PiP
     */
    renderContent() {
      if (!this.pipWindow || !this.pipWindow.document || !this.pipWindow.document.body) return;
      const metadata = this.getTrackMetadata();
      const duration = metadata.duration || 0;
      const currentTime = metadata.currentTime || 0;
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

      const html = renderMiniPlayerHTML({
        isPill: this.isPillMode,
        title: metadata.title,
        channel: metadata.channel,
        thumbnail: metadata.thumbnail,
        isLoopActive: getLoopState(),
        isPlaying: metadata.isPlaying,
        currentTimeStr: formatTime(currentTime),
        durationStr: formatTime(duration),
        progressPercent
      });

      this.pipWindow.document.body.innerHTML = html;
      this.bindWindowEvents(this.pipWindow.document);
    },

    /**
     * Associa eventos de clique e arrasto aos elementos da janela PiP
     * @param {Document} [doc]
     */
    bindWindowEvents(doc) {
      const pipDoc = doc || (this.pipWindow ? this.pipWindow.document : null);
      if (!pipDoc) return;

      // 1. Play / Pause
      const playBtn = pipDoc.querySelector('.btn-play');
      if (playBtn && !playBtn.__ytPiPClickAttached) {
        playBtn.addEventListener('click', (e) => {
          if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
          }
          const video = typeof getVideoElement === 'function' ? getVideoElement() : (typeof document !== 'undefined' ? document.querySelector('video') : null);
          if (video) {
            if (video.paused) {
              try {
                const p = video.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
              } catch (err) {}
            } else {
              try {
                video.pause();
              } catch (err) {}
            }
          }
          this.syncPlaybackState(pipDoc);
        });
        playBtn.__ytPiPClickAttached = true;
      }

      // 2. Próxima faixa (.btn-next -> .ytp-next-button)
      const nextBtn = pipDoc.querySelector('.btn-next');
      if (nextBtn && !nextBtn.__ytPiPClickAttached) {
        nextBtn.addEventListener('click', (e) => {
          if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
          }
          const ytpNext = (typeof document !== 'undefined') ? document.querySelector('.ytp-next-button') : null;
          if (ytpNext && typeof ytpNext.click === 'function') {
            ytpNext.click();
          }
        });
        nextBtn.__ytPiPClickAttached = true;
      }

      // 3. Faixa anterior (.btn-prev -> >3s reset para 0; <=3s .ytp-prev-button ou history.back())
      const prevBtn = pipDoc.querySelector('.btn-prev');
      if (prevBtn && !prevBtn.__ytPiPClickAttached) {
        prevBtn.addEventListener('click', (e) => {
          if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
          }
          const video = typeof getVideoElement === 'function' ? getVideoElement() : (typeof document !== 'undefined' ? document.querySelector('video') : null);
          if (video && typeof video.currentTime === 'number' && video.currentTime > 3) {
            video.currentTime = 0;
            this.syncTimeAndProgress(pipDoc);
          } else {
            const ytpPrev = (typeof document !== 'undefined') ? document.querySelector('.ytp-prev-button') : null;
            if (ytpPrev && typeof ytpPrev.click === 'function') {
              ytpPrev.click();
            } else if (typeof history !== 'undefined' && typeof history.back === 'function') {
              history.back();
            }
          }
        });
        prevBtn.__ytPiPClickAttached = true;
      }

      // 4. Alternar repetição (.btn-loop)
      const loopBtn = pipDoc.querySelector('.btn-loop');
      if (loopBtn && !loopBtn.__ytPiPClickAttached) {
        loopBtn.addEventListener('click', (e) => {
          if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
          }
          toggleLoopState();
          this.syncPlaybackState(pipDoc);
        });
        loopBtn.__ytPiPClickAttached = true;
      }

      // 5. Alternar modo de janela (.btn-toggle-mode)
      const toggleModeBtn = pipDoc.querySelector('.btn-toggle-mode');
      if (toggleModeBtn && !toggleModeBtn.__ytPiPClickAttached) {
        toggleModeBtn.addEventListener('click', (e) => {
          if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
          }
          this.toggleMode();
        });
        toggleModeBtn.__ytPiPClickAttached = true;
      }

      // 6. Fechar janela (.btn-close)
      const closeBtn = pipDoc.querySelector('.btn-close');
      if (closeBtn && !closeBtn.__ytPiPClickAttached) {
        closeBtn.addEventListener('click', (e) => {
          if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
          }
          this.close();
        });
        closeBtn.__ytPiPClickAttached = true;
      }

      // 7. Slider de busca e progresso (.progress-bar)
      const progressBar = pipDoc.querySelector('.progress-bar');
      if (progressBar && !progressBar.__ytPiPSeekAttached) {
        const onScrubStart = () => {
          this.isScrubbing = true;
        };

        const onScrubInput = () => {
          this.isScrubbing = true;
          const video = typeof getVideoElement === 'function' ? getVideoElement() : (typeof document !== 'undefined' ? document.querySelector('video') : null);
          const duration = (video && typeof video.duration === 'number' && isFinite(video.duration)) ? video.duration : 0;
          const val = parseFloat(progressBar.value) || 0;
          const seekTime = (val / 100) * duration;
          const timeCurrentEl = pipDoc.querySelector('.time-current');
          if (timeCurrentEl) {
            timeCurrentEl.textContent = formatTime(seekTime);
          }
        };

        const onScrubCommit = () => {
          const video = typeof getVideoElement === 'function' ? getVideoElement() : (typeof document !== 'undefined' ? document.querySelector('video') : null);
          const duration = (video && typeof video.duration === 'number' && isFinite(video.duration)) ? video.duration : 0;
          const val = parseFloat(progressBar.value) || 0;
          if (video && duration > 0) {
            video.currentTime = (val / 100) * duration;
          }
          this.isScrubbing = false;
          this.syncTimeAndProgress(pipDoc);
        };

        progressBar.addEventListener('mousedown', onScrubStart);
        progressBar.addEventListener('touchstart', onScrubStart);
        progressBar.addEventListener('pointerdown', onScrubStart);

        progressBar.addEventListener('input', onScrubInput);
        progressBar.addEventListener('change', onScrubCommit);

        progressBar.addEventListener('mouseup', onScrubCommit);
        progressBar.addEventListener('touchend', onScrubCommit);
        progressBar.addEventListener('pointerup', onScrubCommit);

        progressBar.__ytPiPSeekAttached = true;
      }

      this.syncPlaybackState(pipDoc);
      this.syncTimeAndProgress(pipDoc);
    },

    /**
     * Sincroniza Play/Pause e Loop no PiP de acordo com o vídeo da página
     * @param {Document} [doc]
     */
    syncPlaybackState(doc) {
      const pipDoc = doc || (this.pipWindow ? this.pipWindow.document : null);
      if (!pipDoc) return;

      const video = typeof getVideoElement === 'function' ? getVideoElement() : (typeof document !== 'undefined' ? document.querySelector('video') : null);
      const isPlaying = Boolean(video && !video.paused && !video.ended);
      const isLoop = getLoopState();

      // Sincronizar botão Play/Pause
      const playBtn = pipDoc.querySelector('.btn-play');
      if (playBtn) {
        if (isPlaying) {
          if (playBtn.classList && typeof playBtn.classList.add === 'function') {
            playBtn.classList.add('playing');
          }
          playBtn.setAttribute('title', 'Pausar');
          playBtn.setAttribute('aria-label', 'Pausar');
          playBtn.innerHTML = svgPause;
        } else {
          if (playBtn.classList && typeof playBtn.classList.remove === 'function') {
            playBtn.classList.remove('playing');
          }
          playBtn.setAttribute('title', 'Reproduzir');
          playBtn.setAttribute('aria-label', 'Reproduzir');
          playBtn.innerHTML = svgPlay;
        }
      }

      // Sincronizar botão Loop
      const loopBtn = pipDoc.querySelector('.btn-loop');
      if (loopBtn) {
        if (isLoop) {
          if (loopBtn.classList && typeof loopBtn.classList.add === 'function') {
            loopBtn.classList.add('active');
          }
          loopBtn.setAttribute('title', 'Repetir (Ativado)');
          loopBtn.setAttribute('aria-label', 'Repetir (Ativado)');
        } else {
          if (loopBtn.classList && typeof loopBtn.classList.remove === 'function') {
            loopBtn.classList.remove('active');
          }
          loopBtn.setAttribute('title', 'Repetir');
          loopBtn.setAttribute('aria-label', 'Repetir');
        }
      }
    },

    /**
     * Sincroniza tempos (01:23 / 04:00) e slider de progresso em tempo real
     * @param {Document} [doc]
     */
    syncTimeAndProgress(doc) {
      const pipDoc = doc || (this.pipWindow ? this.pipWindow.document : null);
      if (!pipDoc) return;

      const video = typeof getVideoElement === 'function' ? getVideoElement() : (typeof document !== 'undefined' ? document.querySelector('video') : null);
      const currentTime = (video && typeof video.currentTime === 'number') ? video.currentTime : 0;
      const duration = (video && typeof video.duration === 'number' && isFinite(video.duration)) ? video.duration : 0;

      const timeCurrentEl = pipDoc.querySelector('.time-current');
      if (timeCurrentEl && !this.isScrubbing) {
        timeCurrentEl.textContent = formatTime(currentTime);
      }

      const timeTotalEl = pipDoc.querySelector('.time-total');
      if (timeTotalEl) {
        timeTotalEl.textContent = formatTime(duration);
      }

      const progressBar = pipDoc.querySelector('.progress-bar');
      if (progressBar && !this.isScrubbing) {
        const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
        progressBar.value = String(pct);
      }
    },

    /**
     * Atualiza título, canal e thumbnail na janela PiP aberta quando a música mudar (ex: navegação SPA)
     * @returns {Object|null}
     */
    updateMetadata() {
      if (!this.pipWindow || this.pipWindow.closed) return null;
      const pipDoc = this.pipWindow.document;
      if (!pipDoc) return null;

      const metadata = this.getTrackMetadata();

      // Atualiza títulos
      const titleEls = pipDoc.querySelectorAll('.track-title');
      if (titleEls && titleEls.length > 0) {
        for (const el of titleEls) {
          el.textContent = metadata.title;
          el.setAttribute('title', metadata.title);
        }
      }

      // Atualiza canais
      const channelEls = pipDoc.querySelectorAll('.track-channel');
      if (channelEls && channelEls.length > 0) {
        for (const el of channelEls) {
          el.textContent = metadata.channel;
          el.setAttribute('title', metadata.channel);
        }
      }

      // Atualiza thumbnail
      const thumbEl = pipDoc.querySelector('.track-thumbnail');
      if (thumbEl) {
        if (metadata.thumbnail) {
          thumbEl.setAttribute('src', metadata.thumbnail);
        }
        thumbEl.setAttribute('alt', metadata.title);
      }

      // Atualiza tempo total
      const totalEl = pipDoc.querySelector('.time-total');
      if (totalEl) {
        totalEl.textContent = formatTime(metadata.duration);
      }

      this.syncPlaybackState(pipDoc);
      this.syncTimeAndProgress(pipDoc);
      this.attachMediaListeners();

      return metadata;
    },

    /**
     * Anexa ouvintes de ciclo de vida de reprodução ao elemento <video>
     */
    attachMediaListeners() {
      const video = typeof getVideoElement === 'function' ? getVideoElement() : (typeof document !== 'undefined' ? document.querySelector('video') : null);
      if (!video) return;

      if (this._boundVideo === video) {
        return;
      }

      this.detachMediaListeners();

      this._boundVideo = video;
      this._onVideoPlay = () => this.syncPlaybackState();
      this._onVideoPause = () => this.syncPlaybackState();
      this._onVideoTimeUpdate = () => this.syncTimeAndProgress();
      this._onVideoDurationChange = () => {
        this.syncTimeAndProgress();
        if (this.pipWindow && this.pipWindow.document) {
          const totalEl = this.pipWindow.document.querySelector('.time-total');
          if (totalEl) totalEl.textContent = formatTime(video.duration || 0);
        }
      };
      this._onVideoEnded = () => {
        this.syncPlaybackState();
        this.syncTimeAndProgress();
      };

      if (typeof video.addEventListener === 'function') {
        video.addEventListener('play', this._onVideoPlay);
        video.addEventListener('pause', this._onVideoPause);
        video.addEventListener('timeupdate', this._onVideoTimeUpdate);
        video.addEventListener('durationchange', this._onVideoDurationChange);
        video.addEventListener('ended', this._onVideoEnded);
      }
    },

    /**
     * Remove os ouvintes anexados ao <video>
     */
    detachMediaListeners() {
      if (this._boundVideo && typeof this._boundVideo.removeEventListener === 'function') {
        try {
          if (this._onVideoPlay) this._boundVideo.removeEventListener('play', this._onVideoPlay);
          if (this._onVideoPause) this._boundVideo.removeEventListener('pause', this._onVideoPause);
          if (this._onVideoTimeUpdate) this._boundVideo.removeEventListener('timeupdate', this._onVideoTimeUpdate);
          if (this._onVideoDurationChange) this._boundVideo.removeEventListener('durationchange', this._onVideoDurationChange);
          if (this._onVideoEnded) this._boundVideo.removeEventListener('ended', this._onVideoEnded);
        } catch (e) {}
      }
      this._boundVideo = null;
      this._onVideoPlay = null;
      this._onVideoPause = null;
      this._onVideoTimeUpdate = null;
      this._onVideoDurationChange = null;
      this._onVideoEnded = null;
    },

    /**
     * Configura ouvinte para evento de navegação SPA yt-navigate-finish
     */
    setupNavigationListener() {
      if (this._navListenerAttached || typeof window === 'undefined') return;
      this._navListenerAttached = true;
      window.addEventListener('yt-navigate-finish', () => {
        if (this.pipWindow && !this.pipWindow.closed) {
          this.updateMetadata();
        }
      });
    },

    /**
     * Abre a janela Document Picture-in-Picture ou foca nela caso já esteja aberta
     * @returns {Promise<Window|null>}
     */
    async open() {
      if (typeof window === 'undefined' || !window.documentPictureInPicture || typeof window.documentPictureInPicture.requestWindow !== 'function') {
        return null;
      }

      if (this.pipWindow && !this.pipWindow.closed) {
        if (typeof this.pipWindow.focus === 'function') {
          this.pipWindow.focus();
        }
        return this.pipWindow;
      }

      try {
        await this.loadModePreference();
        const width = this.isPillMode ? 340 : 360;
        const height = this.isPillMode ? 54 : 180;

        this.pipWindow = await window.documentPictureInPicture.requestWindow({ width, height });

        if (!this.pipWindow) {
          return null;
        }

        // Injeta folha de estilos e marcação HTML
        this.injectStyles(this.pipWindow.document);
        this.renderContent();
        this.attachMediaListeners();
        this.setupNavigationListener();

        // Limpeza idempotente caso a janela seja fechada pelo usuário
        this.pipWindow.addEventListener('pagehide', () => {
          this.detachMediaListeners();
          this.pipWindow = null;
        }, { once: true });

        // Listener para fechar o PiP se a aba principal for fechada
        this.setupBeforeUnload();

        return this.pipWindow;
      } catch (err) {
        return null;
      }
    },

    /**
     * Fecha a janela PiP de forma segura e redefine referências
     */
    close() {
      this.detachMediaListeners();
      this.isScrubbing = false;
      if (this.pipWindow) {
        try {
          if (!this.pipWindow.closed && typeof this.pipWindow.close === 'function') {
            this.pipWindow.close();
          }
        } catch (e) {
          // Fallback silencioso
        }
        this.pipWindow = null;
      }
    },

    /**
     * Alterna entre modo Pílula (340x54) e Expandido (360x180), redimensionando a janela
     * e re-renderizando a interface.
     * @returns {Promise<boolean>}
     */
    async toggleMode() {
      this.isPillMode = !this.isPillMode;
      await this.saveModePreference(this.isPillMode);

      if (this.pipWindow && !this.pipWindow.closed) {
        const width = this.isPillMode ? 340 : 360;
        const height = this.isPillMode ? 54 : 180;
        if (typeof this.pipWindow.resizeTo === 'function') {
          try {
            this.pipWindow.resizeTo(width, height);
          } catch (e) {
            // Alguns navegadores restringem resizeTo
          }
        }
        this.renderContent();
      }

      return this.isPillMode;
    },

    /**
     * Registra o evento beforeunload na janela principal para fechar o PiP graciosamente
     */
    setupBeforeUnload() {
      if (this._beforeUnloadAttached || typeof window === 'undefined') return;
      this._beforeUnloadAttached = true;
      window.addEventListener('beforeunload', () => {
        if (this.pipWindow && !this.pipWindow.closed) {
          this.close();
        }
      });
    }
  };

  // Execução automática ao carregar no contexto do navegador
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initLoopExtension();
      });
    } else {
      initLoopExtension();
    }
  }

  // Objeto de exportação modular para testes ou automação
  const YouTubeLooperCore = {
    get isLoopActive() {
      return isLoopActive;
    },
    set isLoopActive(val) {
      isLoopActive = Boolean(val);
    },
    getLoopState,
    setLoopState,
    loadLoopState,
    saveLoopState,
    isAdShowing,
    getVideoElement,
    handleVideoEnded,
    applyLoopToVideo,
    updateButtonVisual,
    showToast,
    toggleLoopState,
    createLoopButton,
    injectLoopButton,
    createPipButton,
    injectPipButton,
    isTextInputElement,
    handleKeyDown,
    handleNavigation,
    setupObserver,
    initLoopExtension,
    AdDestroyer,
    escapeHtml,
    renderMiniPlayerHTML,
    MiniPlayerController,
    _resetState: () => {
      isLoopActive = false;
      isGlobalListenersAttached = false;
      if (observerInstance) {
        observerInstance.disconnect();
        observerInstance = null;
      }
      if (observerDebounceTimeout) {
        clearTimeout(observerDebounceTimeout);
        observerDebounceTimeout = null;
      }
      if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
      }
      if (toastHideTimeout) {
        clearTimeout(toastHideTimeout);
        toastHideTimeout = null;
      }
      if (AdDestroyer.checkIntervalId) {
        clearInterval(AdDestroyer.checkIntervalId);
        AdDestroyer.checkIntervalId = null;
      }
      AdDestroyer.isHandlingAd = false;
      if (MiniPlayerController.pipWindow) {
        MiniPlayerController.close();
      }
      MiniPlayerController.detachMediaListeners();
      MiniPlayerController.isScrubbing = false;
      MiniPlayerController.isPillMode = true;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeLooperCore;
  } else {
    global.YouTubeLooperCore = YouTubeLooperCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
