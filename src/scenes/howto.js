/*
 * FATHOM — how to survive. The whole game is one sentence — "ping to see, but it
 * hears every ping" — so this screen is short on purpose.
 */
(function (F) {
  'use strict';

  class HowToScene extends F.Scene {
    enter(params) { this.from = params.from || 'menu'; this.t = 0; this.demo = 0; }
    update(dt) {
      this.t += dt; this.demo += dt;
      const I = F.Input;
      if (I.pressed('confirm') || I.pointerClicked()) { F.Audio.uiSelect(); F.SM.go('game', { reset: true }); }
      if (I.pressed('back') || I.pressed('pause')) { F.Audio.uiSelect(); F.SM.go('menu'); }
    }
    draw(ctx) {
      const W = F.VIEW.w, H = F.VIEW.h;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

      // demo ping ring on the left
      const r = (this.demo * 130) % 360;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.arc(W * 0.5, H * 0.30, r, 0, F.M.TAU);
      ctx.strokeStyle = `rgba(127,233,255,${F.M.clamp(1 - r / 360, 0, 1) * 0.5})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();

      F.UI.title(ctx, 'PING TO SEE', W / 2, H * 0.30, 40, 0.95);
      F.UI.text(ctx, 'but it hears every ping', W / 2, H * 0.30 + 44, 16, 0.5);

      const lines = [
        ['SWIM', 'WASD / Arrows / Stick'],
        ['PING (see)', 'Space / Click / RT  —  the loudest thing you can do'],
        ['SWIM SILENT', 'Hold Shift  —  slow, but the Angler can\'t hear you'],
        ['BREATHE', 'Rest on a green vent to refill air  —  surfacing is loud'],
        ['GOAL', 'Recover the gold beacons, then find the descent'],
        ['LISTEN', 'It groans from its real direction. The louder, the closer.']
      ];
      ctx.textBaseline = 'middle';
      let y = H * 0.50;
      for (const [k, v] of lines) {
        ctx.textAlign = 'right'; ctx.font = '400 15px "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(127,233,255,0.85)';
        ctx.fillText(k, W * 0.42, y);
        ctx.textAlign = 'left'; ctx.font = '300 15px "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(215,227,234,0.7)';
        ctx.fillText(v, W * 0.45, y);
        y += 30;
      }

      const blink = 0.5 + 0.5 * Math.sin(this.t * 4);
      F.UI.text(ctx, 'press Enter to descend', W / 2, H - 50, 16, 0.4 + blink * 0.5);
      F.UI.text(ctx, 'Esc to go back', W / 2, H - 26, 12, 0.3);
    }
  }

  F.SM.register('howto', new HowToScene());
})(window.FATHOM = window.FATHOM || {});
