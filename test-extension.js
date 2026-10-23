/**
 * Teste Automatizado de Integridade da Extensão
 * YouTube Music & Video Looper (Manifest V3)
 *
 * Executa validações estáticas e de tempo de execução sobre todos os artefatos:
 * 1. manifest.json (Formato MV3, permissões, content scripts e arquivos referenciados)
 * 2. icons/ (Existência física, cabeçalhos de assinatura mágica PNG e dimensões 16x16, 48x48, 128x128)
 * 3. content.css (Sintaxe CSS, balanceamento de chaves, seletores e keyframes)
 * 4. content.js (Análise sintática do código e exportações do YouTubeLooperCore)
 * 5. Runtime & Integração (Mock DOM, injeção de controles, alternância de vídeo, persistência, atalhos e Toast)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Diretório raiz da extensão
const ROOT_DIR = __dirname;

// Contador de testes
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(suiteName, testName, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${testName}`);
    console.error(`         Erro: ${err.message}`);
    if (err.stack) {
      console.error(`         Stack: ${err.stack.split('\n')[1] || ''}`);
    }
  }
}

// Assinatura de 8 bytes de arquivos PNG legítimos
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function validatePngIcon(fileName, expectedWidth, expectedHeight) {
  const iconPath = path.join(ROOT_DIR, 'icons', fileName);
  assert.strictEqual(fs.existsSync(iconPath), true, `Ícone ${fileName} deve existir`);

  const stat = fs.statSync(iconPath);
  assert.ok(stat.size > 0, `Ícone ${fileName} não pode ter tamanho zero (tamanho: ${stat.size} bytes)`);

  const buf = fs.readFileSync(iconPath);
  assert.ok(buf.length >= 24, `Ícone ${fileName} deve ter ao menos 24 bytes para conter o cabeçalho IHDR`);

  // Assinatura PNG
  const fileSig = buf.subarray(0, 8);
  assert.ok(fileSig.equals(PNG_SIGNATURE), `Ícone ${fileName} deve possuir assinatura mágica de cabeçalho PNG válida`);

  // Chunk IHDR (bytes 12-15)
  const chunkType = buf.toString('ascii', 12, 16);
  assert.strictEqual(chunkType, 'IHDR', `Primeiro chunk deve ser IHDR no arquivo ${fileName}`);

  // Dimensões de largura e altura
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.strictEqual(width, expectedWidth, `Largura de ${fileName} esperada: ${expectedWidth}px, obtida: ${width}px`);
  assert.strictEqual(height, expectedHeight, `Altura de ${fileName} esperada: ${expectedHeight}px, obtida: ${height}px`);
}

// Construção de um Mock DOM completo e determinístico para testes de runtime
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
    this.playCount = 0;
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
    this.playCount++;
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
      if (selector === '.ytp-left-controls' && child.classList.contains('ytp-left-controls')) matches = true;
      else if (selector === '.ytp-loop-button' && child.classList.contains('ytp-loop-button')) matches = true;
      else if (selector === '.ytp-play-button' && child.classList.contains('ytp-play-button')) matches = true;
      else if (selector === '.html5-video-player' && child.classList.contains('html5-video-player')) matches = true;
      else if (selector === '#movie_player' && child.id === 'movie_player') matches = true;
      else if (selector === '.ytp-loop-toast' && child.classList.contains('ytp-loop-toast')) matches = true;
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

// Configuração do ambiente global antes de carregar o módulo
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
}

let mockStorage = {};
const chromeMock = {
  storage: {
    local: {
      get: (keys, cb) => {
        const res = {};
        for (const k of keys) {
          if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
        }
        cb(res);
      },
      set: (items, cb) => {
        Object.assign(mockStorage, items);
        if (cb) cb();
      }
    }
  },
  runtime: {
    lastError: null
  }
};

let mockLocalStorage = {};
const localStorageMock = {
  getItem: (key) => mockLocalStorage[key] || null,
  setItem: (key, val) => { mockLocalStorage[key] = String(val); },
  removeItem: (key) => { delete mockLocalStorage[key]; },
  clear: () => { mockLocalStorage = {}; }
};

global.document = documentMock;
global.window = windowMock;
global.MutationObserver = MockMutationObserver;
global.chrome = chromeMock;
global.localStorage = localStorageMock;

// Importação do Core do YouTube Looper
const jsPath = path.join(ROOT_DIR, 'content.js');
const YouTubeLooperCore = require(jsPath);

// Criação do cenário DOM típico do YouTube
function setupYouTubeDomEnvironment() {
  documentMock.body.children = [];
  mockStorage = {};
  mockLocalStorage = {};

  const playerContainer = new MockElement('div');
  playerContainer.classList.add('html5-video-player');
  playerContainer.id = 'movie_player';

  const videoElement = new MockElement('video');
  videoElement.classList.add('html5-main-video');
  playerContainer.appendChild(videoElement);

  const leftControls = new MockElement('div');
  leftControls.classList.add('ytp-left-controls');

  const playBtn = new MockElement('button');
  playBtn.classList.add('ytp-play-button');
  leftControls.appendChild(playBtn);

  playerContainer.appendChild(leftControls);
  documentMock.body.appendChild(playerContainer);

  return { playerContainer, videoElement, leftControls, playBtn };
}

// ============================================================================
// EXECUÇÃO PRINCIPAL ASSÍNCRONA DA SUÍTE DE TESTES
// ============================================================================
async function main() {
  console.log('================================================================');
  console.log('   YouTube Music & Video Looper - Teste Automatizado Integrado   ');
  console.log('================================================================');

  // --------------------------------------------------------------------------
  // SUÍTE 1: MANIFEST.JSON
  // --------------------------------------------------------------------------
  console.log('\n[SUÍTE 1] Validação do Manifest V3 (manifest.json)');
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  let manifestContent = '';
  let manifest = null;

  await runTest('Manifest', 'Arquivo manifest.json existe no diretório raiz', () => {
    assert.strictEqual(fs.existsSync(manifestPath), true, 'manifest.json deve existir');
    manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(manifestContent.length > 0, 'manifest.json não pode estar vazio');
  });

  await runTest('Manifest', 'Arquivo manifest.json é um JSON válido', () => {
    manifest = JSON.parse(manifestContent);
    assert.strictEqual(typeof manifest, 'object', 'manifest deve ser um objeto');
    assert.notStrictEqual(manifest, null, 'manifest não pode ser nulo');
  });

  await runTest('Manifest', 'Compatibilidade estrita com Manifest V3 (manifest_version: 3)', () => {
    assert.strictEqual(manifest.manifest_version, 3, 'manifest_version deve ser 3');
  });

  await runTest('Manifest', 'Metadados obrigatórios presentes e válidos (name, version, description)', () => {
    assert.strictEqual(manifest.name, 'YouTube Music & Video Looper', 'name deve ser "YouTube Music & Video Looper"');
    assert.ok(typeof manifest.version === 'string' && manifest.version.length > 0, 'version deve ser preenchida');
    assert.ok(typeof manifest.description === 'string' && manifest.description.length > 0, 'description deve ser preenchida');
  });

  await runTest('Manifest', 'Permissões configuradas corretamente (storage e host_permissions)', () => {
    assert.ok(Array.isArray(manifest.permissions), 'permissions deve ser um array');
    assert.ok(manifest.permissions.includes('storage'), 'permissions deve incluir "storage"');
    assert.ok(Array.isArray(manifest.host_permissions), 'host_permissions deve ser um array');
    assert.ok(manifest.host_permissions.includes('https://www.youtube.com/*'), 'host_permissions deve conter "https://www.youtube.com/*"');
  });

  await runTest('Manifest', 'Estrutura de ícones declarada em action e icons', () => {
    assert.ok(manifest.action && manifest.action.default_icon, 'action.default_icon deve existir');
    assert.strictEqual(manifest.action.default_icon['16'], 'icons/icon16.png');
    assert.strictEqual(manifest.action.default_icon['48'], 'icons/icon48.png');
    assert.strictEqual(manifest.action.default_icon['128'], 'icons/icon128.png');

    assert.ok(manifest.icons, 'icons deve existir');
    assert.strictEqual(manifest.icons['16'], 'icons/icon16.png');
    assert.strictEqual(manifest.icons['48'], 'icons/icon48.png');
    assert.strictEqual(manifest.icons['128'], 'icons/icon128.png');
  });

  await runTest('Manifest', 'Content Scripts configurados com matches, content.js, content.css e run_at', () => {
    assert.ok(Array.isArray(manifest.content_scripts), 'content_scripts deve ser um array');
    assert.ok(manifest.content_scripts.length > 0, 'content_scripts deve ter ao menos 1 entrada');
    const cs = manifest.content_scripts[0];
    assert.ok(cs.matches.includes('https://www.youtube.com/*'), 'matches deve incluir youtube.com/*');
    assert.ok(cs.js.includes('content.js'), 'js deve incluir content.js');
    assert.ok(cs.css.includes('content.css'), 'css deve incluir content.css');
    assert.strictEqual(cs.run_at, 'document_idle', 'run_at deve ser document_idle');
  });

  await runTest('Manifest', 'Todos os arquivos referenciados no manifest.json existem fisicamente no disco', () => {
    const referencedFiles = [
      manifest.action.default_icon['16'],
      manifest.action.default_icon['48'],
      manifest.action.default_icon['128'],
      ...manifest.content_scripts[0].js,
      ...manifest.content_scripts[0].css
    ];

    for (const relPath of referencedFiles) {
      const fullPath = path.join(ROOT_DIR, relPath);
      assert.strictEqual(fs.existsSync(fullPath), true, `Arquivo referenciado deve existir no disco: ${relPath}`);
    }
  });

  // --------------------------------------------------------------------------
  // SUÍTE 2: ÍCONES PNG
  // --------------------------------------------------------------------------
  console.log('\n[SUÍTE 2] Integridade e Geometria dos Ícones PNG (icons/)');

  await runTest('Icons', 'Validação de integridade e resolução de icon16.png (16x16 px)', () => {
    validatePngIcon('icon16.png', 16, 16);
  });

  await runTest('Icons', 'Validação de integridade e resolução de icon48.png (48x48 px)', () => {
    validatePngIcon('icon48.png', 48, 48);
  });

  await runTest('Icons', 'Validação de integridade e resolução de icon128.png (128x128 px)', () => {
    validatePngIcon('icon128.png', 128, 128);
  });

  // --------------------------------------------------------------------------
  // SUÍTE 3: FOLHA DE ESTILOS CSS
  // --------------------------------------------------------------------------
  console.log('\n[SUÍTE 3] Sintaxe e Seletores da Folha de Estilos (content.css)');
  const cssPath = path.join(ROOT_DIR, 'content.css');
  let cssContent = '';

  await runTest('CSS', 'Arquivo content.css existe e possui conteúdo', () => {
    assert.strictEqual(fs.existsSync(cssPath), true, 'content.css deve existir');
    cssContent = fs.readFileSync(cssPath, 'utf-8');
    assert.ok(cssContent.length > 100, 'content.css deve ter conteúdo substancial');
  });

  await runTest('CSS', 'Sintaxe CSS básica válida com balanceamento exato de chaves { e }', () => {
    let openBraces = 0;
    let closeBraces = 0;
    for (const char of cssContent) {
      if (char === '{') openBraces++;
      if (char === '}') closeBraces++;
    }
    assert.ok(openBraces > 0, 'Deve conter declarações de blocos CSS');
    assert.strictEqual(openBraces, closeBraces, `Número de chaves abertas (${openBraces}) deve coincidir com chaves fechadas (${closeBraces})`);
  });

  await runTest('CSS', 'Presença de seletores do botão de loop (.ytp-loop-button, .active, hover e SVG)', () => {
    assert.ok(cssContent.includes('.ytp-loop-button'), 'Deve definir classe .ytp-loop-button');
    assert.ok(cssContent.includes('.active'), 'Deve definir estilos para classe .active');
    assert.ok(cssContent.includes('#ff0000'), 'Deve conter cor vermelha do YouTube para estado ativo');
    assert.ok(cssContent.includes('::after'), 'Deve definir indicador pontual .active::after');
  });

  await runTest('CSS', 'Presença de seletores e estados da notificação Toast flutuante (.ytp-loop-toast)', () => {
    assert.ok(cssContent.includes('.ytp-loop-toast'), 'Deve conter estilo principal para .ytp-loop-toast');
    assert.ok(cssContent.includes('.toast-enabled'), 'Deve estilizar toast no modo ativado (.toast-enabled)');
    assert.ok(cssContent.includes('.toast-disabled'), 'Deve estilizar toast no modo desativado (.toast-disabled)');
    assert.ok(cssContent.includes('.ytp-loop-toast-icon'), 'Deve conter estilo de ícone do Toast');
    assert.ok(cssContent.includes('.animate-in'), 'Deve conter classe de animação de entrada .animate-in');
    assert.ok(cssContent.includes('.animate-out'), 'Deve conter classe de animação de saída .animate-out');
  });

  await runTest('CSS', 'Definição das keyframes de animação de entrada e saída do Toast', () => {
    assert.ok(cssContent.includes('@keyframes ytpLoopToastFadeIn'), 'Deve definir keyframes ytpLoopToastFadeIn');
    assert.ok(cssContent.includes('@keyframes ytpLoopToastFadeOut'), 'Deve definir keyframes ytpLoopToastFadeOut');
  });

  await runTest('CSS', 'Compatibilidade responsiva com modos do player (.ytp-fullscreen e .ytp-small-mode)', () => {
    assert.ok(cssContent.includes('.ytp-fullscreen'), 'Deve adaptar estilos para tela cheia');
    assert.ok(cssContent.includes('.ytp-small-mode'), 'Deve adaptar estilos para miniplayer / tamanho reduzido');
  });

  // --------------------------------------------------------------------------
  // SUÍTE 4: ANÁLISE ESTÁTICA JAVASCRIPT
  // --------------------------------------------------------------------------
  console.log('\n[SUÍTE 4] Análise Estática e Exportações (content.js)');
  let jsContent = '';

  await runTest('JavaScript', 'Arquivo content.js existe e não está vazio', () => {
    assert.strictEqual(fs.existsSync(jsPath), true, 'content.js deve existir');
    jsContent = fs.readFileSync(jsPath, 'utf-8');
    assert.ok(jsContent.length > 500, 'content.js deve possuir código substancial');
  });

  await runTest('JavaScript', 'Sintaxe JavaScript compila sem erros (Node.js vm.Script)', () => {
    assert.doesNotThrow(() => {
      new vm.Script(jsContent, { filename: 'content.js' });
    }, 'content.js deve ser sintaticamente válido no compilador JS');
  });

  await runTest('JavaScript', 'Presença das funções fundamentais de controle e ciclo de vida', () => {
    const expectedFunctions = [
      'initLoopExtension',
      'loadLoopState',
      'saveLoopState',
      'getVideoElement',
      'handleVideoEnded',
      'applyLoopToVideo',
      'updateButtonVisual',
      'showToast',
      'toggleLoopState',
      'createLoopButton',
      'injectLoopButton',
      'isTextInputElement',
      'handleKeyDown',
      'handleNavigation',
      'setupObserver'
    ];

    for (const fnName of expectedFunctions) {
      assert.ok(jsContent.includes(fnName), `content.js deve conter a função/método ${fnName}`);
    }
  });

  await runTest('JavaScript', 'Estrutura de exportação modular YouTubeLooperCore presente', () => {
    assert.ok(jsContent.includes('const YouTubeLooperCore ='), 'Deve definir o objeto YouTubeLooperCore');
    assert.ok(jsContent.includes('module.exports = YouTubeLooperCore'), 'Deve suportar module.exports para testes e automações');
    assert.ok(jsContent.includes('global.YouTubeLooperCore = YouTubeLooperCore'), 'Deve expor global.YouTubeLooperCore para o navegador');
  });

  // --------------------------------------------------------------------------
  // SUÍTE 5: RUNTIME & INTEGRAÇÃO FUNCIONAL
  // --------------------------------------------------------------------------
  console.log('\n[SUÍTE 5] Runtime & Integração Funcional (Mock DOM & Storage)');

  await runTest('Runtime', 'Injeção do botão de repetição no player do YouTube (.ytp-left-controls)', () => {
    const { leftControls } = setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();

    const injectedBtn = YouTubeLooperCore.injectLoopButton();
    assert.ok(injectedBtn, 'Botão deve ser retornado por injectLoopButton');
    assert.ok(injectedBtn.classList.contains('ytp-loop-button'), 'Botão deve conter a classe .ytp-loop-button');
    assert.strictEqual(injectedBtn.getAttribute('aria-pressed'), 'false', 'Estado ARIA inicial deve ser false');
    assert.ok(injectedBtn.getAttribute('aria-label').includes('Shift+L'), 'aria-label deve conter indicação do atalho');

    // Verifica inserção na barra de controles
    const foundBtn = leftControls.querySelector('.ytp-loop-button');
    assert.ok(foundBtn, 'Botão deve residir dentro de .ytp-left-controls');
  });

  await runTest('Runtime', 'Idempotência da injeção (não duplica botão se já existir no DOM)', () => {
    const { leftControls } = setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();

    const btn1 = YouTubeLooperCore.injectLoopButton();
    const btn2 = YouTubeLooperCore.injectLoopButton();

    assert.strictEqual(btn1, btn2, 'Segunda injeção deve retornar a mesma instância existente');
    const allBtns = leftControls.querySelectorAll('.ytp-loop-button');
    assert.strictEqual(allBtns.length, 1, 'Não deve criar múltiplos botões de loop na mesma barra');
  });

  await runTest('Runtime', 'Alternância de estado com toggleLoopState: ativando repetição', async () => {
    const { videoElement } = setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();
    YouTubeLooperCore.injectLoopButton();

    const newState = await YouTubeLooperCore.toggleLoopState();
    assert.strictEqual(newState, true, 'Novo estado retornado deve ser true');
    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'getLoopState deve retornar true');
    assert.strictEqual(videoElement.loop, true, 'Propriedade video.loop deve ser true');

    const btn = documentMock.querySelector('.ytp-loop-button');
    assert.ok(btn.classList.contains('active'), 'Botão deve conter a classe CSS .active');
    assert.strictEqual(btn.getAttribute('aria-pressed'), 'true', 'aria-pressed deve ser atualizado para true');
  });

  await runTest('Runtime', 'Alternância de estado com toggleLoopState: desativando repetição', async () => {
    const { videoElement } = setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();
    YouTubeLooperCore.injectLoopButton();

    // Ativa e depois desativa
    await YouTubeLooperCore.toggleLoopState();
    const stateOff = await YouTubeLooperCore.toggleLoopState();

    assert.strictEqual(stateOff, false, 'Novo estado retornado deve ser false');
    assert.strictEqual(YouTubeLooperCore.getLoopState(), false, 'getLoopState deve retornar false');
    assert.strictEqual(videoElement.loop, false, 'Propriedade video.loop deve ser false');

    const btn = documentMock.querySelector('.ytp-loop-button');
    assert.strictEqual(btn.classList.contains('active'), false, 'Botão não deve conter a classe .active');
    assert.strictEqual(btn.getAttribute('aria-pressed'), 'false', 'aria-pressed deve ser atualizado para false');
  });

  await runTest('Runtime', 'Persistência de estado com saveLoopState e loadLoopState (chrome.storage.local)', async () => {
    setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();

    await YouTubeLooperCore.saveLoopState(true);
    const loadedState = await YouTubeLooperCore.loadLoopState();
    assert.strictEqual(loadedState, true, 'loadLoopState deve recuperar true gravado pelo saveLoopState');

    await YouTubeLooperCore.saveLoopState(false);
    const loadedStateOff = await YouTubeLooperCore.loadLoopState();
    assert.strictEqual(loadedStateOff, false, 'loadLoopState deve recuperar false gravado pelo saveLoopState');
  });

  await runTest('Runtime', 'Geração de Toast flutuante com classes de estilo e mensagem correspondente', () => {
    setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();

    // Teste 1: Toast com loop ativo
    YouTubeLooperCore.setLoopState(true);
    const toastOn = YouTubeLooperCore.showToast();
    assert.ok(toastOn, 'Toast deve ser criado no DOM');
    assert.ok(toastOn.classList.contains('ytp-loop-toast'), 'Toast deve ter a classe .ytp-loop-toast');
    assert.ok(toastOn.classList.contains('toast-enabled'), 'Toast ativado deve conter .toast-enabled');
    assert.ok(toastOn.innerHTML.includes('Repetição ativada'), 'Mensagem deve indicar Repetição ativada');

    // Teste 2: Toast com loop inativo
    YouTubeLooperCore.setLoopState(false);
    const toastOff = YouTubeLooperCore.showToast();
    assert.ok(toastOff.classList.contains('toast-disabled'), 'Toast desativado deve conter .toast-disabled');
    assert.ok(toastOff.innerHTML.includes('Repetição desativada'), 'Mensagem deve indicar Repetição desativada');
  });

  await runTest('Runtime', 'Prevenção de digitação em inputs e contenteditable (isTextInputElement)', () => {
    YouTubeLooperCore._resetState();

    const inputEl = new MockElement('input');
    assert.strictEqual(YouTubeLooperCore.isTextInputElement(inputEl), true, '<input> deve ser detectado como campo de texto');

    const textareaEl = new MockElement('textarea');
    assert.strictEqual(YouTubeLooperCore.isTextInputElement(textareaEl), true, '<textarea> deve ser detectado como campo de texto');

    const editableDiv = new MockElement('div');
    editableDiv.setAttribute('contenteditable', 'true');
    assert.strictEqual(YouTubeLooperCore.isTextInputElement(editableDiv), true, 'div contenteditable deve ser detectado');

    const normalDiv = new MockElement('div');
    assert.strictEqual(YouTubeLooperCore.isTextInputElement(normalDiv), false, 'div comum não deve ser considerado campo de texto');
  });

  await runTest('Runtime', 'Acionamento por atalho de teclado Shift+L e bloqueio quando focado em input', async () => {
    setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();
    YouTubeLooperCore.injectLoopButton();

    let prevented = false;
    let stopped = false;
    const validEvent = {
      key: 'L',
      code: 'KeyL',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      target: new MockElement('div'),
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
      stopImmediatePropagation: () => {}
    };

    // Pressionar fora de input deve alternar
    await YouTubeLooperCore.handleKeyDown(validEvent);
    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'Shift+L fora de input deve ativar a repetição');
    assert.strictEqual(prevented, true, 'Atalho válido deve executar preventDefault');
    assert.strictEqual(stopped, true, 'Atalho válido deve executar stopPropagation');

    // Pressionar dentro de input deve ser ignorado
    prevented = false;
    const inputEvent = {
      key: 'L',
      code: 'KeyL',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      target: new MockElement('input'),
      preventDefault: () => { prevented = true; },
      stopPropagation: () => {},
      stopImmediatePropagation: () => {}
    };

    await YouTubeLooperCore.handleKeyDown(inputEvent);
    // O estado deve permanecer inalterado (true) e não deve prevenir o evento do teclado
    assert.strictEqual(YouTubeLooperCore.getLoopState(), true, 'Shift+L dentro de input não deve alternar');
    assert.strictEqual(prevented, false, 'Não deve prevenir digitação no input');
  });

  await runTest('Runtime', 'Mecanismo de redundância no evento ended reinicia a reprodução quando loop está ativo', () => {
    const { videoElement } = setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();
    YouTubeLooperCore.setLoopState(true);

    // Aplica ao elemento de vídeo
    YouTubeLooperCore.applyLoopToVideo();
    videoElement.currentTime = 120;
    videoElement.playCount = 0;

    // Dispara o evento ended simulando o término do vídeo
    videoElement.dispatchEvent({ type: 'ended' });

    assert.strictEqual(videoElement.currentTime, 0, 'Vídeo com repetição ativa deve voltar o currentTime para 0 ao terminar');
    assert.strictEqual(videoElement.playCount, 1, 'Vídeo com repetição ativa deve chamar video.play()');
  });

  await runTest('Runtime', 'Navegação SPA (yt-navigate-finish) preserva o estado ativo e re-sincroniza o player', async () => {
    const { videoElement, leftControls } = setupYouTubeDomEnvironment();
    YouTubeLooperCore._resetState();
    YouTubeLooperCore.setLoopState(true);

    // Simula destruição do botão anterior pela navegação nativa do YouTube
    leftControls.children = [];
    videoElement.loop = false;

    await YouTubeLooperCore.handleNavigation();

    // Botão deve ser reinjetado e vídeo re-sincronizado
    const injectedBtn = leftControls.querySelector('.ytp-loop-button');
    assert.ok(injectedBtn, 'Botão deve ser reinjetado após transição SPA');
    assert.ok(injectedBtn.classList.contains('active'), 'Botão reinjetado deve refletir estado ativo');
    assert.strictEqual(videoElement.loop, true, 'Vídeo da nova página deve ser colocado em repetição');
  });

  // --------------------------------------------------------------------------
  // RESUMO E FINALIZAÇÃO DA BATERIA DE TESTES
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES: ${totalTests}`);
  console.log(`PASSOU:          ${passedTests}`);
  console.log(`FALHOU:          ${failedTests}`);
  console.log('================================================================');

  if (failedTests > 0) {
    console.error(`\n[FALHA] ${failedTests} teste(s) falharam na validação de integridade.`);
    process.exit(1);
  } else {
    console.log('\n[SUCESSO] 100% dos testes de integridade foram concluídos com sucesso!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Erro inesperado na execução da suíte:', err);
  process.exit(1);
});
