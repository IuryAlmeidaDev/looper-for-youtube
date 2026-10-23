/**
 * Looper for YouTube - Player Native Button & Shift+P Keyboard Shortcut Unit Tests (Task 5)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('   Mini Player - Teste de Gatilhos & Botão Nativo (Task 5)     ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

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

class MockElement {
  constructor(tagName) {
    this.tagName = (tagName || 'div').toUpperCase();
    this.children = [];
    this.attributes = {};
    this.parentNode = null;
    this.eventListeners = {};
    this._classList = new Set();
    this._innerHTML = '';
    this.textContent = '';
    this.isContentEditable = false;

    const self = this;
    this.classList = {
      add: (...tokens) => tokens.forEach(t => self._classList.add(t)),
      remove: (...tokens) => tokens.forEach(t => self._classList.delete(t)),
      contains: (t) => self._classList.has(t),
      has: (t) => self._classList.has(t),
      clear: () => self._classList.clear()
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

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = String(val);
    this.children = [];
    if (val.includes('<svg')) {
      const svg = new MockElement('svg');
      if (val.includes('viewBox="0 0 36 36"')) {
        svg.setAttribute('viewBox', '0 0 36 36');
      }
      if (val.includes('<path')) {
        const pathEl = new MockElement('path');
        if (val.includes('ytp-svg-fill')) {
          pathEl.classList.add('ytp-svg-fill');
        }
        svg.appendChild(pathEl);
      }
      this.appendChild(svg);
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
    if (index === -1) return null;
    if (position === 'afterend') {
      siblings.splice(index + 1, 0, element);
      element.parentNode = this.parentNode;
    } else if (position === 'beforebegin') {
      siblings.splice(index, 0, element);
      element.parentNode = this.parentNode;
    }
    return element;
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
    evt.target = evt.target || this;
    const handlers = this.eventListeners[evt.type] || [];
    for (const h of handlers) {
      h(evt);
    }
  }

  click() {
    let defaultPrevented = false;
    let propagationStopped = false;
    const evt = {
      type: 'click',
      target: this,
      preventDefault: () => { defaultPrevented = true; },
      stopPropagation: () => { propagationStopped = true; },
      isDefaultPrevented: () => defaultPrevented,
      isPropagationStopped: () => propagationStopped
    };
    this.dispatchEvent(evt);
    return evt;
  }

  closest(selector) {
    if (selector.includes('contenteditable="true"') && this.getAttribute('contenteditable') === 'true') {
      return this;
    }
    if (selector.includes('contenteditable=""') && this.getAttribute('contenteditable') === '') {
      return this;
    }
    if (selector.includes('role="textbox"') && this.getAttribute('role') === 'textbox') {
      return this;
    }
    if (selector.includes('input') && this.tagName === 'INPUT') {
      return this;
    }
    if (selector.includes('textarea') && this.tagName === 'TEXTAREA') {
      return this;
    }
    if (this.parentNode && typeof this.parentNode.closest === 'function') {
      return this.parentNode.closest(selector);
    }
    return null;
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
        if (selector === '.ytp-button' && child.classList.contains('ytp-button')) match = true;
        if (selector === '.ytp-pip-button' && child.classList.contains('ytp-pip-button')) match = true;
        if (selector === '.ytp-loop-button' && child.classList.contains('ytp-loop-button')) match = true;
        if (selector === '.ytp-play-button' && child.classList.contains('ytp-play-button')) match = true;
        if (selector === '.ytp-next-button' && child.classList.contains('ytp-next-button')) match = true;
        if (selector === '.ytp-left-controls' && child.classList.contains('ytp-left-controls')) match = true;
        if (selector === 'svg' && child.tagName === 'SVG') match = true;
        if (selector === 'path' && child.tagName === 'PATH') match = true;
        if (selector === '.ytp-svg-fill' && child.classList.contains('ytp-svg-fill')) match = true;

        if (match) results.push(child);
        traverse(child);
      }
    }
    traverse(this);
    return results;
  }
}

// Global DOM environment
const leftControlsMock = new MockElement('div');
leftControlsMock.classList.add('ytp-left-controls');

const playButtonMock = new MockElement('button');
playButtonMock.classList.add('ytp-button', 'ytp-play-button');
leftControlsMock.appendChild(playButtonMock);

const loopButtonMock = new MockElement('button');
loopButtonMock.classList.add('ytp-button', 'ytp-loop-button');
leftControlsMock.appendChild(loopButtonMock);

global.document = {
  createElement: (tag) => new MockElement(tag),
  querySelector: (sel) => {
    if (sel === '.ytp-left-controls') return leftControlsMock;
    return leftControlsMock.querySelector(sel);
  },
  querySelectorAll: (sel) => {
    if (sel === '.ytp-left-controls') return [leftControlsMock];
    return leftControlsMock.querySelectorAll(sel);
  }
};

global.chrome = {
  storage: {
    local: {
      get: (keys, cb) => cb({}),
      set: (data, cb) => cb && cb()
    }
  },
  runtime: {
    lastError: null,
    getURL: (p) => p
  }
};

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Carregar YouTubeLooperCore
const YouTubeLooperCore = require('./content.js');

function runAllTests() {
  // ---------------------------------------------------------------------------
  // [SUÍTE 1] Criação do Botão PiP (createPipButton)
  // ---------------------------------------------------------------------------
  console.log('[SUÍTE 1] Criação do Botão PiP (createPipButton)');

  test('YouTubeLooperCore exporta createPipButton como função', () => {
    assert.strictEqual(
      typeof YouTubeLooperCore.createPipButton,
      'function',
      'createPipButton deve ser exportado em YouTubeLooperCore'
    );
  });

  test('createPipButton cria elemento button com classes .ytp-button e .ytp-pip-button', () => {
    const btn = YouTubeLooperCore.createPipButton();
    assert.ok(btn, 'createPipButton deve retornar um elemento');
    assert.strictEqual(btn.tagName, 'BUTTON', 'Elemento criado deve ser um <button>');
    assert.ok(btn.classList.contains('ytp-button'), 'Deve possuir a classe .ytp-button');
    assert.ok(btn.classList.contains('ytp-pip-button'), 'Deve possuir a classe .ytp-pip-button');
  });

  test('createPipButton define atributos de acessibilidade e título com atalho Shift+P', () => {
    const btn = YouTubeLooperCore.createPipButton();
    const ariaLabel = btn.getAttribute('aria-label');
    const title = btn.getAttribute('title');
    assert.ok(ariaLabel && ariaLabel.includes('Shift+P'), 'aria-label deve mencionar Shift+P');
    assert.ok(ariaLabel && ariaLabel.includes('Mini Player'), 'aria-label deve indicar Mini Player');
    assert.ok(title && title.includes('Shift+P'), 'title deve mencionar Shift+P');
  });

  test('createPipButton insere ícone SVG com viewBox e path estilizado', () => {
    const btn = YouTubeLooperCore.createPipButton();
    const svg = btn.querySelector('svg');
    assert.ok(svg, 'Botão deve conter elemento SVG');
    assert.strictEqual(svg.getAttribute('viewBox'), '0 0 36 36', 'SVG deve ter viewBox="0 0 36 36"');
    const pathEl = svg.querySelector('path');
    assert.ok(pathEl, 'SVG deve conter elemento path');
    assert.ok(pathEl.classList.contains('ytp-svg-fill'), 'Path deve conter classe .ytp-svg-fill');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 2] Injeção de Controles (injectPipButton)
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 2] Injeção de Controles (injectPipButton)');

  test('YouTubeLooperCore exporta injectPipButton como função', () => {
    assert.strictEqual(
      typeof YouTubeLooperCore.injectPipButton,
      'function',
      'injectPipButton deve ser exportado em YouTubeLooperCore'
    );
  });

  test('injectPipButton injeta botão imediatamente após .ytp-loop-button', () => {
    // Reset left controls
    leftControlsMock.children = [playButtonMock, loopButtonMock];
    playButtonMock.parentNode = leftControlsMock;
    loopButtonMock.parentNode = leftControlsMock;

    const btn = YouTubeLooperCore.injectPipButton(leftControlsMock);
    assert.ok(btn, 'injectPipButton deve retornar o botão injetado');
    assert.ok(btn.classList.contains('ytp-pip-button'), 'Botão retornado deve ser .ytp-pip-button');

    const idxLoop = leftControlsMock.children.indexOf(loopButtonMock);
    const idxPip = leftControlsMock.children.indexOf(btn);
    assert.strictEqual(idxPip, idxLoop + 1, 'Botão PiP deve ser posicionado imediatamente após o botão de loop');
  });

  test('injectPipButton se posiciona após .ytp-play-button se .ytp-loop-button estiver ausente', () => {
    // Left controls sem loop button
    const container = new MockElement('div');
    container.classList.add('ytp-left-controls');
    const playBtn = new MockElement('button');
    playBtn.classList.add('ytp-button', 'ytp-play-button');
    container.appendChild(playBtn);

    const btn = YouTubeLooperCore.injectPipButton(container);
    assert.ok(btn, 'Deve injetar com sucesso');
    const idxPlay = container.children.indexOf(playBtn);
    const idxPip = container.children.indexOf(btn);
    assert.strictEqual(idxPip, idxPlay + 1, 'Deve ser posicionado após play button');
  });

  test('injectPipButton é idempotente e não duplica botão no DOM', () => {
    leftControlsMock.children = [playButtonMock, loopButtonMock];
    playButtonMock.parentNode = leftControlsMock;
    loopButtonMock.parentNode = leftControlsMock;

    const btn1 = YouTubeLooperCore.injectPipButton(leftControlsMock);
    const btn2 = YouTubeLooperCore.injectPipButton(leftControlsMock);

    assert.strictEqual(btn1, btn2, 'Chamadas consecutivas devem retornar a mesma instância');
    const pipButtons = leftControlsMock.querySelectorAll('.ytp-pip-button');
    assert.strictEqual(pipButtons.length, 1, 'Deve existir exatamente 1 botão PiP no container');
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 3] Disparo de Ação via Clique no Botão
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 3] Disparo de Ação via Clique no Botão');

  test('Clicar no botão PiP injetado aciona MiniPlayerController.open()', () => {
    let openCalled = false;
    const originalOpen = YouTubeLooperCore.MiniPlayerController.open;
    YouTubeLooperCore.MiniPlayerController.open = async () => {
      openCalled = true;
      return {};
    };

    try {
      leftControlsMock.children = [playButtonMock, loopButtonMock];
      playButtonMock.parentNode = leftControlsMock;
      loopButtonMock.parentNode = leftControlsMock;

      const btn = YouTubeLooperCore.injectPipButton(leftControlsMock);
      btn.click();
      assert.strictEqual(openCalled, true, 'MiniPlayerController.open() deve ser invocado no clique');
    } finally {
      YouTubeLooperCore.MiniPlayerController.open = originalOpen;
    }
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 4] Atalho de Teclado Shift + P (handleKeyDown)
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 4] Atalho de Teclado Shift + P (handleKeyDown)');

  test('Pressionar Shift + P aciona MiniPlayerController.open() e chama preventDefault()', () => {
    let openCalled = false;
    let preventDefaultCalled = false;
    const originalOpen = YouTubeLooperCore.MiniPlayerController.open;
    YouTubeLooperCore.MiniPlayerController.open = async () => {
      openCalled = true;
      return {};
    };

    try {
      const normalDiv = new MockElement('div');
      YouTubeLooperCore.handleKeyDown({
        key: 'P',
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        target: normalDiv,
        preventDefault: () => { preventDefaultCalled = true; },
        stopPropagation: () => {},
        stopImmediatePropagation: () => {}
      });

      assert.strictEqual(openCalled, true, 'MiniPlayerController.open() deve ser acionado por Shift + P');
      assert.strictEqual(preventDefaultCalled, true, 'preventDefault() deve ser invocado para prevenir comportamento padrão');
    } finally {
      YouTubeLooperCore.MiniPlayerController.open = originalOpen;
    }
  });

  test('Atalho Shift + P funciona com key="p" minúsculo e code="KeyP"', () => {
    let openCalls = 0;
    const originalOpen = YouTubeLooperCore.MiniPlayerController.open;
    YouTubeLooperCore.MiniPlayerController.open = async () => {
      openCalls++;
      return {};
    };

    try {
      const normalDiv = new MockElement('div');
      // key: 'p'
      YouTubeLooperCore.handleKeyDown({
        key: 'p',
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        target: normalDiv,
        preventDefault: () => {},
        stopPropagation: () => {},
        stopImmediatePropagation: () => {}
      });

      // code: 'KeyP'
      YouTubeLooperCore.handleKeyDown({
        key: 'Unknown',
        code: 'KeyP',
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        target: normalDiv,
        preventDefault: () => {},
        stopPropagation: () => {},
        stopImmediatePropagation: () => {}
      });

      assert.strictEqual(openCalls, 2, 'Deve acionar com variações de key "p" e code "KeyP"');
    } finally {
      YouTubeLooperCore.MiniPlayerController.open = originalOpen;
    }
  });

  test('Atalho Shift + P é ignorado quando focado em input, textarea ou contenteditable', () => {
    let openCalled = false;
    const originalOpen = YouTubeLooperCore.MiniPlayerController.open;
    YouTubeLooperCore.MiniPlayerController.open = async () => {
      openCalled = true;
      return {};
    };

    try {
      // 1. INPUT
      const inputEl = new MockElement('input');
      YouTubeLooperCore.handleKeyDown({
        key: 'P',
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        target: inputEl,
        preventDefault: () => {}
      });
      assert.strictEqual(openCalled, false, 'Deve ignorar quando focado em <input>');

      // 2. TEXTAREA
      const textareaEl = new MockElement('textarea');
      YouTubeLooperCore.handleKeyDown({
        key: 'P',
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        target: textareaEl,
        preventDefault: () => {}
      });
      assert.strictEqual(openCalled, false, 'Deve ignorar quando focado em <textarea>');

      // 3. contenteditable
      const editableEl = new MockElement('div');
      editableEl.isContentEditable = true;
      YouTubeLooperCore.handleKeyDown({
        key: 'P',
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        target: editableEl,
        preventDefault: () => {}
      });
      assert.strictEqual(openCalled, false, 'Deve ignorar quando focado em elemento contenteditable');
    } finally {
      YouTubeLooperCore.MiniPlayerController.open = originalOpen;
    }
  });

  test('Atalho Shift + P é ignorado com modificadores Ctrl, Alt ou Meta', () => {
    let openCalled = false;
    const originalOpen = YouTubeLooperCore.MiniPlayerController.open;
    YouTubeLooperCore.MiniPlayerController.open = async () => {
      openCalled = true;
      return {};
    };

    try {
      const normalDiv = new MockElement('div');

      // Ctrl + Shift + P
      YouTubeLooperCore.handleKeyDown({
        key: 'P',
        shiftKey: true,
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        target: normalDiv,
        preventDefault: () => {}
      });
      assert.strictEqual(openCalled, false, 'Deve ignorar Ctrl + Shift + P');

      // Alt + Shift + P
      YouTubeLooperCore.handleKeyDown({
        key: 'P',
        shiftKey: true,
        ctrlKey: false,
        altKey: true,
        metaKey: false,
        target: normalDiv,
        preventDefault: () => {}
      });
      assert.strictEqual(openCalled, false, 'Deve ignorar Alt + Shift + P');

      // Meta + Shift + P
      YouTubeLooperCore.handleKeyDown({
        key: 'P',
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: true,
        target: normalDiv,
        preventDefault: () => {}
      });
      assert.strictEqual(openCalled, false, 'Deve ignorar Meta + Shift + P');
    } finally {
      YouTubeLooperCore.MiniPlayerController.open = originalOpen;
    }
  });

  // ---------------------------------------------------------------------------
  // [SUÍTE 5] Estilos no content.css
  // ---------------------------------------------------------------------------
  console.log('\n[SUÍTE 5] Estilos no content.css');

  const cssPath = path.join(__dirname, 'content.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  test('content.css contém seletores para .ytp-pip-button', () => {
    assert.ok(
      cssContent.includes('.ytp-pip-button') || cssContent.includes('.ytp-button.ytp-pip-button'),
      'content.css deve conter seletores para .ytp-pip-button'
    );
  });

  test('content.css define efeitos de hover e transições para .ytp-pip-button', () => {
    assert.ok(
      cssContent.includes('.ytp-pip-button:hover') || cssContent.includes('.ytp-button.ytp-pip-button:hover'),
      'content.css deve conter estilos de hover para o botão PiP'
    );
    assert.ok(
      cssContent.includes('transform: scale') || cssContent.includes('transition:'),
      'content.css deve definir transições suaves e escala'
    );
  });

  test('content.css mantém chaves balanceadas após adições', () => {
    let openCount = 0;
    let closeCount = 0;
    for (let i = 0; i < cssContent.length; i++) {
      if (cssContent[i] === '{') openCount++;
      if (cssContent[i] === '}') closeCount++;
    }
    assert.strictEqual(openCount, closeCount, `Chaves balanceadas: { (${openCount}) vs } (${closeCount})`);
  });

  // ---------------------------------------------------------------------------
  // Resumo Final
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES: ${passCount + failCount}`);
  console.log(`PASSOU:          ${passCount}`);
  console.log(`FALHOU:          ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    console.error(`[FALHA] ${failCount} teste(s) falharam.`);
    process.exit(1);
  } else {
    console.log('[SUCESSO] Todos os testes de botão PiP e atalho passaram!');
  }
}

runAllTests();
