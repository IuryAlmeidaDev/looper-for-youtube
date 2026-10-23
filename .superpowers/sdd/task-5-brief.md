### Task 5: Botão Nativo no Player do YouTube (`.ytp-pip-button`) e Atalho `Shift + P`

**Files:**
- Modify: `C:\Users\03573608183\youtube-loop-extension\content.js`
- Modify: `C:\Users\03573608183\youtube-loop-extension\content.css`
- Test: `C:\Users\03573608183\youtube-loop-extension\test-pip-trigger.js`

**Interfaces:**
- Produces:
  - `createPipButton()`: cria o elemento `<button class="ytp-button ytp-pip-button" ...>` com ícone SVG de PiP, `title="Mini Player Flutuante (Shift+P)"` e `aria-label="Mini Player Flutuante (Shift+P)"`.
  - `injectPipButton(leftControls)`: injeta o botão em `.ytp-left-controls` imediatamente após o `.ytp-loop-button` (ou `.ytp-play-button`), garantindo idempotência (não duplica se já existir).
  - Atualização de `handleKeyDown(e)`: captura `Shift + P` (tecla `'P'` ou `'p'`, `e.shiftKey === true`, `!e.ctrlKey && !e.altKey && !e.metaKey`), protege contra digitação (`isTextInputElement`), invoca `MiniPlayerController.open()` e previne comportamento padrão (`e.preventDefault()`).
  - Exportado em `YouTubeLooperCore.createPipButton` e `YouTubeLooperCore.injectPipButton`.

- [ ] **Step 1: Escrever teste de unidade para o botão de ativação e atalho (TDD RED)**

Criar `C:\Users\03573608183\youtube-loop-extension\test-pip-trigger.js`:
Validar:
1. `createPipButton()` retorna botão com classes `.ytp-button` e `.ytp-pip-button`, atributo `aria-label` e ícone SVG.
2. `injectPipButton(leftControls)` injeta o botão no container de controles à esquerda e previne duplicação se chamado múltiplas vezes (idempotência).
3. Clicar no botão injetado aciona `MiniPlayerController.open()`.
4. Atalho de teclado `Shift + P`:
   - Aciona `MiniPlayerController.open()`.
   - Ignorado quando focado em `<input>`, `<textarea>` ou elemento editável (`isTextInputElement`).
   - Ignora combinações com `Ctrl` ou `Alt` (ex: `Ctrl+Shift+P`).
5. Estilos em `content.css`:
   - Seletores para `.ytp-pip-button`, hover e transições.

- [ ] **Step 2: Executar teste e validar falha (TDD RED)**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-pip-trigger.js`
Expected: FAIL (funções e estilos ainda não implementados)

- [ ] **Step 3: Implementar injeção do botão e listener do atalho em `content.js` e estilos em `content.css`**

- Inserir `.ytp-pip-button` logo após `.ytp-loop-button`.
- Adicionar estilos em `content.css` para `.ytp-button.ytp-pip-button` com opacidade, escala no hover e alinhamento com a barra do YouTube.
- Integrar `injectPipButton` ao ciclo de detecção do player (`setupObserver` e `initLoopExtension`).
- Integrar atalho `Shift + P` em `handleKeyDown`.
- Exportar em `YouTubeLooperCore`.

- [ ] **Step 4: Executar teste para validar passagem (TDD GREEN)**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-pip-trigger.js`
Expected: PASS

- [ ] **Step 5: Executar todas as suítes de regressão**

Run:
```bash
node C:\Users\03573608183\youtube-loop-extension\test-pip-trigger.js
node C:\Users\03573608183\youtube-loop-extension\test-playback-sync.js
node C:\Users\03573608183\youtube-loop-extension\test-pip-manager.js
node C:\Users\03573608183\youtube-loop-extension\test-miniplayer-dom.js
node C:\Users\03573608183\youtube-loop-extension\test-ad-destroyer.js
node C:\Users\03573608183\youtube-loop-extension\test-extension.js
```
Expected: Todas as 6 suítes verdes (100% PASS).

- [ ] **Step 6: Commit das alterações**

```bash
git add content.js content.css test-pip-trigger.js
git commit -m "feat(miniplayer): add native player trigger button and Shift+P keyboard shortcut"
```
