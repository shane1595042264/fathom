/*
 * FATHOM — intro. A short narrative crawl shown on the first descent (gated by
 * meta.seenIntro). Lines fade in one by one; any input skips/begins. Sets the
 * premise so the dive has stakes — the immersion a top-down view needs.
 */
(function (F) {
  'use strict';

  class IntroScene extends F.Scene {
    enter() {
      this.t = 0;
      this.lines = (F.LORE && F.LORE.intro) || [];
      this.lineEvery = 1.7;          // seconds between lines appearing
      this.allShownAt = this.lines.length * this.lineEvery + 0.6;
    }
    begin() {
      const m = F.Storage.loadMeta(); m.seenIntro = true; F.Storage.saveMeta(m);
      F.Audio.uiSelect();
      F.SM.go('game', { reset: true });
    }
    update(dt) {
      this.t += dt;
      const I = F.Input;
      if (I.pressed('confirm') || I.pressed('pause') || I.pointerClicked()) this.begin();
    }
    draw(ctx) {
      const W = F.VIEW.w, H = F.VIEW.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

      // a slow sonar pulse for mood
      const r = (this.t * 90) % 520;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, F.M.TAU);
      ctx.strokeStyle = `rgba(127,233,255,${F.M.clamp(1 - r / 520, 0, 1) * 0.10})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();

      F.UI.title(ctx, 'FATHOM', W / 2, H * 0.16, 30, 0.5);

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '300 18px "Segoe UI", sans-serif';
      const startY = H * 0.30, lh = 34;
      for (let i = 0; i < this.lines.length; i++) {
        const appear = i * this.lineEvery;
        const a = F.M.clamp((this.t - appear) / 1.2, 0, 1);
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(215,227,234,${a * 0.85})`;
        ctx.fillText(this.lines[i], W / 2, startY + i * lh);
      }

      // prompt
      const ready = this.t > this.allShownAt;
      const blink = 0.5 + 0.5 * Math.sin(this.t * 4);
      ctx.font = '300 14px "Segoe UI", sans-serif';
      ctx.fillStyle = `rgba(127,233,255,${(ready ? 0.4 + blink * 0.5 : 0.25)})`;
      ctx.fillText(ready ? 'press any key to descend' : 'press any key to skip', W / 2, H - 40);
    }
  }

  F.SM.register('intro', new IntroScene());
})(window.FATHOM = window.FATHOM || {});
