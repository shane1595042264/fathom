/*
 * FATHOM — "juice": screen feel & horror post-processing.
 *
 * Holds transient effect state (shake, flash, threat level, scare timers) and
 * draws the full-screen overlay: vignette, dread red-out, faux chromatic
 * aberration, film grain, ping flash, the drowning gray-out, the rare creature
 * "face" reveal, and the death wash. All flashing respects the photosensitivity
 * setting (reducedFlashing) and shake respects the screenShake setting.
 */
(function (F) {
  'use strict';

  class Juice {
    constructor() {
      this.shakeMag = 0;
      this.flashAmt = 0; this.flashColor = '255,255,255';
      this.threat = 0;          // 0..1, set by game from nearest entity
      this.faceTimer = 0; this.faceEntity = null;
      this.deathTimer = 0;
      this.grainT = 0;
      this.settings = F.DEFAULT_SETTINGS;
      this._shx = 0; this._shy = 0;
    }

    reset() { this.shakeMag = 0; this.flashAmt = 0; this.threat = 0; this.faceTimer = 0; this.deathTimer = 0; }

    shake(mag) { this.shakeMag = Math.min(22, this.shakeMag + mag); }
    flash(amt, color) { this.flashAmt = Math.max(this.flashAmt, amt); if (color) this.flashColor = color; }
    triggerFace(entity) {
      if (this.settings.reducedFlashing) { this.flash(0.25, '255,59,59'); return; }
      this.faceTimer = 0.55; this.faceEntity = entity; this.flash(0.4, '255,59,59');
    }
    triggerDeath() { this.deathTimer = 1.0; }

    update(dt) {
      this.shakeMag *= Math.exp(-dt * 7);
      if (this.shakeMag < 0.05) this.shakeMag = 0;
      this.flashAmt *= Math.exp(-dt * 6);
      if (this.flashAmt < 0.003) this.flashAmt = 0;
      if (this.faceTimer > 0) this.faceTimer -= dt;
      if (this.deathTimer > 0) this.deathTimer -= dt;
      this.grainT += dt;
      // Compute a shake offset for this frame.
      const s = this.shakeMag * (this.settings.screenShake != null ? this.settings.screenShake : 1);
      this._shx = (Math.random() * 2 - 1) * s;
      this._shy = (Math.random() * 2 - 1) * s;
    }

    get shakeX() { return this._shx; }
    get shakeY() { return this._shy; }

    drawOverlay(ctx, game) {
      const W = F.VIEW.w, H = F.VIEW.h;

      // Dread red-out: a pulsing red vignette that grows with threat.
      if (this.threat > 0.02) {
        const pulse = 0.5 + 0.5 * Math.sin(this.grainT * (4 + this.threat * 8));
        const a = this.threat * (0.28 + 0.22 * pulse);
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.75);
        const col = F.dangerRGB(this.settings);
        g.addColorStop(0, `rgba(${col},0)`);
        g.addColorStop(1, `rgba(${col},${a})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      // Faux chromatic aberration at high threat (offset vignette rings).
      if (this.threat > 0.45 && !this.settings.reducedFlashing) {
        const off = (this.threat - 0.45) * 10;
        ctx.globalCompositeOperation = 'screen';
        for (const [dx, color] of [[-off, 'rgba(255,0,40,0.10)'], [off, 'rgba(0,180,255,0.10)']]) {
          const g = ctx.createRadialGradient(W / 2 + dx, H / 2, H * 0.45, W / 2 + dx, H / 2, H * 0.7);
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, color);
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // Permanent soft vignette for the "deep" look.
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      // Drowning gray-out (low oxygen).
      if (game && game.oxygen && game.oxygen.critical) {
        const k = F.M.clamp(1 - game.oxygen.air / F.CONFIG.oxygen.criticalThreshold, 0, 1);
        ctx.fillStyle = `rgba(120,130,140,${k * 0.5})`;
        ctx.fillRect(0, 0, W, H);
        // closing iris
        const r = H * (0.75 - k * 0.45);
        const ir = ctx.createRadialGradient(W / 2, H / 2, r * 0.6, W / 2, H / 2, r);
        ir.addColorStop(0, 'rgba(0,0,0,0)'); ir.addColorStop(1, `rgba(0,0,0,${k * 0.85})`);
        ctx.fillStyle = ir; ctx.fillRect(0, 0, W, H);
      }

      // Film grain — cheap: scatter faint dots.
      this._grain(ctx, W, H);

      // Ping / event flash.
      if (this.flashAmt > 0.004) {
        const a = this.settings.reducedFlashing ? this.flashAmt * 0.35 : this.flashAmt;
        ctx.fillStyle = `rgba(${this.flashColor},${a * 0.5})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Death wash — drawn BEFORE the face so the signature reveal stays legible
      // on the kill frame instead of being buried under the red sheet.
      if (this.deathTimer > 0) {
        const k = this.deathTimer;
        ctx.fillStyle = `rgba(${this.settings.reducedFlashing ? '20,0,0' : '120,0,0'},${F.M.clamp(k, 0, 1) * 0.9})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Rare creature face reveal (drawn last so death + ping reveals both read).
      if (this.faceTimer > 0 && this.faceEntity) this._drawFace(ctx, W, H);
    }

    _grain(ctx, W, H) {
      ctx.save();
      ctx.globalAlpha = 0.045;
      ctx.fillStyle = '#fff';
      // Deterministic-ish scatter that shifts each frame.
      let s = (this.grainT * 9973) | 0;
      const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      for (let i = 0; i < 130; i++) {
        ctx.fillRect((rnd() * W) | 0, (rnd() * H) | 0, 1, 1);
      }
      ctx.restore();
    }

    // A jagged, wet, eyeless face filling the screen — abstract on purpose.
    _drawFace(ctx, W, H) {
      const k = F.M.clamp(this.faceTimer / 0.55, 0, 1);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(8,0,0,0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.translate(W / 2, H / 2);
      const scale = 1.1 - k * 0.15;
      ctx.scale(scale, scale);
      // head silhouette
      ctx.fillStyle = '#140003';
      ctx.beginPath(); ctx.ellipse(0, 0, 190, 240, 0, 0, F.M.TAU); ctx.fill();
      // sunken eyes
      ctx.fillStyle = '#ff2a2a';
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 40;
      for (const ex of [-72, 72]) { ctx.beginPath(); ctx.ellipse(ex, -50, 26, 16, 0, 0, F.M.TAU); ctx.fill(); }
      // gaping maw with needle teeth
      ctx.shadowBlur = 0; ctx.fillStyle = '#020000';
      ctx.beginPath(); ctx.ellipse(0, 110, 80, 64, 0, 0, F.M.TAU); ctx.fill();
      ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 3;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * 22, 60); ctx.lineTo(i * 22 + 6, 150); ctx.stroke();
      }
      ctx.restore();
    }
  }

  F.Juice = Juice;
})(window.FATHOM = window.FATHOM || {});
