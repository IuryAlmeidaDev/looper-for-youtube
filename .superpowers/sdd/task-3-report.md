# Task 3 Report: Gerenciador da Janela Document Picture-in-Picture

**Data:** 2026-10-23
**Branch:** `feature/floating-mini-player`
**Commit:** `d14b28d feat(miniplayer): implement Document Picture-in-Picture window manager and persistence`

---

## 1. Escopo e Objetivos Executados

1. **Declaração no `manifest.json`:**
   - Adicionada a seção `web_accessible_resources` para `miniplayer.css` sob o match `https://www.youtube.com/*`, permitindo injeção transparente e em conformidade estrita com o Manifest V3.

2. **Test-Driven Development (TDD):**
   - Criação da suíte `test-pip-manager.js` contendo 14 testes estruturados com mocks para `window.documentPictureInPicture`, `window.location`, DOM do YouTube e `chrome.storage.local`.
   - Fase RED: Execução inicial comprovou falha controlada (14 falhas).
   - Fase GREEN: Após implementação do `MiniPlayerController`, todos os 14 testes passaram com 100% de sucesso.

3. **Implementação do `MiniPlayerController` em `content.js`:**
   - Propriedades de estado: `pipWindow` e `isPillMode`.
   - Extração resiliente de metadados (`getTrackMetadata`): título (DOM ou fallback `document.title`), canal (`#channel-name`), miniatura via ID do vídeo extraído da URL (`v=ID` -> `https://i.ytimg.com/vi/{id}/hqdefault.jpg`) e estado de reprodução (`currentTime`, `duration`, `isPlaying`).
   - Persistência assíncrona (`saveModePreference`, `loadModePreference`) utilizando a chave `yt_looper_pip_mode` em `chrome.storage.local` com fallback para `localStorage`.
   - Gerenciamento de ciclo de vida (`open`, `toggleMode`, `close`):
     - `open()`: abre janela Document PiP com dimensões exatas (Pill: 340x54, Expanded: 360x180), injeta link de estilos `miniplayer.css`, renderiza estrutura HTML via `renderMiniPlayerHTML` e foca em janela já aberta.
     - `toggleMode()`: inverte o modo, redimensiona via `resizeTo(width, height)`, persiste preferência e re-renderiza interface.
     - `close()`: fecha a janela e redefine `pipWindow = null`.
     - Ciclo de vida: escuta `pagehide` no PiP para desalocar referências e `beforeunload` na aba principal para fechar o PiP graciosamente.
     - Fallback seguro: tratamento com retorno `null` caso a API `documentPictureInPicture` não seja suportada pelo navegador.
   - Integração no `YouTubeLooperCore` e reinicialização segura em `_resetState`.

---

## 2. Validação e Cobertura de Testes

- **`test-pip-manager.js`:** 14/14 PASS
  - [SUÍTE 1] Exportação e Interface de MiniPlayerController (2 testes)
  - [SUÍTE 2] Extração Resiliente de Metadados (2 testes)
  - [SUÍTE 3] Persistência de Modo (2 testes)
  - [SUÍTE 4] Abertura e Injeção de Conteúdo da Janela PiP (2 testes)
  - [SUÍTE 5] Alternância Dinâmica de Modo (2 testes)
  - [SUÍTE 6] Fechamento e Limpeza de Referências (3 testes)
  - [SUÍTE 7] Fallback Gracioso sem Document Picture-in-Picture (1 teste)

- **Suítes de Regressão:**
  - `test-ad-destroyer.js`: PASS
  - `test-miniplayer-dom.js`: 19/19 PASS
  - `test-extension.js`: 31/31 PASS

**Total Geral:** 65 testes executados, 65 aprovados (0 falhas).

---

## 3. Próximos Passos
Prosseguir para a **Task 4: Sincronização Bidirecional de Mídia & Controles de Música**, integrando listeners nos botões do Mini Player (Play/Pause, Anterior, Próximo, Repetição e Slider de Progresso) com o player principal do YouTube.
