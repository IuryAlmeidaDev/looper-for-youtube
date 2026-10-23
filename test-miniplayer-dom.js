/**
 * Looper for YouTube - Mini Player DOM & Stylesheet Unit Tests (Task 2)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('   Mini Player - Teste de DOM & Folha de Estilos (Task 2)       ');
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
// [SUÍTE 1] Exportação e Validação do Módulo Core
// -----------------------------------------------------------------------------
console.log('[SUÍTE 1] Exportação de renderMiniPlayerHTML');

const YouTubeLooperCore = require('./content.js');

test('YouTubeLooperCore exporta a função renderMiniPlayerHTML', () => {
  assert.strictEqual(
    typeof YouTubeLooperCore.renderMiniPlayerHTML,
    'function',
    'renderMiniPlayerHTML deve ser exportada como função em YouTubeLooperCore'
  );
});

const renderMiniPlayerHTML = YouTubeLooperCore.renderMiniPlayerHTML || function () { return ''; };

// -----------------------------------------------------------------------------
// [SUÍTE 2] Modo Pílula (isPill = true)
// -----------------------------------------------------------------------------
console.log('\n[SUÍTE 2] Validação do DOM no Modo Pílula (isPill = true)');

const pillParams = {
  isPill: true,
  title: 'Música de Teste - YouTube Looper',
  channel: 'Canal Oficial',
  thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
  isLoopActive: false,
  isPlaying: false,
  currentTimeStr: '01:15',
  durationStr: '03:45',
  progressPercent: 33.3
};

const pillHtml = renderMiniPlayerHTML(pillParams);

test('Contém container principal com classes miniplayer-container e pill', () => {
  assert.ok(
    /class=["'][^"']*miniplayer-container[^"']*pill[^"']*["']/.test(pillHtml) ||
    /class=["'][^"']*pill[^"']*miniplayer-container[^"']*["']/.test(pillHtml),
    'Deve conter container com classes .miniplayer-container e .pill'
  );
});

test('Contém título da faixa com classe track-title', () => {
  assert.ok(
    /class=["'][^"']*track-title[^"']*["']/.test(pillHtml),
    'Deve conter elemento com a classe .track-title'
  );
  assert.ok(
    pillHtml.includes('Música de Teste - YouTube Looper'),
    'Deve conter o título da faixa informado'
  );
});

test('Contém botões de navegação e reprodução (.btn-prev, .btn-play, .btn-next, .btn-loop)', () => {
  assert.ok(/class=["'][^"']*btn-prev[^"']*["']/.test(pillHtml), 'Deve conter botão .btn-prev');
  assert.ok(/class=["'][^"']*btn-play[^"']*["']/.test(pillHtml), 'Deve conter botão .btn-play');
  assert.ok(/class=["'][^"']*btn-next[^"']*["']/.test(pillHtml), 'Deve conter botão .btn-next');
  assert.ok(/class=["'][^"']*btn-loop[^"']*["']/.test(pillHtml), 'Deve conter botão .btn-loop');
});

test('Contém botão de alternância para expandir (.btn-toggle-mode com data-mode="pill" ou .btn-expand)', () => {
  const hasToggleWithDataMode = /class=["'][^"']*btn-toggle-mode[^"']*["'][^>]*data-mode=["']pill["']/.test(pillHtml) ||
                                /data-mode=["']pill["'][^>]*class=["'][^"']*btn-toggle-mode[^"']*["']/.test(pillHtml);
  const hasBtnExpand = /class=["'][^"']*btn-expand[^"']*["']/.test(pillHtml);
  assert.ok(
    hasToggleWithDataMode || hasBtnExpand,
    'Deve conter botão de expansão (.btn-toggle-mode[data-mode="pill"] ou .btn-expand)'
  );
});

test('Contém botão fechar (.btn-close)', () => {
  assert.ok(/class=["'][^"']*btn-close[^"']*["']/.test(pillHtml), 'Deve conter botão .btn-close');
});

test('Reflete corretamente os estados isPlaying e isLoopActive quando ativos', () => {
  const activePillHtml = renderMiniPlayerHTML({
    ...pillParams,
    isPlaying: true,
    isLoopActive: true
  });

  assert.ok(
    /class=["'][^"']*btn-play[^"']*playing[^"']*["']/.test(activePillHtml) ||
    /class=["'][^"']*playing[^"']*btn-play[^"']*["']/.test(activePillHtml),
    'Botão de play deve conter classe .playing quando isPlaying = true'
  );

  assert.ok(
    /class=["'][^"']*btn-loop[^"']*active[^"']*["']/.test(activePillHtml) ||
    /class=["'][^"']*active[^"']*btn-loop[^"']*["']/.test(activePillHtml),
    'Botão de loop deve conter classe .active quando isLoopActive = true'
  );
});

// -----------------------------------------------------------------------------
// [SUÍTE 3] Modo Expandido (isPill = false)
// -----------------------------------------------------------------------------
console.log('\n[SUÍTE 3] Validação do DOM no Modo Expandido (isPill = false)');

const expandedParams = {
  isPill: false,
  title: 'Vídeo Expandido - YouTube Looper',
  channel: 'Banda Exemplo',
  thumbnail: 'https://i.ytimg.com/vi/xyz789/hqdefault.jpg',
  isLoopActive: false,
  isPlaying: false,
  currentTimeStr: '02:10',
  durationStr: '04:20',
  progressPercent: 50
};

const expHtml = renderMiniPlayerHTML(expandedParams);

test('Contém container principal com classes miniplayer-container e expanded', () => {
  assert.ok(
    /class=["'][^"']*miniplayer-container[^"']*expanded[^"']*["']/.test(expHtml) ||
    /class=["'][^"']*expanded[^"']*miniplayer-container[^"']*["']/.test(expHtml),
    'Deve conter container com classes .miniplayer-container e .expanded'
  );
});

test('Contém miniatura do vídeo com classe track-thumbnail', () => {
  assert.ok(
    /<img[^>]*class=["'][^"']*track-thumbnail[^"']*["'][^>]*>/i.test(expHtml) ||
    /<img[^>]*src=["'][^"']*xyz789[^"']*["'][^>]*class=["'][^"']*track-thumbnail[^"']*["']/i.test(expHtml),
    'Deve conter elemento img com a classe .track-thumbnail'
  );
  assert.ok(
    expHtml.includes('https://i.ytimg.com/vi/xyz789/hqdefault.jpg'),
    'Deve conter a URL da miniatura'
  );
});

test('Contém metadados de título e canal (.track-title e .track-channel)', () => {
  assert.ok(/class=["'][^"']*track-title[^"']*["']/.test(expHtml), 'Deve conter .track-title');
  assert.ok(/class=["'][^"']*track-channel[^"']*["']/.test(expHtml), 'Deve conter .track-channel');
  assert.ok(expHtml.includes('Vídeo Expandido - YouTube Looper'), 'Deve conter título');
  assert.ok(expHtml.includes('Banda Exemplo'), 'Deve conter canal');
});

test('Contém barra de progresso interativa: input.progress-bar[type="range"]', () => {
  assert.ok(
    /<input[^>]*type=["']range["'][^>]*class=["'][^"']*progress-bar[^"']*["']/i.test(expHtml) ||
    /<input[^>]*class=["'][^"']*progress-bar[^"']*["'][^>]*type=["']range["']/i.test(expHtml),
    'Deve conter input range com classe .progress-bar'
  );
  assert.ok(/min=["']0["']/.test(expHtml), 'Barra deve ter min="0"');
  assert.ok(/max=["']100["']/.test(expHtml), 'Barra deve ter max="100"');
  assert.ok(/value=["']50["']|value=["']50\.0["']/.test(expHtml), 'Barra deve ter value correspondente');
});

test('Contém exibição de tempo decorrido e total (.time-current e .time-total)', () => {
  assert.ok(/class=["'][^"']*time-current[^"']*["']/.test(expHtml), 'Deve conter .time-current');
  assert.ok(/class=["'][^"']*time-total[^"']*["']/.test(expHtml), 'Deve conter .time-total');
  assert.ok(expHtml.includes('02:10'), 'Deve exibir tempo decorrido');
  assert.ok(expHtml.includes('04:20'), 'Deve exibir tempo total');
});

test('Contém botão de alternância para recolher (.btn-toggle-mode com data-mode="expanded" ou .btn-collapse)', () => {
  const hasToggleWithDataMode = /class=["'][^"']*btn-toggle-mode[^"']*["'][^>]*data-mode=["']expanded["']/.test(expHtml) ||
                                /data-mode=["']expanded["'][^>]*class=["'][^"']*btn-toggle-mode[^"']*["']/.test(expHtml);
  const hasBtnCollapse = /class=["'][^"']*btn-collapse[^"']*["']/.test(expHtml);
  assert.ok(
    hasToggleWithDataMode || hasBtnCollapse,
    'Deve conter botão para recolher (.btn-toggle-mode[data-mode="expanded"] ou .btn-collapse)'
  );
});

test('Contém controles de reprodução completos e botão fechar (.btn-prev, .btn-play, .btn-next, .btn-loop, .btn-close)', () => {
  assert.ok(/class=["'][^"']*btn-prev[^"']*["']/.test(expHtml), 'Deve conter .btn-prev');
  assert.ok(/class=["'][^"']*btn-play[^"']*["']/.test(expHtml), 'Deve conter .btn-play');
  assert.ok(/class=["'][^"']*btn-next[^"']*["']/.test(expHtml), 'Deve conter .btn-next');
  assert.ok(/class=["'][^"']*btn-loop[^"']*["']/.test(expHtml), 'Deve conter .btn-loop');
  assert.ok(/class=["'][^"']*btn-close[^"']*["']/.test(expHtml), 'Deve conter .btn-close');
});

test('Escapa caracteres perigosos em títulos e canais para prevenir XSS', () => {
  const xssHtml = renderMiniPlayerHTML({
    isPill: false,
    title: '<script>alert(1)</script>',
    channel: 'Canal & "Amigos"'
  });

  assert.ok(!xssHtml.includes('<script>'), 'Não deve conter tags de script não escapadas');
  assert.ok(xssHtml.includes('&lt;script&gt;'), 'Deve escapar tags < e >');
  assert.ok(xssHtml.includes('&amp;'), 'Deve escapar &');
  assert.ok(xssHtml.includes('&quot;'), 'Deve escapar aspas duplas');
});

// -----------------------------------------------------------------------------
// [SUÍTE 4] Validação da Folha de Estilos (miniplayer.css)
// -----------------------------------------------------------------------------
console.log('\n[SUÍTE 4] Integridade da Folha de Estilos (miniplayer.css)');

const cssPath = path.join(__dirname, 'miniplayer.css');

test('Arquivo miniplayer.css existe fisicamente no diretório raiz', () => {
  assert.ok(fs.existsSync(cssPath), 'miniplayer.css deve existir no disco');
});

if (fs.existsSync(cssPath)) {
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  test('miniplayer.css não está vazio e tem chaves balanceadas', () => {
    assert.ok(cssContent.trim().length > 100, 'miniplayer.css deve conter regras de estilo');
    const opens = (cssContent.match(/{/g) || []).length;
    const closes = (cssContent.match(/}/g) || []).length;
    assert.strictEqual(opens, closes, `Chaves abertas (${opens}) devem ser iguais às fechadas (${closes})`);
  });

  test('miniplayer.css contém seletores essenciais para Pill e Expanded modes', () => {
    const essentialSelectors = [
      '.miniplayer-container',
      '.pill',
      '.expanded',
      '.track-title',
      '.btn-play',
      '.btn-loop',
      '.progress-bar',
      '.btn-control'
    ];

    for (const sel of essentialSelectors) {
      assert.ok(cssContent.includes(sel), `miniplayer.css deve conter o seletor '${sel}'`);
    }
  });

  test('miniplayer.css define dimensões e cores do YouTube Dark (#0f0f0f e destaque #ff0000)', () => {
    assert.ok(cssContent.includes('#0f0f0f'), 'Deve conter cor de fundo YouTube Dark #0f0f0f');
    assert.ok(cssContent.includes('#ff0000'), 'Deve conter cor de destaque vermelho #ff0000');
    assert.ok(cssContent.includes('54px'), 'Deve conter altura ou dimensão do modo Pill (54px)');
    assert.ok(cssContent.includes('180px'), 'Deve conter altura ou dimensão do modo Expanded (180px)');
  });
}

// -----------------------------------------------------------------------------
// Resumo Geral
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL DE TESTES: ${passCount + failCount}`);
console.log(`PASSOU:          ${passCount}`);
console.log(`FALHOU:          ${failCount}`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('[SUCESSO] Todos os testes de DOM e Estilos passaram com sucesso!');
  process.exit(0);
}
