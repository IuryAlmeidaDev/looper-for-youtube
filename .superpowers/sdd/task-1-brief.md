### Task 1: Motor Ad Destroyer (Zero Anúncios)

**Files:**
- Modify: `C:\Users\03573608183\youtube-loop-extension\content.js`
- Modify: `C:\Users\03573608183\youtube-loop-extension\content.css`
- Test: `C:\Users\03573608183\youtube-loop-extension\test-ad-destroyer.js`

**Interfaces:**
- Produces: `YouTubeLooperCore.AdDestroyer`: `{ init(), checkAndDestroyAds(), restoreAudio() }`

- [ ] **Step 1: Escrever teste de unidade para o AdDestroyer**

Criar arquivo `C:\Users\03573608183\youtube-loop-extension\test-ad-destroyer.js`:
```javascript
const assert = require('assert');

// Mock do ambiente de player e vídeo com anúncio
const video = {
  muted: false,
  playbackRate: 1.0,
  currentTime: 0,
  duration: 30,
  playCount: 0,
  play() { this.playCount++; return Promise.resolve(); }
};

let skipClicked = false;
const playerContainer = {
  classList: new Set(['html5-video-player', 'ad-showing']),
  querySelector(selector) {
    if (selector.includes('skip-button') || selector.includes('skip-ad')) {
      return { click() { skipClicked = true; } };
    }
    return null;
  }
};

const AdDestroyer = {
  savedVolume: 1,
  savedMuted: false,
  isHandlingAd: false,

  checkAndDestroyAds(container, vid) {
    if (!container || !vid) return;
    const isAd = (container.classList && (
      (container.classList.contains && (container.classList.contains('ad-showing') || container.classList.contains('ad-interrupting'))) ||
      (container.classList.has && (container.classList.has('ad-showing') || container.classList.has('ad-interrupting')))
    ));
    if (isAd) {
      if (!this.isHandlingAd) {
        this.savedMuted = vid.muted;
        this.isHandlingAd = true;
      }
      vid.muted = true;
      vid.playbackRate = 16.0;
      if (isFinite(vid.duration)) {
        vid.currentTime = vid.duration;
      }
      const skipBtn = container.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
      if (skipBtn) skipBtn.click();
    } else if (this.isHandlingAd) {
      vid.muted = this.savedMuted;
      vid.playbackRate = 1.0;
      this.isHandlingAd = false;
    }
  }
};

// Teste 1: Detecção e eliminação de anúncio
AdDestroyer.checkAndDestroyAds(playerContainer, video);
assert.strictEqual(video.muted, true, 'Vídeo deve estar mutado durante o anúncio');
assert.strictEqual(video.playbackRate, 16.0, 'Taxa de reprodução deve ser 16x');
assert.strictEqual(video.currentTime, 30, 'Vídeo deve ser avançado para o final');
assert.strictEqual(skipClicked, true, 'Botão de pular anúncio deve ser acionado');

// Teste 2: Retorno para vídeo normal
playerContainer.classList.delete('ad-showing');
AdDestroyer.checkAndDestroyAds(playerContainer, video);
assert.strictEqual(video.muted, false, 'Volume/mute anterior deve ser restaurado');
assert.strictEqual(video.playbackRate, 1.0, 'Taxa normal 1.0x restaurada');
assert.strictEqual(AdDestroyer.isHandlingAd, false, 'Estado de anúncio finalizado');

console.log('[PASS] AdDestroyer test suite concluído com sucesso!');
```

- [ ] **Step 2: Executar teste para verificar comportamento**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-ad-destroyer.js`
Expected: `[PASS] AdDestroyer test suite concluído com sucesso!`

- [ ] **Step 3: Adicionar regras CSS inibidoras em `content.css`**

Em `C:\Users\03573608183\youtube-loop-extension\content.css`, adicionar ao final:
```css
/* --------------------------------------------------------------------------
   Ad Destroyer: Inibição de banners, popups e elementos promocionais
   -------------------------------------------------------------------------- */
.ytp-ad-overlay-container,
.ytp-ad-message-container,
#player-ads,
.ytd-ad-slot-renderer,
ytd-promoted-sparkles-web-renderer,
ytd-display-ad-renderer,
ytd-player-legacy-desktop-watch-ads-renderer {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
```

- [ ] **Step 4: Integrar módulo `AdDestroyer` no `content.js`**

Em `C:\Users\03573608183\youtube-loop-extension\content.js`:
Adicionar objeto `AdDestroyer` e invocá-lo no observer de mutação e em um loop de timer leve (`setInterval` de 250ms).
Exportar no `YouTubeLooperCore`.

- [ ] **Step 5: Executar testes de regressão do projeto**

Run: `node C:\Users\03573608183\youtube-loop-extension\test-extension.js`
Expected: 31/31 PASS

- [ ] **Step 6: Commit das alterações**

```bash
git add content.js content.css test-ad-destroyer.js
git commit -m "feat(ad-destroyer): add silent instant ad-skip and CSS banners inhibition"
```
