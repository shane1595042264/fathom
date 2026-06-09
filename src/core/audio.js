/*
 * FATHOM — procedural audio engine (Web Audio API).
 *
 * Every sound is synthesised at runtime: there are no audio asset files to ship
 * or license. In a game played in darkness, audio IS the gameplay — the creature
 * is heard before it is seen — so this module is as important as the renderer.
 *
 * Buses:  source -> sfxBus/musicBus -> master -> destination
 * The continuous ambience (sub drone + water noise + a "dread" layer that swells
 * with the entity's proximity) runs for the whole session; one-shots are spawned
 * on demand. A stereo panner gives directional cues for the creature's voice.
 */
(function (F) {
  'use strict';

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.ready = false;
      this.enabled = true;
      this.settings = Object.assign({}, F.DEFAULT_SETTINGS);
      this._noiseBuf = null;
      this._tension = 0;       // 0..1, set by the game each frame
      this._hbTimer = 0;       // heartbeat scheduler
      this._submerged = 0;     // muffle factor 0..1 (drowning)
      this._ambienceOn = false;
    }

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      const ctx = this.ctx = new AC();

      this.master = ctx.createGain();
      this.master.gain.value = this.settings.masterVolume;
      this.master.connect(ctx.destination);

      // Gentle limiter so loud stingers don't clip painfully.
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -6;
      this.limiter.knee.value = 8;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.25;
      this.limiter.connect(this.master);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.settings.sfxVolume;
      this.sfxBus.connect(this.limiter);

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.settings.musicVolume;
      this.musicBus.connect(this.limiter);

      // Global muffle filter for the "drowning" effect (drops highs as you suffocate).
      this.muffle = ctx.createBiquadFilter();
      this.muffle.type = 'lowpass';
      this.muffle.frequency.value = 20000;
      this.muffle.connect(this.limiter);
      this.sfxThroughMuffle = ctx.createGain();
      this.sfxThroughMuffle.connect(this.muffle);

      // Shared sonar echo (delay+feedback) for ping returns.
      this.echo = ctx.createDelay(1.0);
      this.echo.delayTime.value = 0.26;
      this.echoFb = ctx.createGain();
      this.echoFb.gain.value = 0.42;
      this.echoLp = ctx.createBiquadFilter();
      this.echoLp.type = 'lowpass';
      this.echoLp.frequency.value = 1400;
      this.echo.connect(this.echoLp); this.echoLp.connect(this.echoFb); this.echoFb.connect(this.echo);
      this.echoLp.connect(this.sfxBus);

      // Pre-render 2 s of white noise for reuse.
      const len = Math.floor(ctx.sampleRate * 2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;

      this.ready = true;
      this._buildAmbience();
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    applySettings(s) {
      this.settings = s;
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(s.masterVolume, t, 0.05);
      this.sfxBus.gain.setTargetAtTime(s.sfxVolume, t, 0.05);
      this.musicBus.gain.setTargetAtTime(s.musicVolume, t, 0.05);
    }

    // ---------- helpers ----------
    _now() { return this.ctx.currentTime; }
    _noise() { const s = this.ctx.createBufferSource(); s.buffer = this._noiseBuf; s.loop = true; return s; }
    _panner(pan) { const p = this.ctx.createStereoPanner(); p.pan.value = F.M.clamp(pan, -1, 1); return p; }

    // Direction/distance -> stereo pan & gain, relative to player & view.
    panFor(x, y, px, py, maxDist) {
      const dx = x - px, dy = y - py;
      const dist = Math.hypot(dx, dy);
      const pan = F.M.clamp(dx / (F.VIEW.w * 0.55), -1, 1);
      const gain = F.M.clamp(1 - dist / (maxDist || 900), 0, 1);
      return { pan, gain, dist };
    }

    // ---------- continuous ambience ----------
    _buildAmbience() {
      const ctx = this.ctx, t = this._now();

      // Sub drone: a few detuned low oscillators -> lowpass.
      this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0.0;
      const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 220;
      this.droneGain.connect(dlp); dlp.connect(this.musicBus);
      [41, 41.4, 61.5].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = i === 2 ? 0.18 : 0.32;
        o.connect(g); g.connect(this.droneGain); o.start();
      });

      // Water noise: brown-ish noise through a slow-moving bandpass.
      this.waterGain = ctx.createGain(); this.waterGain.gain.value = 0.0;
      const wn = this._noise();
      const wbp = ctx.createBiquadFilter(); wbp.type = 'bandpass'; wbp.frequency.value = 320; wbp.Q.value = 0.6;
      const wlp = ctx.createBiquadFilter(); wlp.type = 'lowpass'; wlp.frequency.value = 900;
      wn.connect(wbp); wbp.connect(wlp); wlp.connect(this.waterGain); this.waterGain.connect(this.musicBus);
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.07;
      const lfoG = ctx.createGain(); lfoG.gain.value = 140;
      lfo.connect(lfoG); lfoG.connect(wbp.frequency); lfo.start(); wn.start();

      // Dread layer: a dissonant minor cluster whose gain tracks tension.
      this.dreadGain = ctx.createGain(); this.dreadGain.gain.value = 0.0;
      const dclp = ctx.createBiquadFilter(); dclp.type = 'lowpass'; dclp.frequency.value = 600;
      this.dreadGain.connect(dclp); dclp.connect(this.musicBus);
      [110, 138.6, 146.8].forEach((f) => { // A2, C#3-ish, D3 — uneasy
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = 0.14;
        const trem = ctx.createOscillator(); trem.type = 'sine'; trem.frequency.value = 4.6 + Math.random();
        const tremG = ctx.createGain(); tremG.gain.value = 0.05;
        trem.connect(tremG); tremG.connect(g.gain); trem.start();
        o.connect(g); g.connect(this.dreadGain); o.start();
      });
    }

    startAmbience() {
      if (!this.ready || this._ambienceOn) return;
      this._ambienceOn = true;
      const t = this._now();
      this.droneGain.gain.setTargetAtTime(0.5, t, 2.0);
      this.waterGain.gain.setTargetAtTime(0.35, t, 2.0);
    }
    stopAmbience() {
      if (!this.ready || !this._ambienceOn) return;
      this._ambienceOn = false;
      const t = this._now();
      this.droneGain.gain.setTargetAtTime(0.0, t, 1.0);
      this.waterGain.gain.setTargetAtTime(0.0, t, 1.0);
      this.dreadGain.gain.setTargetAtTime(0.0, t, 1.0);
    }

    setTension(v) { this._tension = F.M.clamp(v, 0, 1); }
    setSubmerged(v) {
      this._submerged = F.M.clamp(v, 0, 1);
      if (!this.ready) return;
      const freq = F.M.lerp(20000, 500, this._submerged);
      this.muffle.frequency.setTargetAtTime(freq, this._now(), 0.1);
    }

    update(dt) {
      if (!this.ready || !this._ambienceOn) return;
      const t = this._now();
      // Dread swells with tension.
      this.dreadGain.gain.setTargetAtTime(0.02 + this._tension * 0.5, t, 0.3);
      // Heartbeat: a faint slow pulse always idles, quickening as tension rises.
      if (this._tension > 0.04) {
        this._hbTimer -= dt;
        if (this._hbTimer <= 0) {
          const interval = F.M.lerp(1.15, 0.34, this._tension);
          this._hbTimer = interval;
          this._heartbeat(0.25 + this._tension * 0.75);
        }
      } else { this._hbTimer = 0; }
    }

    // ---------- one-shot SFX ----------
    _env(node, t, peak, attack, release, dest) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
      node.connect(g); g.connect(dest || this.sfxBus);
      return g;
    }

    ping() {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.22);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
      o.connect(bp);
      const g = this._env(bp, t, 0.5, 0.006, 0.9, this.sfxBus);
      g.connect(this.echo); // sonar return tail
      o.start(t); o.stop(t + 1.0);
      // bright transient
      const n = this._noise(); const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2000;
      n.connect(nf); this._env(nf, t, 0.12, 0.002, 0.05); n.start(t); n.stop(t + 0.08);
    }

    bump(strength) {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      this._env(o, t, 0.4 * F.M.clamp(strength, 0.3, 1), 0.004, 0.18, this.sfxThroughMuffle);
      o.start(t); o.stop(t + 0.25);
      const n = this._noise(); const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 400;
      n.connect(nf); this._env(nf, t, 0.18 * strength, 0.003, 0.08); n.start(t); n.stop(t + 0.12);
    }

    gasp() {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      // Inhale: filtered noise sweeping up.
      const n = this._noise();
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(1800, t + 0.3);
      n.connect(bp); this._env(bp, t, 0.4, 0.04, 0.4, this.sfxThroughMuffle);
      n.start(t); n.stop(t + 0.5);
    }

    beacon() {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      [0, 0.09].forEach((dt2, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = i ? 1175 : 784; // G5, D6
        this._env(o, t + dt2, 0.3, 0.005, 0.5); o.start(t + dt2); o.stop(t + dt2 + 0.6);
      });
    }

    descend() {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(55, t + 1.2);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
      o.connect(lp); this._env(lp, t, 0.3, 0.05, 1.3, this.musicBus); o.start(t); o.stop(t + 1.5);
    }

    // The creature's groan. pan/dist01 give it a position in space.
    entityVoice(pan, dist01) {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      const p = this._panner(pan);
      const out = ctx.createGain(); out.gain.value = F.M.clamp(1 - dist01, 0.05, 1) * 0.8;
      p.connect(out); out.connect(this.sfxThroughMuffle);
      const base = 58 + Math.random() * 14;
      [base, base * 1.007, base * 0.5].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = i === 2 ? 'sine' : 'sawtooth'; o.frequency.value = f;
        const wob = ctx.createOscillator(); wob.type = 'sine'; wob.frequency.value = 5 + Math.random() * 3;
        const wobG = ctx.createGain(); wobG.gain.value = 3.5; wob.connect(wobG); wobG.connect(o.frequency); wob.start();
        const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 320;
        o.connect(bp); this._env(bp, t, 0.5, 0.08, 1.1, p); o.start(t); o.stop(t + 1.3);
      });
      // breathy growl noise
      const n = this._noise(); const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 240; nf.Q.value = 2;
      n.connect(nf); this._env(nf, t, 0.18, 0.1, 0.9, p); n.start(t); n.stop(t + 1.1);
    }

    _heartbeat(vol) {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      const beat = (at, v) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(64, at); o.frequency.exponentialRampToValueAtTime(38, at + 0.12);
        this._env(o, at, v, 0.006, 0.16, this.musicBus); o.start(at); o.stop(at + 0.25);
      };
      beat(t, 0.5 * vol); beat(t + 0.14, 0.34 * vol);
    }

    death() {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      // Sub impact.
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.5);
      this._env(o, t, 0.95, 0.002, 0.7, this.sfxBus); o.start(t); o.stop(t + 0.9);
      // Screech: dissonant detuned cluster, descending.
      [1320, 1397, 1480].forEach((f) => {
        const s = ctx.createOscillator(); s.type = 'sawtooth';
        s.frequency.setValueAtTime(f, t); s.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.6);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 4;
        s.connect(bp); this._env(bp, t, 0.3, 0.003, 0.55, this.sfxBus); s.start(t); s.stop(t + 0.7);
      });
      // Noise burst.
      const n = this._noise(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
      n.connect(hp); this._env(hp, t, 0.5, 0.002, 0.4, this.sfxBus); n.start(t); n.stop(t + 0.45);
    }

    stinger() { // sharp "you've been noticed" sound when the entity locks onto you
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      [523, 554].forEach((f) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 5;
        o.connect(bp); this._env(bp, t, 0.22, 0.004, 0.5, this.sfxBus); o.start(t); o.stop(t + 0.6);
      });
    }

    // The committed final strike — a fast rising surge with a noise punch.
    lunge() {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(920, t + 0.13);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
      o.connect(bp); this._env(bp, t, 0.4, 0.004, 0.22, this.sfxBus); o.start(t); o.stop(t + 0.3);
      const n = this._noise(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
      n.connect(hp); this._env(hp, t, 0.25, 0.002, 0.15); n.start(t); n.stop(t + 0.18);
    }

    // The rare face-reveal: a short, sharp, distinct screech (not the ambient groan).
    faceScare(pan) {
      if (!this.ready) return;
      const ctx = this.ctx, t = this._now();
      const p = this._panner(pan || 0); p.connect(this.sfxBus);
      [740, 783, 988].forEach((f) => {
        const s = ctx.createOscillator(); s.type = 'sawtooth';
        s.frequency.setValueAtTime(f * 1.5, t); s.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.4);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 6;
        s.connect(bp); this._env(bp, t, 0.3, 0.003, 0.38, p); s.start(t); s.stop(t + 0.45);
      });
      const n = this._noise(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
      n.connect(hp); this._env(hp, t, 0.22, 0.002, 0.2, p); n.start(t); n.stop(t + 0.25);
    }

    uiMove() { if (!this.ready) return; const t = this._now(); const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 420; this._env(o, t, 0.12, 0.004, 0.08); o.start(t); o.stop(t + 0.12); }
    uiSelect() { if (!this.ready) return; const t = this._now(); const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(660, t + 0.1); this._env(o, t, 0.18, 0.004, 0.18); o.start(t); o.stop(t + 0.25); }
  }

  F.Audio = new AudioEngine();
})(window.FATHOM = window.FATHOM || {});
