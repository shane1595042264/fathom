/* FATHOM — pause overlay. Sits over the frozen game frame. */
(function (F) {
  'use strict';

  class PauseScene extends F.Scene {
    enter() { this.sel = 0; this.items = [{ label: 'RESUME', a: 'resume' }, { label: 'SETTINGS', a: 'settings' }, { label: 'RESTART RUN', a: 'restart' }, { label: 'ABANDON TO SURFACE', a: 'menu' }]; }
    act(a) {
      F.Audio.uiSelect();
      if (a === 'resume') F.SM.popOverlay();
      else if (a === 'settings') { F.SM.popOverlay(); F.SM.pushOverlay('settings', { from: 'pause' }); }
      else if (a === 'restart') { F.SM.popOverlay(); F.SM.go('game', { reset: true }); }
      else if (a === 'menu') { F.Audio.stopAmbience(); F.SM.popOverlay(); F.SM.go('menu'); }
    }
    update() {
      const I = F.Input;
      F.Audio.setTension(0);
      if (I.pressed('up')) { this.sel = (this.sel - 1 + this.items.length) % this.items.length; F.Audio.uiMove(); }
      if (I.pressed('down')) { this.sel = (this.sel + 1) % this.items.length; F.Audio.uiMove(); }
      if (I.pressed('confirm')) this.act(this.items[this.sel].a);
      else if (I.pressed('pause')) this.act('resume');
    }
    draw(ctx) {
      const W = F.VIEW.w, H = F.VIEW.h;
      ctx.fillStyle = 'rgba(0,4,8,0.82)'; ctx.fillRect(0, 0, W, H);
      F.UI.title(ctx, 'PAUSED', W / 2, H * 0.33, 40, 0.9);
      F.UI.menu(ctx, this.items, this.sel, W / 2, H * 0.52, 40);
      F.UI.text(ctx, 'Esc to resume', W / 2, H - 40, 12, 0.4);
    }
  }

  F.SM.register('pause', new PauseScene());
})(window.FATHOM = window.FATHOM || {});
