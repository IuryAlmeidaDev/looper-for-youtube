/**
 * Test Suite for Task 4: Content Script Video Loop Controls, Shortcuts, Toast & Lifecycle
 */
const assert = require('assert');

// Polyfill minimal DOM environment for Node.js testing
class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this._classList = new Set();
    const self = this;
    this.classList = {
      add: (...clsList) => clsList.forEach(cls => self._classList.add(cls)),
      remove: (...clsList) => clsList.forEach(cls => self._classList.delete(cls)),
      contains: (cls) => self._classList.has(cls),
      has: (cls) => self._classList.has(cls),
      clear: () => self._classList.clear(),
      [Symbol.iterator]: () => self._classList[Symbol.iterator]()
    };
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.eventListeners = {};
    this.isContentEditable = false;
    this.innerHTML = '';
    this.currentTime = 0;
    this.loop = false;
    this.playCalled = false;
  }

  get className() {
    return Array.from(this._classList).join(' ');
  }

  set className(val) {
    this._classList.clear();
    if (typeof val === 'string') {
      val.trim().split(/\s+/).filter(Boolean).forEach(c => this._classList.add(c));
    }
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  hasAttribute(name) {
    return name in this.attributes;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  insertAdjacentElement(position, element) {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.children;
    const index = siblings.indexOf(this);
    if (position === 'afterend') {
      siblings.splice(index + 1, 0, element);
      element.parentNode = this.parentNode;
    } else if (position === 'beforebegin') {
      siblings.splice(index, 0, element);
      element.parentNode = this.parentNode;
    }
    return element;
  }

  addEventListener(type, handler) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (!this.eventListeners[type]) return;
    this.eventListeners[type] = this.eventListeners[type].filter(h => h !== handler);
  }

  dispatchEvent(event) {
    event.target = this;
    const handlers = this.eventListeners[event.type] || [];
    for (const handler of handlers) {
      handler(event);
    }
  }

  closest(selector) {
    if (selector.includes('contenteditable="true"') && this.attributes['contenteditable'] === 'true') {
      return this;
    }
    if (selector.includes('contenteditable=""') && this.attributes['contenteditable'] === '') {
      return this;
    }
    if (this.parentNode && typeof this.parentNode.closest === 'function') {
      return this.parentNode.closest(selector);
    }
    return null;
  }

  querySelector(selector) {
    return mockQuerySelector(this, selector);
  }

  querySelectorAll(selector) {
    return mockQuerySelectorAll(this, selector);
  }

  play() {
    this.playCalled = true;
    return Promise.resolve();
  }
}

function mockQuerySelector(root, selector) {
  const all = mockQuerySelectorAll(root, selector);
  return all.length > 0 ? all[0] : null;
}

function mockQuerySelectorAll(root, selector) {
  const results = [];
  function traverse(node) {
    if (!node || !node.children) return;
    for (const child of node.children) {
      let matches = false;
      if (selector === '.ytp-left-controls' && child.classList && child.classList.contains('ytp-left-controls')) matches = true;
      else if (selector === '.ytp-loop-button' && child.classList && child.classList.contains('ytp-loop-button')) matches = true;
      else if (selector === '.ytp-next-button' && child.classList && child.classList.contains('ytp-next-button')) matches = true;
      else if (selector === '.ytp-play-button' && child.classList && child.classList.contains('ytp-play-button')) matches = true;
      else if (selector === '.html5-video-player' && child.classList && child.classList.contains('html5-video-player')) matches = true;
      else if (selector === '#movie_player' && child.id === 'movie_player') matches = true;
      else if (selector === '.ytp-loop-toast' && child.classList && child.classList.contains('ytp-loop-toast')) matches = true;
      else if ((selector === 'video.html5-main-video' || selector === '.html5-main-video') && child.tagName === 'VIDEO' && child.classList.contains('html5-main-video')) matches = true;
      else if (selector === 'video' && child.tagName === 'VIDEO') matches = true;
      else if (selector === '.html5-video-player video' && child.tagName === 'VIDEO') matches = true;

      if (matches) results.push(child);
      traverse(child);
    }
  }
  traverse(root);
  return results;
}

// Setup fake DOM environment
const documentMock = new MockElement('document');
documentMock.body = new MockElement('body');
documentMock.appendChild(documentMock.body);
documentMock.createElement = (tag) => new MockElement(tag);
documentMock.querySelector = (selector) => mockQuerySelector(documentMock, selector);
documentMock.querySelectorAll = (selector) => mockQuerySelectorAll(documentMock, selector);
documentMock.readyState = 'complete';

const windowEventListeners = {};
const windowMock = {
  document: documentMock,
  addEventListener: (type, handler) => {
    if (!windowEventListeners[type]) windowEventListeners[type] = [];
    windowEventListeners[type].push(handler);
  },
  removeEventListener: (type, handler) => {
    if (!windowEventListeners[type]) return;
    windowEventListeners[type] = windowEventListeners[type].filter(h => h !== handler);
  },
  dispatchEvent: (event) => {
    const handlers = windowEventListeners[event.type] || [];
    for (const h of handlers) h(event);
  }
};

class MockMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.observed = null;
  }
  observe(target, options) {
    this.observed = target;
  }
  disconnect() {
    this.observed = null;
  }
  trigger() {
    if (this.callback) this.callback([], this);
  }
}

global.document = documentMock;
global.window = windowMock;
global.MutationObserver = MockMutationObserver;

// Setup mock chrome.storage.local
let mockStorage = {};
global.chrome = {
  storage: {
    local: {
      get: (keys, cb) => {
        const res = {};
        for (const k of keys) {
          if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
        }
        cb(res);
      },
      set: (data, cb) => {
        Object.assign(mockStorage, data);
        if (cb) cb();
      }
    }
  },
  runtime: {}
};

// Load content.js
const YouTubeLooperCore = require('./content.js');

console.log('=== Inciando Bateria de Testes para Task 4 ===\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] Teste ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Teste ${total}: ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] Teste ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Teste ${total}: ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // Helper to reset DOM
  function resetDOM() {
    YouTubeLooperCore._resetState();
    mockStorage = {};
    documentMock.body.children = [];
    const player = new MockElement('div');
    player.classList.add('html5-video-player');
    player.id = 'movie_player';

    const leftControls = new MockElement('div');
    leftControls.classList.add('ytp-left-controls');

    const playButton = new MockElement('button');
    playButton.classList.add('ytp-play-button');
    leftControls.appendChild(playButton);

    const nextButton = new MockElement('button');
    nextButton.classList.add('ytp-next-button');
    leftControls.appendChild(nextButton);

    const video = new MockElement('video');
    video.classList.add('html5-main-video');
    player.appendChild(video);
    player.appendChild(leftControls);

    documentMock.body.appendChild(player);
  }

  // Test 1: Sincronização do elemento <video> com applyLoopToVideo()
  test('Sincronização do elemento <video> com applyLoopToVideo()', () => {
    resetDOM();
    const video = YouTubeLooperCore.getVideoElement();
    assert(video !== null, 'Elemento de vídeo deve ser encontrado');

    YouTubeLooperCore.setLoopState(true);
    YouTubeLooperCore.applyLoopToVideo();
    assert.strictEqual(video.loop, true, 'video.loop deve ser true quando isLoopActive for true');
    assert.strictEqual(video.__ytLoopEndedAttached, true, 'Listener de ended deve estar registrado');

    YouTubeLooperCore.setLoopState(false);
    YouTubeLooperCore.applyLoopToVideo();
    assert.strictEqual(video.loop, false, 'video.loop deve ser false quando isLoopActive for false');
  });

  // Test 2: Fallback no evento 'ended' do elemento <video>
  test('Fallback de repetição no evento ended quando loop está ativo', () => {
    resetDOM();
    const video = YouTubeLooperCore.getVideoElement();
    YouTubeLooperCore.setLoopState(true);
    YouTubeLooperCore.applyLoopToVideo();

    video.currentTime = 45;
    video.playCalled = false;

    // Disparar evento ended
    video.dispatchEvent({ type: 'ended' });

    assert.strictEqual(video.currentTime, 0, 'video.currentTime deve reiniciar para 0');
    assert.strictEqual(video.playCalled, true, 'video.play() deve ser acionado no fallback');

    // Quando desativado, ended não deve reiniciar
    YouTubeLooperCore.setLoopState(false);
    video.currentTime = 50;
    video.playCalled = false;
    video.dispatchEvent({ type: 'ended' });
    assert.strictEqual(video.currentTime, 50, 'video.currentTime não deve ser alterado quando loop estiver inativo');
    assert.strictEqual(video.playCalled, false, 'video.play() não deve ser chamado quando loop estiver inativo');
  });

  // Test 3: Alternância de Estado com toggleLoopState()
  test('Alternância completa com toggleLoopState()', () => {
    resetDOM();
    const video = YouTubeLooperCore.getVideoElement();
    const btn = YouTubeLooperCore.injectLoopButton();

    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Estado inicial deve ser false');

    // Alternar para ATIVO
    const newState = YouTubeLooperCore.toggleLoopState();
    assert.strictEqual(newState, true, 'toggleLoopState() deve retornar true');
    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'isLoopActive deve ser true');
    assert.strictEqual(video.loop, true, 'video.loop deve ser sincronizado para true');
    assert.strictEqual(btn.classList.contains('active'), true, 'Botão deve ter classe active');
    assert.strictEqual(btn.getAttribute('aria-pressed'), 'true');
    assert(btn.getAttribute('title').includes('Ativado'));

    // Toast criado
    const toast = documentMock.querySelector('.ytp-loop-toast');
    assert(toast !== null, 'Toast deve ser criado no DOM');
    assert(toast.classList.contains('toast-enabled'), 'Toast deve ter classe toast-enabled');
    assert(toast.innerHTML.includes('Repetição ativada (Shift+L)'), 'Toast deve conter mensagem de ativado');

    // Alternar para INATIVO
    const secondState = YouTubeLooperCore.toggleLoopState();
    assert.strictEqual(secondState, false, 'toggleLoopState() deve retornar false');
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'isLoopActive deve ser false');
    assert.strictEqual(video.loop, false, 'video.loop deve ser false');
    assert.strictEqual(btn.classList.contains('active'), false, 'Botão não deve ter classe active');
    assert.strictEqual(btn.getAttribute('aria-pressed'), 'false');
    assert(toast.classList.contains('toast-disabled'), 'Toast deve ter classe toast-disabled');
    assert(toast.innerHTML.includes('Repetição desativada (Shift+L)'), 'Toast deve conter mensagem de desativado');
  });

  // Test 4: Toast notification estrutura e custom message
  test('Estrutura e classes da notificação Toast flutuante', () => {
    resetDOM();
    const toast = YouTubeLooperCore.showToast('Mensagem Customizada de Teste');
    assert(toast !== null, 'Toast deve existir');
    assert(toast.classList.contains('ytp-loop-toast'), 'Toast deve possuir classe .ytp-loop-toast');
    assert(toast.classList.contains('show'), 'Toast deve ter classe .show');
    assert(toast.classList.contains('animate-in'), 'Toast deve ter classe .animate-in');
    assert(toast.innerHTML.includes('Mensagem Customizada de Teste'), 'Toast deve renderizar texto customizado');
    assert(toast.innerHTML.includes('ytp-loop-toast-icon'), 'Toast deve renderizar ícone SVG');
  });

  // Test 5: Ignorar atalho de teclado em campos editáveis (INPUT, TEXTAREA, CONTENTEDITABLE)
  test('Prevenção de digitação: ignora tecla em inputs e contenteditable', () => {
    resetDOM();
    YouTubeLooperCore.setLoopState(false);

    // 1. INPUT
    const inputElem = new MockElement('input');
    let defaultPrevented = false;
    let event = {
      target: inputElem,
      shiftKey: true,
      key: 'L',
      preventDefault: () => { defaultPrevented = true; }
    };
    YouTubeLooperCore.handleKeyDown(event);
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Não deve alterar loop quando target for input');
    assert.strictEqual(defaultPrevented, false, 'Não deve prevenir default em input');

    // 2. TEXTAREA
    const textareaElem = new MockElement('textarea');
    event.target = textareaElem;
    YouTubeLooperCore.handleKeyDown(event);
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Não deve alterar loop em textarea');

    // 3. CONTENTEDITABLE
    const editableDiv = new MockElement('div');
    editableDiv.isContentEditable = true;
    event.target = editableDiv;
    YouTubeLooperCore.handleKeyDown(event);
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Não deve alterar loop em div editável');

    // 4. Elemento dentro de [contenteditable="true"]
    const parentEditable = new MockElement('div');
    parentEditable.setAttribute('contenteditable', 'true');
    const childSpan = new MockElement('span');
    parentEditable.appendChild(childSpan);
    event.target = childSpan;
    YouTubeLooperCore.handleKeyDown(event);
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Não deve alterar loop dentro de container contenteditable');
  });

  // Test 6: Atalho de teclado Shift+L global quando fora de campos de texto
  test('Atalho de teclado Shift+L alterna estado com sucesso', () => {
    resetDOM();
    YouTubeLooperCore.setLoopState(false);

    let prevented = false;
    let stopped = false;
    const bodyElem = documentMock.body;
    const event = {
      target: bodyElem,
      shiftKey: true,
      key: 'L',
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
      stopImmediatePropagation: () => {}
    };

    YouTubeLooperCore.handleKeyDown(event);
    assert.strictEqual(prevented, true, 'preventDefault deve ser chamado para Shift+L');
    assert.strictEqual(stopped, true, 'stopPropagation deve ser chamado para Shift+L');
    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'Loop deve ter sido ativado');

    // Segundo toque desativa
    YouTubeLooperCore.handleKeyDown(event);
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Loop deve ter sido desativado');
  });

  // Test 7: Clique no botão do player aciona toggleLoopState()
  test('Clique no botão injetado aciona alternância de loop', () => {
    resetDOM();
    const btn = YouTubeLooperCore.injectLoopButton();
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false);

    let clickPrevented = false;
    btn.dispatchEvent({
      type: 'click',
      preventDefault: () => { clickPrevented = true; }
    });

    assert.strictEqual(clickPrevented, true, 'Clique deve prevenir comportamento padrão');
    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'Clique deve alternar loop para true');
  });

  // Test 8: Navegação SPA (yt-navigate-finish) reaplica loop e injeta botão
  test('Navegação SPA re-sincroniza o vídeo e re-injeta o botão', () => {
    resetDOM();
    YouTubeLooperCore.setLoopState(true);

    // Simula remoção de botão em transição SPA do YouTube
    const leftControls = documentMock.querySelector('.ytp-left-controls');
    const oldBtn = leftControls.querySelector('.ytp-loop-button');
    if (oldBtn) leftControls.removeChild(oldBtn);

    const video = YouTubeLooperCore.getVideoElement();
    video.loop = false; // Reset de navegação pelo player do YT

    YouTubeLooperCore.handleNavigation();

    const newBtn = leftControls.querySelector('.ytp-loop-button');
    assert(newBtn !== null, 'Botão deve ter sido reinjetado na navegação');
    assert.strictEqual(video.loop, true, 'video.loop deve ser reaplicado para true na nova página');
  });

  // Test 9: Inicialização completa via initLoopExtension()
  await testAsync('Inicialização assíncrona completa com initLoopExtension()', async () => {
    resetDOM();
    mockStorage['ytLoopActive'] = true;

    const btn = await YouTubeLooperCore.initLoopExtension();
    assert(btn !== null, 'Botão deve ser retornado na inicialização');
    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'Estado deve ser recuperado do storage');
    assert.strictEqual(btn.classList.contains('active'), true, 'Botão deve estar visualmente ativo');
    const video = YouTubeLooperCore.getVideoElement();
    assert.strictEqual(video.loop, true, 'Vídeo deve estar com loop sincronizado');
  });

  // Test 10: Atalho de teclado com modificadores ignorados (Ctrl+Shift+L, Alt+Shift+L) e suporte a 'l' minúsculo
  test('Atalho de teclado ignora Ctrl/Alt/Meta e suporta l minúsculo', () => {
    resetDOM();
    YouTubeLooperCore.setLoopState(false);

    // Ctrl + Shift + L não deve acionar
    const ctrlEvent = {
      target: documentMock.body,
      ctrlKey: true,
      shiftKey: true,
      key: 'L',
      preventDefault: () => {}
    };
    YouTubeLooperCore.handleKeyDown(ctrlEvent);
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Ctrl+Shift+L deve ser ignorado');

    // Alt + Shift + L não deve acionar
    const altEvent = {
      target: documentMock.body,
      altKey: true,
      shiftKey: true,
      key: 'L',
      preventDefault: () => {}
    };
    YouTubeLooperCore.handleKeyDown(altEvent);
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Alt+Shift+L deve ser ignorado');

    // Shift + 'l' minúsculo deve acionar
    let prevented = false;
    const lowerEvent = {
      target: documentMock.body,
      shiftKey: true,
      key: 'l',
      preventDefault: () => { prevented = true; },
      stopPropagation: () => {},
      stopImmediatePropagation: () => {}
    };
    YouTubeLooperCore.handleKeyDown(lowerEvent);
    assert.strictEqual(prevented, true, 'Shift+l minúsculo deve ter preventDefault acionado');
    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'Shift+l minúsculo deve alternar estado');
  });

  // Test 11: Toast timer e ciclo de vida de animação
  await testAsync('Toast temporizador de 1.5s aciona animação de saída e posterior remoção', async () => {
    resetDOM();
    const toast = YouTubeLooperCore.showToast('Teste de Timer');
    assert(toast !== null);
    assert(toast.classList.contains('animate-in'));
    assert(documentMock.querySelector('.ytp-loop-toast') !== null);

    // Avançar tempo em 1550ms
    await new Promise((resolve) => setTimeout(resolve, 1550));
    assert(toast.classList.contains('animate-out'), 'Após 1500ms, deve adicionar animate-out');

    // Avançar tempo mais 300ms (tempo de remoção do DOM)
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(toast.parentNode === null, 'Toast deve ter sido removido do container pai');
  });

  console.log(`\n=== Resultado: ${passed}/${total} Testes Concluídos com Sucesso! ===\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
