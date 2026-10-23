/**
 * YouTube Music & Video Looper - Content Script Core (content.js)
 * Compatível com Manifest V3, Modo Normal, Teatro, Fullscreen e Miniplayer
 */
(function (global) {
  'use strict';

  // 1. Gerenciamento de Estado Interno
  let isLoopActive = false;

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
   * Atualiza a aparência visual, classes e atributos ARIA do botão de loop
   * @param {HTMLElement} button
   * @param {boolean} active
   */
  function updateButtonVisual(button, active) {
    if (!button) return;

    const isActive = Boolean(active);
    if (isActive) {
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('title', 'Repetir (Ativado) (Shift+L)');
      button.setAttribute('data-title-no-tooltip', 'Repetir (Ativado) (Shift+L)');
    } else {
      button.classList.remove('active');
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('title', 'Repetir (Shift+L)');
      button.setAttribute('data-title-no-tooltip', 'Repetir (Shift+L)');
    }
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
   * Inicializa a extensão: carrega estado do storage e injeta botão
   * @returns {Promise<HTMLButtonElement|null>}
   */
  async function initLoopExtension() {
    await loadLoopState();
    return injectLoopButton();
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

  // Objeto de exportação modular para testes ou extensão na Task 4
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
    updateButtonVisual,
    createLoopButton,
    injectLoopButton,
    initLoopExtension
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeLooperCore;
  } else {
    global.YouTubeLooperCore = YouTubeLooperCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
