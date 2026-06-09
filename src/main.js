/*
 * FATHOM — bootstrap & main loop.
 *
 * Loaded last. Sets up the canvas (fixed 960x600 internal resolution, CSS-scaled
 * to fit any window while preserving aspect), the input system, the persisted
 * settings, and the boot gate (which also satisfies the browser autoplay policy
 * by initialising audio on the first user gesture). Then it runs a clamped
 * variable-timestep loop: update the active scene, update audio, draw.
 */
(function (F) {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  F.ctx = ctx;
  F.canvas = canvas;
  F.isElectron = !!window.fathomNative;

  // Persisted settings shared by every system.
  F.settings = F.Storage.loadSettings();
  F.Audio.settings = F.settings;

  F.Input.init(canvas);

  // ---- responsive scaling (letterboxed, aspect-preserving) ----
  function resize() {
    const aspect = F.VIEW.w / F.VIEW.h;
    let w = window.innerWidth, h = window.innerHeight;
    if (w / h > aspect) w = h * aspect; else h = w / aspect;
    canvas.style.width = Math.round(w) + 'px';
    canvas.style.height = Math.round(h) + 'px';
    const rot = document.getElementById('rotate');
    const portraitPhone = window.innerWidth < 560 && window.innerHeight > window.innerWidth;
    if (rot) rot.style.display = portraitPhone ? 'flex' : 'none';
  }
  window.addEventListener('resize', resize);
  resize();

  // Start a fresh run — routes first-time players through the intro crawl once.
  F.startRun = function () {
    const m = F.Storage.loadMeta();
    if (!m.seenIntro && F.SM.scenes.intro) F.SM.go('intro');
    else F.SM.go('game', { reset: true });
  };

  // ---- boot gate ----
  let started = false;
  function startGame() {
    if (started) return; started = true;
    F.Audio.init();
    F.Audio.resume();
    F.Audio.applySettings(F.settings);
    F.Audio.startAmbience();
    const boot = document.getElementById('boot');
    boot.classList.add('hidden');
    setTimeout(() => boot.classList.add('gone'), 700);
    F.SM.go('menu');
    requestAnimationFrame(loop);
  }
  document.getElementById('boot-start').addEventListener('click', startGame);
  window.addEventListener('keydown', (e) => { if (!started && (e.code === 'Enter' || e.code === 'Space')) startGame(); });

  // Auto-pause when the tab loses focus mid-dive.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && started && F.SM.current === F.SM.scenes.game && !F.SM.overlay && F.SM.scenes.game.state === 'playing') {
      F.SM.pushOverlay('pause');
    }
  });

  // ---- main loop ----
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 1 / 30) dt = 1 / 30;   // clamp: prevents tunneling + multi-edge on lag
    if (dt < 0) dt = 0;

    F.Input.update();
    F.SM.update(dt);
    F.Input.postUpdate();
    F.Audio.update(dt);
    F.SM.draw(ctx);

    requestAnimationFrame(loop);
  }

  // Expose for debugging / the Electron build.
  F.start = startGame;
  console.log('FATHOM v' + F.VERSION + ' ready — click Descend to begin.');
})(window.FATHOM = window.FATHOM || {});
