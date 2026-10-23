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
  savedPlaybackRate: 1.0,
  isHandlingAd: false,
  checkIntervalId: null,

  init(container, vid) {
    if (this.checkIntervalId) return;
    this.checkIntervalId = setInterval(() => {
      this.checkAndDestroyAds(container, vid);
    }, 250);
    if (this.checkIntervalId && typeof this.checkIntervalId.unref === 'function') {
      this.checkIntervalId.unref();
    }
  },

  restoreAudio(vid) {
    if (vid) {
      vid.muted = this.savedMuted;
      vid.playbackRate = this.savedPlaybackRate || 1.0;
    }
    this.isHandlingAd = false;
  },

  checkAndDestroyAds(container, vid) {
    if (!container || !vid) return;
    const isAd = Boolean(container.classList && (
      (container.classList.contains && (container.classList.contains('ad-showing') || container.classList.contains('ad-interrupting'))) ||
      (container.classList.has && (container.classList.has('ad-showing') || container.classList.has('ad-interrupting')))
    ));
    if (isAd) {
      if (!this.isHandlingAd) {
        this.savedMuted = vid.muted;
        this.savedPlaybackRate = vid.playbackRate || 1.0;
        this.isHandlingAd = true;
      }
      vid.muted = true;
      vid.playbackRate = 16.0;
      if (isFinite(vid.duration)) {
        vid.currentTime = vid.duration;
      }
      const skipBtn = container.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
      if (skipBtn && typeof skipBtn.click === 'function') skipBtn.click();
    } else if (this.isHandlingAd) {
      this.restoreAudio(vid);
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

// Teste 3: Validação da integração com o content.js exportado (YouTubeLooperCore.AdDestroyer)
const YouTubeLooperCore = require('./content.js');
if (YouTubeLooperCore.AdDestroyer) {
  const coreAdDestroyer = YouTubeLooperCore.AdDestroyer;
  assert.strictEqual(typeof coreAdDestroyer.init, 'function', 'AdDestroyer.init deve ser uma função');
  assert.strictEqual(typeof coreAdDestroyer.checkAndDestroyAds, 'function', 'AdDestroyer.checkAndDestroyAds deve ser uma função');
  assert.strictEqual(typeof coreAdDestroyer.restoreAudio, 'function', 'AdDestroyer.restoreAudio deve ser uma função');

  const testVideo = { muted: false, playbackRate: 1.0, currentTime: 0, duration: 45 };
  let testSkipClicked = false;
  const testContainer = {
    classList: new Set(['ad-interrupting']),
    querySelector: () => ({ click: () => { testSkipClicked = true; } })
  };

  coreAdDestroyer.checkAndDestroyAds(testContainer, testVideo);
  assert.strictEqual(testVideo.muted, true, 'coreAdDestroyer: Vídeo mutado durante ad-interrupting');
  assert.strictEqual(testVideo.playbackRate, 16.0, 'coreAdDestroyer: Taxa 16x');
  assert.strictEqual(testVideo.currentTime, 45, 'coreAdDestroyer: Tempo avançado para o fim');
  assert.strictEqual(testSkipClicked, true, 'coreAdDestroyer: Botão skip clicado');

  testContainer.classList.delete('ad-interrupting');
  coreAdDestroyer.checkAndDestroyAds(testContainer, testVideo);
  assert.strictEqual(testVideo.muted, false, 'coreAdDestroyer: Mute restaurado');
  assert.strictEqual(testVideo.playbackRate, 1.0, 'coreAdDestroyer: Taxa 1.0 restaurada');
  assert.strictEqual(coreAdDestroyer.isHandlingAd, false, 'coreAdDestroyer: isHandlingAd false');
}

console.log('[PASS] AdDestroyer test suite concluído com sucesso!');
