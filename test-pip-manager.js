/**
 * Looper for YouTube - MiniPlayerController & Document Picture-in-Picture Unit Tests (Task 3)
 */

const assert = require('assert');
const path = require('path');

console.log('================================================================');
console.log('   Mini Player - Teste de Janela PiP & Controller (Task 3)      ');
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
// Mock DOM & Document Picture-in-Picture Environment Setup
// -----------------------------------------------------------------------------

class MockElement {
  constructor(tagName) {
    this.tagName = (tagName || 'div').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.parentNode = null;
    this.eventListeners = {};
    this._classList = new Set();
    this.innerHTML = '';
    this.textContent = '';
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

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, fn) {
    this.eventListeners[type] = this.eventListeners[type] || [];
    this.eventListeners[type].push(fn);
  }

  dispatchEvent(evt) {
    const handlers = this.eventListeners[evt.type] || [];
    handlers.forEach(h => h(evt));
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    function traverse(node) {
      if (!node || !node.children) return;
      for (const child of node.children) {
        let match = false;
        if (selector === 'link' && child.tagName === 'LINK') match = true;
        if (selector === 'link[rel="stylesheet"]' && child.tagName === 'LINK' && child.getAttribute('rel') === 'stylesheet') match = true;
        if (selector === '.miniplayer-container' && child.className.includes('miniplayer-container')) match = true;
        if (selector === '.pill' && child.className.includes('pill')) match = true;
        if (selector === '.expanded' && child.className.includes('expanded')) match = true;
        if (selector.includes('h1.ytd-watch-metadata') && child.tagName === 'YT-FORMATTED-STRING') match = true;
        if (selector.includes('#channel-name') && child.tagName === 'A') match = true;

        if (match) results.push(child);
        traverse(child);
      }
    }
    traverse(this);
    return results;
  }
}

class MockPipWindow {
  constructor(options) {
    this.width = options.width;
    this.height = options.height;
    this.closed = false;
    this.focusCalled = false;
    this.resizeToCalls = [];
    this.eventListeners = {};
    this.document = {
      createElement: (tag) => new MockElement(tag),
      head: new MockElement('head'),
      body: new MockElement('body'),
      querySelector: (sel) => {
        if (sel === 'head') return this.document.head;
        if (sel === 'body') return this.document.body;
        return this.document.body.querySelector(sel) || this.document.head.querySelector(sel);
      }
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

// Global Mocks
let storageData = {};
let lastPipRequest = null;
let customPipWindowMock = null;
let pipSupported = true;

const windowEventListeners = {};

global.window = {
  location: {
    href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    search: '?v=dQw4w9WgXcQ'
  },
  documentPictureInPicture: {
    requestWindow: async (options) => {
      if (!pipSupported) {
        throw new Error('Document Picture-in-Picture not supported');
      }
      lastPipRequest = options;
      customPipWindowMock = new MockPipWindow(options);
      return customPipWindowMock;
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

global.document = {
  title: 'Never Gonna Give You Up - Rick Astley - YouTube',
  createElement: (tag) => new MockElement(tag),
  head: new MockElement('head'),
  body: new MockElement('body'),
  querySelector: (sel) => {
    if (sel.includes('ytd-watch-metadata') || sel.includes('#title h1')) {
      const el = new MockElement('yt-formatted-string');
      el.textContent = 'Never Gonna Give You Up';
      return el;
    }
    if (sel.includes('#channel-name') || sel.includes('ytd-channel-name')) {
      const el = new MockElement('a');
      el.textContent = 'Rick Astley';
      return el;
    }
    if (sel.includes('video') || sel.includes('.html5-main-video')) {
      return {
        currentTime: 75.5,
        duration: 212.0,
        paused: false,
        ended: false,
        readyState: 4,
        play: () => Promise.resolve(),
        pause: () => {},
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    }
    return null;
  },
  querySelectorAll: () => []
};

global.chrome = {
  runtime: {
    getURL: (filePath) => `chrome-extension://test-extension-id/${filePath}`,
    lastError: null
  },
  storage: {
    local: {
      get: (keys, cb) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(k => {
            if (k in storageData) result[k] = storageData[k];
          });
        } else if (typeof keys === 'string') {
          if (keys in storageData) result[keys] = storageData[keys];
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

// -----------------------------------------------------------------------------
// Carregar YouTubeLooperCore
// -----------------------------------------------------------------------------
const YouTubeLooperCore = require('./content.js');

async function runAllTests() {
  // ---------------------------------------------------------------------------
  // [SUÍTE 1] Exportação e Interface de MiniPlayerController
  // ---------------------------------------------------------------------------
  console.log('[SUÍTE 1] Exportação e Interface de MiniPlayerController');

  test('YouTubeLooperCore exporta MiniPlayerController', () => {
    assert.ok(YouTubeLooperCore.MiniPlayerController, 'YouTubeLooperCore.MiniPlayerController deve existir');
    assert.strictEqual(typeof YouTubeLooperCore.MiniPlayerController, 'object', 'MiniPlayerController deve ser um objeto');
  });

  const controller = YouTubeLooperCore.MiniPlayerController;

  test('MiniPlayerController expõe métodos e propriedades obrigatórios', () => {
    assert.strictEqual(typeof controller.open, 'function', 'open deve ser uma função');
    assert.strictEqual(typeof controller.close, 'function', 'close deve ser uma função');
    assert.strictEqual(typeof controller.toggleMode, 'function', 'toggleMode deve ser uma função');
    assert.strictEqual(typeof controller.loadModePreference, 'function', 'loadModePreference deve ser uma função');
    assert.strictEqual(typeof controller.saveModePreference, 'function', 'saveModePreference deve ser uma função');
    assert.strictEqual(typeof controller.getTrackMetadata, 'function', 'getTrackMetadata deve ser uma função');
    assert.strictEqual('pipWindow' in controller, true, 'Propriedade pipWindow deve existir');
    assert.strictEqual('isPillMode' in controller, true, 'Propriedade isPillMode deve existir');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 2] Extração Resiliente de Metadados
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 2] Extração Resiliente de Metadados (getTrackMetadata)');

  test('Extrai título, canal, miniatura e status de reprodução do player', () => {
    const meta = controller.getTrackMetadata();
    assert.strictEqual(meta.title, 'Never Gonna Give You Up', 'Título deve ser extraído do DOM do YouTube');
    assert.strictEqual(meta.channel, 'Rick Astley', 'Canal deve ser extraído do DOM');
    assert.strictEqual(meta.thumbnail, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 'Thumbnail deve ser gerada a partir do ID v=');
    assert.strictEqual(meta.currentTime, 75.5, 'currentTime do vídeo deve ser capturado');
    assert.strictEqual(meta.duration, 212.0, 'duration do vídeo deve ser capturada');
    assert.strictEqual(meta.isPlaying, true, 'isPlaying deve ser true com vídeo ativo');
  });

  test('Fallback seguro de título para document.title se DOM de metadata estiver ausente', () => {
    const originalQS = global.document.querySelector;
    global.document.querySelector = (sel) => {
      if (sel.includes('video')) return { currentTime: 0, duration: 100, paused: true, ended: false, readyState: 4 };
      return null;
    };

    const meta = controller.getTrackMetadata();
    assert.strictEqual(meta.title, 'Never Gonna Give You Up - Rick Astley', 'Deve remover " - YouTube" de document.title como fallback');
    assert.strictEqual(meta.channel, 'YouTube', 'Canal deve ter fallback amigável');

    global.document.querySelector = originalQS;
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 3] Persistência de Preferência de Modo
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 3] Persistência de Modo (saveModePreference / loadModePreference)');

  await testAsync('Salva e recupera preferência de modo Pílula (isPill = true)', async () => {
    storageData = {};
    const saved = await controller.saveModePreference(true);
    assert.strictEqual(saved, true, 'saveModePreference(true) deve retornar true');
    assert.strictEqual(storageData['yt_looper_pip_mode'], true, 'chrome.storage.local deve conter yt_looper_pip_mode = true');

    const loaded = await controller.loadModePreference();
    assert.strictEqual(loaded, true, 'loadModePreference deve retornar true');
    assert.strictEqual(controller.isPillMode, true, 'isPillMode do controller deve estar sincronizado');
  });

  await testAsync('Salva e recupera preferência de modo Expandido (isPill = false)', async () => {
    storageData = {};
    const saved = await controller.saveModePreference(false);
    assert.strictEqual(saved, false, 'saveModePreference(false) deve retornar false');
    assert.strictEqual(storageData['yt_looper_pip_mode'], false, 'chrome.storage.local deve conter yt_looper_pip_mode = false');

    const loaded = await controller.loadModePreference();
    assert.strictEqual(loaded, false, 'loadModePreference deve retornar false');
    assert.strictEqual(controller.isPillMode, false, 'isPillMode do controller deve estar sincronizado');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 4] Abertura e Injeção de Estilos/HTML da Janela PiP
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 4] Abertura e Injeção de Conteúdo da Janela PiP');

  await testAsync('open() abre a janela no modo Pílula com dimensões 340x54', async () => {
    controller.close();
    await controller.saveModePreference(true);
    const win = await controller.open();

    assert.ok(win, 'open() deve retornar a janela PiP');
    assert.strictEqual(controller.pipWindow, win, 'controller.pipWindow deve apontar para a janela criada');
    assert.strictEqual(lastPipRequest.width, 340, 'Largura requisitada para Pill deve ser 340');
    assert.strictEqual(lastPipRequest.height, 54, 'Altura requisitada para Pill deve ser 54');

    // Validação de injeção de CSS
    const linkEl = win.document.head.querySelector('link[rel="stylesheet"]');
    assert.ok(linkEl, 'Deve injetar tag <link rel="stylesheet"> no head do documento PiP');
    assert.ok(linkEl.getAttribute('href').includes('miniplayer.css'), 'Link deve referenciar miniplayer.css');

    // Validação de injeção de HTML
    assert.ok(win.document.body.innerHTML.includes('miniplayer-container'), 'Body deve conter HTML do miniplayer');
    assert.ok(win.document.body.innerHTML.includes('pill'), 'HTML injetado deve corresponder ao modo Pílula');
  });

  await testAsync('open() foca na janela existente se já estiver aberta sem recriá-la', async () => {
    assert.ok(controller.pipWindow, 'Janela deve estar previamente aberta');
    const existingWin = controller.pipWindow;
    existingWin.focusCalled = false;

    const returnedWin = await controller.open();
    assert.strictEqual(returnedWin, existingWin, 'Deve retornar a mesma instância da janela');
    assert.strictEqual(existingWin.focusCalled, true, 'Deve ter chamado focus() na janela aberta');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 5] Alternância Dinâmica de Modo (toggleMode)
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 5] Alternância Dinâmica de Modo (toggleMode)');

  await testAsync('toggleMode() alterna de Pílula para Expandido, redimensiona e atualiza DOM', async () => {
    assert.strictEqual(controller.isPillMode, true, 'Modo inicial deve ser Pílula');
    await controller.toggleMode();

    assert.strictEqual(controller.isPillMode, false, 'Modo deve ter sido alterado para Expandido (false)');
    assert.strictEqual(storageData['yt_looper_pip_mode'], false, 'Storage deve refletir modo expandido');

    // Redimensionamento
    const lastResize = controller.pipWindow.resizeToCalls[controller.pipWindow.resizeToCalls.length - 1];
    assert.ok(lastResize, 'Deve invocar resizeTo()');
    assert.strictEqual(lastResize.width, 360, 'Largura redimensionada deve ser 360');
    assert.strictEqual(lastResize.height, 180, 'Altura redimensionada deve ser 180');

    // Atualização do DOM
    assert.ok(controller.pipWindow.document.body.innerHTML.includes('expanded'), 'Body deve conter classes do modo Expandido');
  });

  await testAsync('toggleMode() alterna de Expandido de volta para Pílula', async () => {
    assert.strictEqual(controller.isPillMode, false, 'Modo deve ser Expandido');
    await controller.toggleMode();

    assert.strictEqual(controller.isPillMode, true, 'Modo deve ter voltado para Pílula (true)');
    assert.strictEqual(storageData['yt_looper_pip_mode'], true, 'Storage deve refletir modo pílula');

    const lastResize = controller.pipWindow.resizeToCalls[controller.pipWindow.resizeToCalls.length - 1];
    assert.strictEqual(lastResize.width, 340, 'Largura redimensionada deve ser 340');
    assert.strictEqual(lastResize.height, 54, 'Altura redimensionada deve ser 54');
    assert.ok(controller.pipWindow.document.body.innerHTML.includes('pill'), 'Body deve conter classes do modo Pílula');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 6] Fechamento Seguro e Ciclo de Vida da Janela
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 6] Fechamento e Limpeza de Referências (close & pagehide)');

  test('close() fecha a janela e redefine pipWindow para null', () => {
    const currentWin = controller.pipWindow;
    assert.ok(currentWin, 'Janela deve estar aberta antes do close');
    controller.close();
    assert.strictEqual(controller.pipWindow, null, 'controller.pipWindow deve ser null após close()');
    assert.strictEqual(currentWin.closed, true, 'Instância da janela deve estar fechada');
  });

  await testAsync('Evento pagehide limpa controller.pipWindow quando fechada externamente', async () => {
    await controller.open();
    const win = controller.pipWindow;
    assert.ok(win, 'Janela aberta');

    // Simula o usuário fechando a janela nativa diretamente
    win.dispatchEvent({ type: 'pagehide' });
    assert.strictEqual(controller.pipWindow, null, 'controller.pipWindow deve ser limpo para null no pagehide');
  });

  await testAsync('Listener beforeunload na aba principal fecha a janela PiP graciosamente', async () => {
    await controller.open();
    assert.ok(controller.pipWindow, 'Janela aberta antes de beforeunload');
    const win = controller.pipWindow;

    // Dispara beforeunload na janela principal
    global.window.dispatchEvent({ type: 'beforeunload' });
    assert.strictEqual(controller.pipWindow, null, 'pipWindow deve ser null após beforeunload da página principal');
    assert.strictEqual(win.closed, true, 'Janela deve ter sido fechada graciosamente');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 7] Tratamento de Fallback Seguro quando PiP não é suportado
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 7] Fallback Gracioso sem Document Picture-in-Picture');

  await testAsync('open() retorna null graciosamente sem lançar exceção se PiP for indisponível', async () => {
    const originalPiP = global.window.documentPictureInPicture;
    global.window.documentPictureInPicture = undefined;

    let res = null;
    let threw = false;
    try {
      res = await controller.open();
    } catch (e) {
      threw = true;
    }

    assert.strictEqual(threw, false, 'Não deve lançar exceção');
    assert.strictEqual(res, null, 'Deve retornar null graciosamente');
    assert.strictEqual(controller.pipWindow, null, 'pipWindow deve permanecer null');

    global.window.documentPictureInPicture = originalPiP;
  });

  // ---------------------------------------------------------------------------
  // Resumo dos Testes
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES: ${passCount + failCount}`);
  console.log(`PASSOU:          ${passCount}`);
  console.log(`FALHOU:          ${failCount}`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('\n[SUCESSO] Todos os testes do MiniPlayerController passaram!');
  }
}

runAllTests().catch((err) => {
  console.error('Erro fatal na execução da suíte de testes:', err);
  process.exit(1);
});
