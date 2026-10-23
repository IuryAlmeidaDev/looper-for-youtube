/**
 * Looper for YouTube - Playback & Controls Bidirectional Synchronization Unit Tests (Task 4)
 */

const assert = require('assert');
const path = require('path');

console.log('================================================================');
console.log('   Mini Player - Teste de Sincronização Bidirecional (Task 4)   ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

async function testAsync(description, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         Motivo: ${err.message}`);
    failCount++;
  }
}

function test(description, fn) {
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         Motivo: ${err.message}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// Mock DOM & Environment Setup
// -----------------------------------------------------------------------------

function parseHTMLToNodes(html) {
  const root = new MockElement('div');
  const stack = [root];
  const tagRegex = /<\/?([a-zA-Z0-9-]+)((?:\s+[a-zA-Z0-9-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const [full, tagName, attrString, isSelfClosing, text] = match;

    if (text) {
      const trimmed = text.trim();
      if (trimmed && stack.length > 0) {
        stack[stack.length - 1].textContent = trimmed;
      }
      continue;
    }

    if (full.startsWith('</')) {
      if (stack.length > 1) {
        stack.pop();
      }
    } else {
      const el = new MockElement(tagName);
      if (attrString) {
        const attrRegex = /([a-zA-Z0-9-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
          const attrName = attrMatch[1];
          const attrVal = attrMatch[2] !== undefined ? attrMatch[2] : (attrMatch[3] !== undefined ? attrMatch[3] : (attrMatch[4] !== undefined ? attrMatch[4] : ''));
          el.setAttribute(attrName, attrVal);
          if (attrName === 'class') {
            el.className = attrVal;
          }
          if (attrName === 'value') {
            el.value = attrVal;
          }
        }
      }
      stack[stack.length - 1].appendChild(el);
      const isVoid = isSelfClosing === '/' || ['img', 'input', 'br', 'hr', 'link', 'meta'].includes(tagName.toLowerCase());
      if (!isVoid) {
        stack.push(el);
      }
    }
  }

  return root.children;
}

class MockElement {
  constructor(tagName) {
    this.tagName = (tagName || 'div').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.parentNode = null;
    this.eventListeners = {};
    this._classList = new Set();
    this._value = '';
    this._textContent = '';
    this._innerHTML = '';

    const self = this;
    this.classList = {
      add: (...tokens) => tokens.forEach(t => self._classList.add(t)),
      remove: (...tokens) => tokens.forEach(t => self._classList.delete(t)),
      contains: (t) => self._classList.has(t),
      has: (t) => self._classList.has(t),
      toggle: (t, force) => {
        if (force === true) {
          self._classList.add(t);
          return true;
        } else if (force === false) {
          self._classList.delete(t);
          return false;
        }
        if (self._classList.has(t)) {
          self._classList.delete(t);
          return false;
        } else {
          self._classList.add(t);
          return true;
        }
      }
    };
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

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = String(val);
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = String(val);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = String(val);
    const parsed = parseHTMLToNodes(this._innerHTML);
    this.children = parsed;
    for (const child of this.children) {
      child.parentNode = this;
    }
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  hasAttribute(name) {
    return this.attributes[name] !== undefined;
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

  remove() {
    if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
      this.parentNode.removeChild(this);
    }
  }

  addEventListener(type, fn, opts) {
    this.eventListeners[type] = this.eventListeners[type] || [];
    this.eventListeners[type].push({ fn, once: opts && opts.once });
  }

  removeEventListener(type, fn) {
    if (!this.eventListeners[type]) return;
    this.eventListeners[type] = this.eventListeners[type].filter(item => item.fn !== fn);
  }

  dispatchEvent(evt) {
    const list = this.eventListeners[evt.type] || [];
    const remaining = [];
    for (const item of list) {
      item.fn(evt);
      if (!item.once) remaining.push(item);
    }
    this.eventListeners[evt.type] = remaining;
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const parts = selector.split(',').map(s => s.trim());

    function matchesSingle(node, sel) {
      if (!node) return false;
      if (sel === 'link' && node.tagName === 'LINK') return true;
      if (sel === 'head' && node.tagName === 'HEAD') return true;
      if (sel === 'body' && node.tagName === 'BODY') return true;
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        if (node.classList && node.classList.contains(cls)) return true;
      }
      if (sel.includes('.btn-play') && node.classList && node.classList.contains('btn-play')) return true;
      if (sel.includes('.btn-prev') && node.classList && node.classList.contains('btn-prev')) return true;
      if (sel.includes('.btn-next') && node.classList && node.classList.contains('btn-next')) return true;
      if (sel.includes('.btn-loop') && node.classList && node.classList.contains('btn-loop')) return true;
      if (sel.includes('.btn-toggle-mode') && node.classList && node.classList.contains('btn-toggle-mode')) return true;
      if (sel.includes('.btn-close') && node.classList && node.classList.contains('btn-close')) return true;
      if (sel.includes('.progress-bar') && node.classList && node.classList.contains('progress-bar')) return true;
      if (sel.includes('.time-current') && node.classList && node.classList.contains('time-current')) return true;
      if (sel.includes('.time-total') && node.classList && node.classList.contains('time-total')) return true;
      if (sel.includes('.track-title') && node.classList && node.classList.contains('track-title')) return true;
      if (sel.includes('.track-channel') && node.classList && node.classList.contains('track-channel')) return true;
      if (sel.includes('.track-thumbnail') && node.classList && node.classList.contains('track-thumbnail')) return true;
      if (sel.includes('.miniplayer-container') && node.classList && node.classList.contains('miniplayer-container')) return true;
      if (sel === 'input[type="range"]' && node.tagName === 'INPUT' && node.getAttribute('type') === 'range') return true;
      return false;
    }

    function traverse(node) {
      if (!node || !node.children) return;
      for (const child of node.children) {
        for (const sel of parts) {
          if (matchesSingle(child, sel)) {
            results.push(child);
            break;
          }
        }
        traverse(child);
      }
    }

    traverse(this);
    return results;
  }
}

class MockPipWindow {
  constructor(options) {
    this.width = options.width || 340;
    this.height = options.height || 54;
    this.closed = false;
    this.focusCalled = false;
    this.resizeToCalls = [];
    this.eventListeners = {};
    const body = new MockElement('body');
    const head = new MockElement('head');
    this.document = {
      createElement: (tag) => new MockElement(tag),
      head,
      body,
      querySelector: (sel) => {
        if (sel === 'head') return head;
        if (sel === 'body') return body;
        return body.querySelector(sel) || head.querySelector(sel);
      },
      querySelectorAll: (sel) => body.querySelectorAll(sel)
    };
  }

  focus() {
    this.focusCalled = true;
  }

  resizeTo(w, h) {
    this.width = w;
    this.height = h;
    this.resizeToCalls.push({ width: w, height: h });
  }

  close() {
    this.closed = true;
    this.dispatchEvent({ type: 'pagehide' });
  }

  addEventListener(type, fn, opts) {
    this.eventListeners[type] = this.eventListeners[type] || [];
    this.eventListeners[type].push({ fn, once: opts && opts.once });
  }

  dispatchEvent(evt) {
    const list = this.eventListeners[evt.type] || [];
    const remaining = [];
    for (const item of list) {
      item.fn(evt);
      if (!item.once) remaining.push(item);
    }
    this.eventListeners[evt.type] = remaining;
  }
}

class MockVideoElement {
  constructor() {
    this.currentTime = 0;
    this.duration = 200;
    this.paused = true;
    this.ended = false;
    this.readyState = 4;
    this.loop = false;
    this.eventListeners = {};
    this.playCallCount = 0;
    this.pauseCallCount = 0;
  }

  play() {
    this.playCallCount++;
    this.paused = false;
    this.dispatchEvent({ type: 'play' });
    return Promise.resolve();
  }

  pause() {
    this.pauseCallCount++;
    this.paused = true;
    this.dispatchEvent({ type: 'pause' });
  }

  addEventListener(type, fn) {
    this.eventListeners[type] = this.eventListeners[type] || [];
    this.eventListeners[type].push(fn);
  }

  removeEventListener(type, fn) {
    if (!this.eventListeners[type]) return;
    this.eventListeners[type] = this.eventListeners[type].filter(f => f !== fn);
  }

  dispatchEvent(evt) {
    const list = this.eventListeners[evt.type] || [];
    list.forEach(fn => fn(evt));
  }
}

// Global Mocks Setup
const windowEventListeners = {};
let mockVideoInstance = new MockVideoElement();
let mockNextButton = new MockElement('button');
let mockPrevButton = new MockElement('button');
let nextButtonClickedCount = 0;
let prevButtonClickedCount = 0;
let historyBackCallCount = 0;

mockNextButton.className = 'ytp-next-button';
mockNextButton.click = () => {
  nextButtonClickedCount++;
};

mockPrevButton.className = 'ytp-prev-button';
mockPrevButton.click = () => {
  prevButtonClickedCount++;
};

global.history = {
  back: () => {
    historyBackCallCount++;
  }
};

global.window = {
  location: {
    href: 'https://www.youtube.com/watch?v=sng12345678',
    search: '?v=sng12345678'
  },
  documentPictureInPicture: {
    requestWindow: async (options) => {
      return new MockPipWindow(options);
    }
  },
  addEventListener: (type, fn) => {
    windowEventListeners[type] = windowEventListeners[type] || [];
    windowEventListeners[type].push(fn);
  },
  removeEventListener: (type, fn) => {
    if (!windowEventListeners[type]) return;
    windowEventListeners[type] = windowEventListeners[type].filter(f => f !== fn);
  },
  dispatchEvent: (evt) => {
    const list = windowEventListeners[evt.type] || [];
    list.forEach(fn => fn(evt));
  }
};

let currentTitle = 'Canção Original - Artista Teste';
let currentChannel = 'Canal Oficial';

global.document = {
  get title() {
    return `${currentTitle} - YouTube`;
  },
  set title(val) {
    currentTitle = val.replace(' - YouTube', '');
  },
  createElement: (tag) => new MockElement(tag),
  head: new MockElement('head'),
  body: new MockElement('body'),
  querySelector: (sel) => {
    if (sel.includes('.ytp-next-button')) return mockNextButton;
    if (sel.includes('.ytp-prev-button')) return mockPrevButton;
    if (sel === 'video' || sel.startsWith('video') || sel.includes('.html5-main-video') || sel.includes('video.html5-main-video')) return mockVideoInstance;
    if (sel.includes('ytd-watch-metadata') || sel.includes('#title h1')) {
      const el = new MockElement('yt-formatted-string');
      el.textContent = currentTitle;
      return el;
    }
    if (sel.includes('#channel-name') || sel.includes('ytd-channel-name')) {
      const el = new MockElement('a');
      el.textContent = currentChannel;
      return el;
    }
    return null;
  },
  querySelectorAll: () => []
};

let storageData = {};
global.chrome = {
  runtime: {
    getURL: (filePath) => `chrome-extension://test-id/${filePath}`,
    lastError: null
  },
  storage: {
    local: {
      get: (keys, cb) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(k => { if (k in storageData) result[k] = storageData[k]; });
        }
        cb(result);
      },
      set: (obj, cb) => {
        Object.assign(storageData, obj);
        if (cb) cb();
      }
    }
  }
};

global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

// Carregar YouTubeLooperCore
const YouTubeLooperCore = require('./content.js');
const controller = YouTubeLooperCore.MiniPlayerController;

async function runPlaybackSyncTests() {
  // ---------------------------------------------------------------------------
  // [SUÍTE 1] Exportação de Métodos de Sincronização em MiniPlayerController
  // ---------------------------------------------------------------------------
  console.log('[SUÍTE 1] Exportação de Métodos de Sincronização em MiniPlayerController');

  test('MiniPlayerController exporta bindWindowEvents como função', () => {
    assert.strictEqual(typeof controller.bindWindowEvents, 'function', 'bindWindowEvents deve ser uma função');
  });

  test('MiniPlayerController exporta syncPlaybackState como função', () => {
    assert.strictEqual(typeof controller.syncPlaybackState, 'function', 'syncPlaybackState deve ser uma função');
  });

  test('MiniPlayerController exporta syncTimeAndProgress como função', () => {
    assert.strictEqual(typeof controller.syncTimeAndProgress, 'function', 'syncTimeAndProgress deve ser uma função');
  });

  test('MiniPlayerController exporta updateMetadata como função', () => {
    assert.strictEqual(typeof controller.updateMetadata, 'function', 'updateMetadata deve ser uma função');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 2] Play/Pause Bidirecional
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 2] Play/Pause Bidirecional');

  await testAsync('Clicar em .btn-play quando pausado chama video.play() e adiciona classe .playing', async () => {
    controller.close();
    mockVideoInstance.paused = true;
    mockVideoInstance.playCallCount = 0;
    mockVideoInstance.pauseCallCount = 0;

    await controller.open();
    const doc = controller.pipWindow.document;
    const playBtn = doc.querySelector('.btn-play');
    assert.ok(playBtn, 'Botão .btn-play deve existir no documento PiP');

    playBtn.click();

    assert.strictEqual(mockVideoInstance.playCallCount, 1, 'video.play() deve ser chamado');
    assert.strictEqual(mockVideoInstance.paused, false, 'Vídeo deve estar despausado');
    assert.ok(playBtn.classList.contains('playing'), 'Botão .btn-play deve ter a classe .playing');
    assert.strictEqual(playBtn.getAttribute('title'), 'Pausar', 'Título do botão deve ser Pausar');
  });

  await testAsync('Clicar em .btn-play quando reproduzindo chama video.pause() e remove classe .playing', async () => {
    const doc = controller.pipWindow.document;
    const playBtn = doc.querySelector('.btn-play');
    assert.strictEqual(mockVideoInstance.paused, false, 'Vídeo deve estar reproduzindo');

    playBtn.click();

    assert.strictEqual(mockVideoInstance.pauseCallCount, 1, 'video.pause() deve ser chamado');
    assert.strictEqual(mockVideoInstance.paused, true, 'Vídeo deve estar pausado');
    assert.strictEqual(playBtn.classList.contains('playing'), false, 'Botão .btn-play não deve ter a classe .playing');
    assert.strictEqual(playBtn.getAttribute('title'), 'Reproduzir', 'Título do botão deve ser Reproduzir');
  });

  await testAsync('Disparo nativo de evento play no <video> sincroniza estado no PiP', async () => {
    const doc = controller.pipWindow.document;
    const playBtn = doc.querySelector('.btn-play');

    mockVideoInstance.paused = false;
    mockVideoInstance.dispatchEvent({ type: 'play' });

    assert.ok(playBtn.classList.contains('playing'), 'Disparo do evento play deve adicionar .playing ao botão PiP');
    assert.strictEqual(playBtn.getAttribute('title'), 'Pausar');
  });

  await testAsync('Disparo nativo de evento pause no <video> sincroniza estado no PiP', async () => {
    const doc = controller.pipWindow.document;
    const playBtn = doc.querySelector('.btn-play');

    mockVideoInstance.paused = true;
    mockVideoInstance.dispatchEvent({ type: 'pause' });

    assert.strictEqual(playBtn.classList.contains('playing'), false, 'Disparo do evento pause deve remover .playing');
    assert.strictEqual(playBtn.getAttribute('title'), 'Reproduzir');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 3] Navegação de Faixas (Próxima / Anterior)
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 3] Navegação de Faixas (Próxima / Anterior)');

  await testAsync('Clicar em .btn-next aciona click em .ytp-next-button do YouTube', async () => {
    nextButtonClickedCount = 0;
    const doc = controller.pipWindow.document;
    const nextBtn = doc.querySelector('.btn-next');
    assert.ok(nextBtn, 'Botão .btn-next deve existir');

    nextBtn.click();

    assert.strictEqual(nextButtonClickedCount, 1, 'Deve disparar o clique do botão .ytp-next-button na página');
  });

  await testAsync('Clicar em .btn-prev com video.currentTime > 3 reseta currentTime = 0 sem acionar anterior', async () => {
    prevButtonClickedCount = 0;
    mockVideoInstance.currentTime = 15.5;

    const doc = controller.pipWindow.document;
    const prevBtn = doc.querySelector('.btn-prev');
    assert.ok(prevBtn, 'Botão .btn-prev deve existir');

    prevBtn.click();

    assert.strictEqual(mockVideoInstance.currentTime, 0, 'currentTime deve ser resetado para 0');
    assert.strictEqual(prevButtonClickedCount, 0, 'Não deve chamar faixa anterior se currentTime > 3');
  });

  await testAsync('Clicar em .btn-prev com video.currentTime <= 3 aciona click em .ytp-prev-button', async () => {
    prevButtonClickedCount = 0;
    mockVideoInstance.currentTime = 2.0;

    const doc = controller.pipWindow.document;
    const prevBtn = doc.querySelector('.btn-prev');

    prevBtn.click();

    assert.strictEqual(prevButtonClickedCount, 1, 'Deve acionar .ytp-prev-button quando currentTime <= 3');
  });

  await testAsync('Clicar em .btn-prev com video.currentTime <= 3 aciona history.back() se botão anterior ausente', async () => {
    historyBackCallCount = 0;
    mockVideoInstance.currentTime = 1.0;
    const savedPrevButton = mockPrevButton;
    mockPrevButton = null; // Simula ausência do botão no YouTube

    const doc = controller.pipWindow.document;
    const prevBtn = doc.querySelector('.btn-prev');

    prevBtn.click();

    assert.strictEqual(historyBackCallCount, 1, 'Deve acionar history.back() como fallback');
    mockPrevButton = savedPrevButton;
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 4] Loop Contínuo Bidirecional
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 4] Loop Contínuo Bidirecional');

  await testAsync('Clicar em .btn-loop chama toggleLoopState(), adiciona .active e atualiza estado', async () => {
    YouTubeLooperCore.setLoopState(false);
    controller.syncPlaybackState();

    const doc = controller.pipWindow.document;
    const loopBtn = doc.querySelector('.btn-loop');
    assert.ok(loopBtn, 'Botão .btn-loop deve existir');
    assert.strictEqual(loopBtn.classList.contains('active'), false, 'Inicialmente sem .active');

    loopBtn.click();

    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'Loop state interno deve ser true');
    assert.ok(loopBtn.classList.contains('active'), 'Botão .btn-loop deve receber a classe .active');
    assert.strictEqual(loopBtn.getAttribute('title'), 'Repetir (Ativado)');
  });

  await testAsync('Clicar em .btn-loop novamente desativa o loop e remove .active', async () => {
    const doc = controller.pipWindow.document;
    const loopBtn = doc.querySelector('.btn-loop');

    loopBtn.click();

    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'Loop state interno deve ser false');
    assert.strictEqual(loopBtn.classList.contains('active'), false, 'Botão .btn-loop não deve ter a classe .active');
    assert.strictEqual(loopBtn.getAttribute('title'), 'Repetir');
  });

  await testAsync('Alternar loop externamente via toggleLoopState sincroniza botão no PiP', async () => {
    const doc = controller.pipWindow.document;
    const loopBtn = doc.querySelector('.btn-loop');

    YouTubeLooperCore.toggleLoopState();

    assert.strictEqual(YouTubeLooperCore.getLoopState(), true);
    assert.ok(loopBtn.classList.contains('active'), 'Botão no PiP deve refletir loop ativo acionado externamente');

    YouTubeLooperCore.toggleLoopState();
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false);
    assert.strictEqual(loopBtn.classList.contains('active'), false, 'Botão no PiP deve refletir loop desativado');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 5] Busca e Progresso (Seek Bar e Scrubbing)
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 5] Busca e Progresso (Seek Bar e Scrubbing)');

  await testAsync('Disparo de timeupdate atualiza input.progress-bar e texto de .time-current no modo Expandido', async () => {
    if (controller.isPillMode) {
      await controller.toggleMode();
    }
    assert.strictEqual(controller.isPillMode, false, 'Deve estar no modo Expandido');

    const doc = controller.pipWindow.document;
    const progressBar = doc.querySelector('.progress-bar');
    const timeCurrent = doc.querySelector('.time-current');
    const timeTotal = doc.querySelector('.time-total');

    assert.ok(progressBar, 'input.progress-bar deve existir no modo Expandido');
    assert.ok(timeCurrent, '.time-current deve existir');
    assert.ok(timeTotal, '.time-total deve existir');

    mockVideoInstance.currentTime = 50;
    mockVideoInstance.duration = 200;
    mockVideoInstance.dispatchEvent({ type: 'timeupdate' });

    assert.strictEqual(timeCurrent.textContent, '0:50', 'Texto de tempo atual deve ser 0:50');
    assert.strictEqual(timeTotal.textContent, '3:20', 'Texto de tempo total deve ser 3:20 (200s)');
    assert.strictEqual(parseFloat(progressBar.value), 25, 'Progresso deve ser 25% (50/200)');
  });

  await testAsync('Arrastar slider (scrubbing): timeupdate não sobrescreve valor durante o arrasto', async () => {
    const doc = controller.pipWindow.document;
    const progressBar = doc.querySelector('.progress-bar');
    const timeCurrent = doc.querySelector('.time-current');

    // Inicia scrubbing via mousedown
    progressBar.dispatchEvent({ type: 'mousedown' });
    assert.strictEqual(controller.isScrubbing, true, 'isScrubbing deve ser true após mousedown');

    // Simula usuário arrastando para 75%
    progressBar.value = '75';
    progressBar.dispatchEvent({ type: 'input' });

    // time-current deve refletir o tempo correspondente a 75% de 200s (150s = 2:30)
    assert.strictEqual(timeCurrent.textContent, '2:30', 'time-current deve refletir 2:30 durante arrasto');

    // Dispara timeupdate com vídeo ainda em 50s
    mockVideoInstance.currentTime = 50;
    mockVideoInstance.dispatchEvent({ type: 'timeupdate' });

    // Barra de progresso NÃO deve ser sobrescrita pelo timeupdate
    assert.strictEqual(parseFloat(progressBar.value), 75, 'timeupdate não deve sobrescrever valor durante scrubbing');

    // Conclui o arrasto via change / mouseup
    progressBar.dispatchEvent({ type: 'change' });

    assert.strictEqual(controller.isScrubbing, false, 'isScrubbing deve ser false após change');
    assert.strictEqual(mockVideoInstance.currentTime, 150, 'video.currentTime deve ser atualizado para 150s (75%)');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 6] Ações de Janela (Modo e Fechamento)
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 6] Ações de Janela (Alternância de Modo e Fechamento)');

  await testAsync('Clicar em .btn-toggle-mode chama MiniPlayerController.toggleMode()', async () => {
    const currentMode = controller.isPillMode;
    const doc = controller.pipWindow.document;
    const toggleBtn = doc.querySelector('.btn-toggle-mode');
    assert.ok(toggleBtn, 'Botão .btn-toggle-mode deve existir');

    toggleBtn.click();

    assert.strictEqual(controller.isPillMode, !currentMode, 'Modo deve ter alternado');
  });

  await testAsync('Clicar em .btn-close chama MiniPlayerController.close()', async () => {
    const doc = controller.pipWindow.document;
    const closeBtn = doc.querySelector('.btn-close');
    assert.ok(closeBtn, 'Botão .btn-close deve existir');

    closeBtn.click();

    assert.strictEqual(controller.pipWindow, null, 'pipWindow deve ser fechada e nula');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 7] Navegação SPA e Atualização de Metadados
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 7] Navegação SPA e Atualização de Metadados');

  await testAsync('Disparo de yt-navigate-finish com PiP aberto chama updateMetadata() atualizando DOM', async () => {
    await controller.open();
    if (controller.isPillMode) {
      await controller.toggleMode(); // Muda para expandido para validar título, canal e capa
    }

    // Altera metadados globais da música
    currentTitle = 'Bohemian Rhapsody';
    currentChannel = 'Queen Official';
    window.location.search = '?v=fJ9rUzIMcZQ';
    window.location.href = 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ';
    mockVideoInstance.currentTime = 0;
    mockVideoInstance.duration = 354;

    // Dispara transição SPA
    window.dispatchEvent({ type: 'yt-navigate-finish' });

    const doc = controller.pipWindow.document;
    const titleEl = doc.querySelector('.track-title');
    const channelEl = doc.querySelector('.track-channel');
    const thumbEl = doc.querySelector('.track-thumbnail');

    assert.ok(titleEl, 'Elemento de título deve existir');
    assert.strictEqual(titleEl.textContent, 'Bohemian Rhapsody', 'Título deve ser atualizado para a nova faixa');

    if (channelEl) {
      assert.strictEqual(channelEl.textContent, 'Queen Official', 'Canal deve ser atualizado para nova faixa');
    }

    if (thumbEl) {
      assert.ok(thumbEl.getAttribute('src').includes('fJ9rUzIMcZQ'), 'Thumbnail deve referenciar novo video ID');
    }
  });

  // Limpeza final
  controller.close();

  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES: ${passCount + failCount}`);
  console.log(`PASSOU:          ${passCount}`);
  console.log(`FALHOU:          ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('[SUCESSO] Todos os testes de sincronização bidirecional passaram!');
    process.exit(0);
  }
}

runPlaybackSyncTests().catch(err => {
  console.error('Erro fatal na execução dos testes:', err);
  process.exit(1);
});
