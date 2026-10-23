### Task 4: Sincronização Bidirecional de Mídia & Controles de Música

**Files:**
- Modify: `C:\Users\03573608183\youtube-loop-extension\content.js`
- Test: `C:\Users\03573608183\youtube-loop-extension\test-playback-sync.js`

**Interfaces:**
- Consumes: `<video>`, `.ytp-next-button`, `.ytp-prev-button`, `YouTubeLooperCore.toggleLoopState`, `YouTubeLooperCore.getLoopState`
- Produces: `MiniPlayerController`:
  - `bindWindowEvents(doc)`: associa eventos de clique e arrasto aos elementos da janela PiP.
  - `syncPlaybackState(doc)`: sincroniza Play/Pause e Loop no PiP de acordo com o vídeo da página.
  - `syncTimeAndProgress(doc)`: sincroniza tempos (`01:23 / 04:00`) e slider de progresso em tempo real (`timeupdate`).
  - `updateMetadata()`: atualiza título, canal e thumbnail na janela PiP aberta quando a música mudar (ex: navegação SPA).
  - Exportado em `YouTubeLooperCore.MiniPlayerController`.

- [x] **Step 1: Escrever teste de unidade para sincronização de controles (TDD RED)**
- [x] **Step 2: Executar teste e validar falha (TDD RED)**
- [x] **Step 3: Implementar sincronização bidirecional em `content.js`**
- [x] **Step 4: Executar teste para validar passagem (TDD GREEN)**
- [x] **Step 5: Executar todas as suítes de regressão**
- [x] **Step 6: Commit das alterações**

```bash
git add content.js test-playback-sync.js
git commit -m "feat(miniplayer): connect bidirectional media controls, track navigation and seek"
```
