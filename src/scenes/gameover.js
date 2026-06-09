/*
 * FATHOM — the end of a run. Cause of death, how deep you got, the score, where
 * it ranks, and the local leaderboard. Then: go again, or surface.
 */
(function (F) {
  'use strict';

  class GameOverScene extends F.Scene {
    enter(params) {
      this.p = params;
      this.t = 0;
      this.sel = 0;
      this.items = [{ label: 'DESCEND AGAIN', a: 'again' }, { label: 'SURFACE', a: 'menu' }];
      this.table = (params.res && params.res.table) || F.Storage.loadScores();
    }
    act(a) { F.Audio.uiSelect(); if (a === 'again') F.SM.go('game', { reset: true }); else F.SM.go('menu'); }
    update(dt) {
      this.t += dt;
      const I = F.Input;
      if (I.pressed('up')) { this.sel = (this.sel - 1 + this.items.length) % this.items.length; F.Audio.uiMove(); }
      if (I.pressed('down')) { this.sel = (this.sel + 1) % this.items.length; F.Audio.uiMove(); }
      if (I.pressed('confirm')) this.act(this.items[this.sel].a);
      if (I.pressed('restart')) this.act('again');
    }
    draw(ctx) {
      const W = F.VIEW.w, H = F.VIEW.h, p = this.p;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      // slow red breathing background
      const br = 0.04 + 0.03 * Math.sin(this.t * 1.5);
      ctx.fillStyle = `rgba(60,0,0,${br})`; ctx.fillRect(0, 0, W, H);

      const reveal = F.M.clamp(this.t * 1.2, 0, 1);
      F.UI.title(ctx, p.cause === 'drowned' ? 'YOU DROWNED' : 'THE DEEP TOOK YOU', W / 2, H * 0.20, 38, reveal * 0.95);

      // stats
      ctx.textBaseline = 'middle';
      const cyL = H * 0.36;
      F.UI.text(ctx, 'DEPTH REACHED', W / 2, cyL - 24, 13, 0.45);
      F.UI.text(ctx, String(p.depth).padStart(2, '0'), W / 2, cyL + 6, 40, 0.9);

      F.UI.text(ctx, 'SCORE', W / 2, cyL + 56, 13, 0.45);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '200 52px "Segoe UI", sans-serif';
      const isBest = p.res && p.res.isBest;
      ctx.fillStyle = isBest ? 'rgba(255,209,102,0.95)' : 'rgba(215,227,234,0.92)';
      if (isBest) { ctx.shadowColor = 'rgba(255,209,102,0.6)'; ctx.shadowBlur = 22; }
      ctx.fillText(String(p.score), W / 2, cyL + 92);
      ctx.restore();
      if (isBest) F.UI.text(ctx, '★ NEW BEST DESCENT ★', W / 2, cyL + 126, 14, 0.9);
      else if (p.res) F.UI.text(ctx, `rank #${p.res.rank}`, W / 2, cyL + 126, 13, 0.5);

      // leaderboard (top 5)
      const lx = W * 0.5, ly = H * 0.67;
      ctx.textAlign = 'center';
      F.UI.text(ctx, '— DEEPEST DESCENTS —', lx, ly, 12, 0.4);
      for (let i = 0; i < Math.min(5, this.table.length); i++) {
        const e = this.table[i], y = ly + 22 + i * 18;
        const me = e === (p.entry);
        ctx.textAlign = 'right'; ctx.font = '300 13px monospace';
        ctx.fillStyle = me ? 'rgba(255,209,102,0.9)' : 'rgba(215,227,234,0.55)';
        ctx.fillText(`${i + 1}.`, lx - 80, y);
        ctx.fillText(String(e.score).padStart(6, ' '), lx + 10, y);
        ctx.textAlign = 'left';
        ctx.fillText(`  depth ${e.depth}`, lx + 14, y);
      }

      F.UI.menu(ctx, this.items, this.sel, W / 2, H - 70, 32);

      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  F.SM.register('gameover', new GameOverScene());
})(window.FATHOM = window.FATHOM || {});
