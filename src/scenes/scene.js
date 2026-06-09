/*
 * FATHOM — scene base class + manager.
 *
 * Scenes are full-screen states (menu, game, settings, game-over). One overlay
 * scene (pause) can sit on top of the game, frozen, while the game stays drawn
 * underneath. The manager also draws a quick fade between scene changes.
 */
(function (F) {
  'use strict';

  class Scene {
    constructor() {}
    enter(params) {}
    exit() {}
    update(dt) {}
    draw(ctx) {}
  }

  class SceneManager {
    constructor() {
      this.scenes = {};
      this.current = null;
      this.overlay = null;
      this.fade = 0;          // black overlay alpha
      this.fadeTarget = 0;
    }
    register(name, scene) { this.scenes[name] = scene; scene.name = name; }

    go(name, params) {
      const next = this.scenes[name];
      if (!next) { console.error('No scene', name); return; }
      if (this.overlay) { this.overlay.exit && this.overlay.exit(); this.overlay = null; }
      if (this.current) this.current.exit();
      this.current = next;
      this.fade = 1; this.fadeTarget = 0;     // fade in
      F.Input.clearLatches();
      next.enter(params || {});
    }

    pushOverlay(name, params) {
      const ov = this.scenes[name]; if (!ov) return;
      F.Input.clearLatches();
      this.overlay = ov; ov.enter(params || {});
    }
    popOverlay() { if (this.overlay) { this.overlay.exit && this.overlay.exit(); this.overlay = null; F.Input.clearLatches(); } }

    update(dt) {
      this.fade = F.M.damp(this.fade, this.fadeTarget, 10, dt);
      if (this.overlay) { this.overlay.update(dt); return; }
      if (this.current) this.current.update(dt);
    }

    draw(ctx) {
      if (this.current) this.current.draw(ctx);
      if (this.overlay) this.overlay.draw(ctx);
      if (this.fade > 0.003) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, F.VIEW.w, F.VIEW.h); }
    }
  }

  // Shared UI helpers for menu-style scenes.
  F.UI = {
    title(ctx, text, x, y, size, alpha) {
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `200 ${size}px "Segoe UI", sans-serif`;
      ctx.fillStyle = `rgba(215,227,234,${alpha == null ? 1 : alpha})`;
      ctx.shadowColor = 'rgba(127,233,255,0.4)'; ctx.shadowBlur = 24;
      // letter spacing
      const spacing = size * 0.32;
      const chars = text.split('');
      let total = 0; for (const c of chars) total += ctx.measureText(c).width + spacing;
      total -= spacing;
      let cx = x - total / 2;
      for (const c of chars) { const w = ctx.measureText(c).width; ctx.fillText(c, cx + w / 2, y); cx += w + spacing; }
      ctx.restore();
    },
    // A vertical menu. items: [{label}]. Returns nothing; caller draws selection.
    menu(ctx, items, sel, cx, cy, gap) {
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < items.length; i++) {
        const y = cy + i * gap;
        const on = i === sel;
        ctx.font = `${on ? '400' : '300'} ${on ? 22 : 19}px "Segoe UI", sans-serif`;
        ctx.fillStyle = on ? 'rgba(127,233,255,0.95)' : 'rgba(215,227,234,0.5)';
        if (on) { ctx.shadowColor = 'rgba(127,233,255,0.6)'; ctx.shadowBlur = 16; } else ctx.shadowBlur = 0;
        const label = (on ? '◄  ' : '') + items[i].label + (on ? '  ►' : '');
        ctx.fillText(label, cx, y);
      }
      ctx.restore();
    },
    text(ctx, str, x, y, size, alpha, align) {
      ctx.save();
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      ctx.font = `300 ${size}px "Segoe UI", sans-serif`;
      ctx.fillStyle = `rgba(215,227,234,${alpha == null ? 0.7 : alpha})`;
      ctx.fillText(str, x, y);
      ctx.restore();
    }
  };

  F.Scene = Scene;
  F.SM = new SceneManager();
})(window.FATHOM = window.FATHOM || {});
