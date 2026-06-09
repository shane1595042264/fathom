/*
 * FATHOM — main menu. Title in the dark, a slow sonar pulse sweeping abstract
 * geometry, and something that drifts at the edge of the light. Keyboard,
 * gamepad and mouse all navigate.
 */
(function (F) {
  'use strict';

  class MenuScene extends F.Scene {
    enter() {
      this.sel = 0;
      this.t = 0;
      this.rings = [];
      this.ringTimer = 0.2;
      this.lurkAng = Math.random() * F.M.TAU;
      this.best = F.Storage.bestScore();
      this.meta = F.Storage.loadMeta();
      this.items = [{ label: 'DESCEND', a: 'play' }, { label: 'HOW TO SURVIVE', a: 'howto' }, { label: 'SETTINGS', a: 'settings' }];
      if (F.isElectron) this.items.push({ label: 'QUIT', a: 'quit' });
      this._itemRects = [];
    }

    act(a) {
      F.Audio.uiSelect();
      if (a === 'play') F.SM.go('game', { reset: true });
      else if (a === 'howto') F.SM.go('howto', { from: 'menu' });
      else if (a === 'settings') F.SM.go('settings', { from: 'menu' });
      else if (a === 'quit' && window.fathomNative) window.fathomNative.quit();
    }

    update(dt) {
      const I = F.Input;
      F.Audio.setTension(0); // no heartbeat at the surface
      this.t += dt;
      this.ringTimer -= dt;
      if (this.ringTimer <= 0) { this.ringTimer = 2.4 + Math.random() * 1.5; this.rings.push({ x: F.VIEW.w * (0.2 + Math.random() * 0.6), y: F.VIEW.h * (0.2 + Math.random() * 0.6), r: 0 }); }
      for (let i = this.rings.length - 1; i >= 0; i--) { this.rings[i].r += 120 * dt; if (this.rings[i].r > 900) this.rings.splice(i, 1); }
      this.lurkAng += dt * 0.15;

      if (I.pressed('up')) { this.sel = (this.sel - 1 + this.items.length) % this.items.length; F.Audio.uiMove(); }
      if (I.pressed('down')) { this.sel = (this.sel + 1) % this.items.length; F.Audio.uiMove(); }
      if (I.pressed('confirm')) this.act(this.items[this.sel].a);

      // Mouse hover + click.
      if (I.pointer.moved) {
        for (let i = 0; i < this._itemRects.length; i++) {
          const r = this._itemRects[i];
          if (I.pointer.x > r.x0 && I.pointer.x < r.x1 && I.pointer.y > r.y0 && I.pointer.y < r.y1) { if (this.sel !== i) F.Audio.uiMove(); this.sel = i; }
        }
      }
      if (I.pointerClicked()) {
        const r = this._itemRects[this.sel];
        if (r && I.pointer.x > r.x0 && I.pointer.x < r.x1 && I.pointer.y > r.y0 && I.pointer.y < r.y1) this.act(this.items[this.sel].a);
      }
    }

    draw(ctx) {
      const W = F.VIEW.w, H = F.VIEW.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

      // ambient rings
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const r of this.rings) {
        const a = F.M.clamp(1 - r.r / 900, 0, 1) * 0.18;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, F.M.TAU);
        ctx.strokeStyle = `rgba(127,233,255,${a})`; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();

      // lurking silhouette drifting in the deep
      const lx = W / 2 + Math.cos(this.lurkAng) * 280, ly = H * 0.66 + Math.sin(this.lurkAng * 1.3) * 70;
      ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = '#ff3b3b';
      ctx.translate(lx, ly);
      ctx.beginPath(); for (let i = 0; i <= 12; i++) { const aa = i / 12 * F.M.TAU; const rr = 22 * (i % 2 ? 0.5 : 1); const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fill();
      ctx.restore();

      F.UI.title(ctx, 'FATHOM', W / 2, H * 0.30, 64, 0.95);
      F.UI.text(ctx, 'you are blind in the deep', W / 2, H * 0.30 + 56, 14, 0.4);

      // menu
      const cy = H * 0.56, gap = 42;
      F.UI.menu(ctx, this.items, this.sel, W / 2, cy, gap);
      this._itemRects = this.items.map((_, i) => ({ x0: W / 2 - 160, x1: W / 2 + 160, y0: cy + i * gap - 18, y1: cy + i * gap + 18 }));

      // footer
      F.UI.text(ctx, this.best > 0 ? `BEST  ${this.best}    ·    DEEPEST  ${this.meta.deepest}` : 'no survivors yet', W / 2, H - 54, 13, 0.45);
      F.UI.text(ctx, 'headphones on  ·  arrows / WASD + Enter  ·  v' + F.VERSION, W / 2, H - 26, 11, 0.28);

      // vignette
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  F.SM.register('menu', new MenuScene());
})(window.FATHOM = window.FATHOM || {});
