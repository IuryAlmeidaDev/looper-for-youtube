### Task 3: Gerenciador da Janela Document Picture-in-Picture

**Files:**
- Modify: `C:\Users\03573608183\youtube-loop-extension\manifest.json`
- Modify: `C:\Users\03573608183\youtube-loop-extension\content.js`
- Test: `C:\Users\03573608183\youtube-loop-extension\test-pip-manager.js`

**Interfaces:**
- Produces: `MiniPlayerController`:
  - Propriedades: `pipWindow`, `isPillMode`
  - Métodos:
    - `async open()`
    - `close()`
    - `async toggleMode()`
    - `async loadModePreference()`
    - `async saveModePreference(isPill)`
    - `getTrackMetadata()`: extrai `{ title, channel, thumbnail, currentTime, duration, isPlaying }` do player
  - Exportado em `YouTubeLooperCore.MiniPlayerController`

- [ ] **Step 1: Declarar `miniplayer.css` em `web_accessible_resources` no `manifest.json`**

Em `manifest.json`, adicionar:
```json
  "web_accessible_resources": [
    {
      "resources": [
        "miniplayer.css"
      ],
      "matches": [
        "https://www.youtube.com/*"
      ]
    }
  ]
```

- [ ] **Step 2: Escrever teste de unidade para o `MiniPlayerController` (TDD RED)**

Criar `C:\Users\03573608183\youtube-loop-extension\test-pip-manager.js`:
Criar ambiente simulado com mock de `window.documentPictureInPicture.requestWindow` e mock do `chrome.storage.local`.
Validar:
1. `open()` abre a janela com dimensões corretas (Pill: 340x54, Expanded: 360x180) e injeta estilos e HTML.
2. `open()` quando a janela já está aberta invoca `focus()`.
3. `toggleMode()` alterna entre Pill e Expanded, salva preferência no storage e re-renderiza o DOM da janela.
4. `close()` fecha a janela PiP e redefine `pipWindow = null`.
5. Suporte a fallback seguro quando `window.documentPictureInPicture` for `undefined` (não lança exceção não tratada).

- [ ] **Step 3: Executar teste e verificar falha (TDD RED)**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-pip-manager.js`
Expected: FAIL (MiniPlayerController ainda não implementado)

- [ ] **Step 4: Implementar `MiniPlayerController` em `content.js`**

Implementar:
- Constante `STORAGE_KEY_PIP_MODE = 'yt_looper_pip_mode'`
- Extração resiliente de metadados de vídeo (`getTrackMetadata`):
  - Título: `document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string')?.textContent?.trim()` ou `document.title.replace(' - YouTube', '').trim()`
  - Canal: `document.querySelector('#channel-name a, ytd-channel-name a')?.textContent?.trim()`
  - Miniatura: ID extraído da URL (`v=ID`) -> `https://i.ytimg.com/vi/${id}/hqdefault.jpg` com fallback
- Gerenciamento de ciclo de vida da janela (`open`, `toggleMode`, `close`)
- Listener `pagehide` na janela PiP para limpar referência de forma idempotente
- Listener `beforeunload` na janela principal para fechar o PiP graciosamente se a aba for fechada
- Exportação em `YouTubeLooperCore.MiniPlayerController`

- [ ] **Step 5: Executar teste de unidade (TDD GREEN)**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-pip-manager.js`
Expected: PASS

- [ ] **Step 6: Executar suítes de regressão**

Run:
```bash
node C:\Users\03573608183\youtube-loop-extension\test-ad-destroyer.js
node C:\Users\03573608183\youtube-loop-extension\test-miniplayer-dom.js
node C:\Users\03573608183\youtube-loop-extension\test-extension.js
```
Expected: Todas as suítes verdes (31/31 no test-extension.js).
*(Atenção: se `test-extension.js` tiver asserção sobre arquivos referenciados no manifest, certifique-se de que `miniplayer.css` passa sem problemas).*

- [ ] **Step 7: Commit das alterações**

```bash
git add manifest.json content.js test-pip-manager.js
git commit -m "feat(miniplayer): implement Document Picture-in-Picture window manager and persistence"
```
