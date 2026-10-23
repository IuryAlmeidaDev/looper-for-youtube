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

    if (!video.__ytLoopEndedAttached) {
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
      container.querySelector('.ytp-loop-toast') ||
      document.querySelector('.ytp-loop-toast');

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
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
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
    }
  }

  /**
   * Lida com transições SPA do YouTube (evento 'yt-navigate-finish')
   */
  function handleNavigation() {
    injectLoopButton();
    applyLoopToVideo();
    AdDestroyer.checkAndDestroyAds();
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
    isTextInputElement,
    handleKeyDown,
    handleNavigation,
    setupObserver,
    initLoopExtension,
    AdDestroyer,
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
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeLooperCore;
  } else {
    global.YouTubeLooperCore = YouTubeLooperCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
