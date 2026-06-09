/*
 * FATHOM — settings. Volumes plus the accessibility options the genre needs:
 * subtitles for audio cues, reduced flashing (photosensitivity), screen-shake
 * scaling, colorblind-safe danger color, and an invert for the quiet-swim hold.
 * Works as a full scene (from the menu) or an overlay (from pause).
 */
(function (F) {
  'use strict';

  class SettingsScene extends F.Scene {
    enter(params) {
      this.from = params.from || 'menu';
      this.sel = 0;
      this.opts = [
        { key: 'masterVolume', label: 'Master Volume', type: 'slider' },
        { key: 'sfxVolume', label: 'Sound Effects', type: 'slider', preview: 'ping' },
        { key: 'musicVolume', label: 'Ambience', type: 'slider' },
        { key: 'subtitles', label: 'Audio Subtitles', type: 'toggle' },
        { key: 'reducedFlashing', label: 'Reduced Flashing', type: 'toggle' },
        { key: 'screenShake', label: 'Screen Shake', type: 'slider' },
        { key: 'colorblindSafe', label: 'Colorblind-safe Danger', type: 'toggle' },
        { key: 'invertQuiet', label: 'Invert Quiet-Swim Hold', type: 'toggle' },
        { key: 'showFps', label: 'Show FPS', type: 'toggle' },
        { key: '__back', label: 'Back', type: 'action' }
      ];
    }

    _apply(previewKey) {
      F.Audio.applySettings(F.settings);
      F.Storage.saveSettings(F.settings);
      if (previewKey === 'ping') F.Audio.ping();
    }

    back() {
      F.Audio.uiSelect();
      if (this.from === 'pause') { F.SM.popOverlay(); F.SM.pushOverlay('pause'); }
      else F.SM.go('menu');
    }

    update(dt) {
      const I = F.Input, o = this.opts[this.sel];
      if (I.pressed('up')) { this.sel = (this.sel - 1 + this.opts.length) % this.opts.length; F.Audio.uiMove(); }
      if (I.pressed('down')) { this.sel = (this.sel + 1) % this.opts.length; F.Audio.uiMove(); }

      if (o.type === 'slider') {
        let d = 0;
        if (I.pressed('left')) d = -0.1; if (I.pressed('right')) d = 0.1;
        if (d !== 0) {
          F.settings[o.key] = F.M.clamp(Math.round((F.settings[o.key] + d) * 10) / 10, 0, 1);
          this._apply(o.preview); F.Audio.uiMove();
        }
      } else if (o.type === 'toggle') {
        if (I.pressed('confirm') || I.pressed('left') || I.pressed('right')) {
          F.settings[o.key] = !F.settings[o.key]; this._apply(); F.Audio.uiSelect();
        }
      } else if (o.type === 'action') {
        if (I.pressed('confirm')) this.back();
      }
      if (I.pressed('back') && o.key !== '__back') { /* esc backs out */ }
      if (I.pressed('pause') || (I.pressed('back') && this.sel === this.opts.length - 1)) this.back();
    }

    draw(ctx) {
      const W = F.VIEW.w, H = F.VIEW.h;
      if (this.from === 'pause') { ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, H); }
      else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }

      F.UI.title(ctx, 'SETTINGS', W / 2, 70, 34, 0.9);
      const x0 = W * 0.26, x1 = W * 0.74, top = 130, gap = 38;
      ctx.textBaseline = 'middle';
      for (let i = 0; i < this.opts.length; i++) {
        const o = this.opts[i], y = top + i * gap, on = i === this.sel;
        ctx.textAlign = 'left';
        ctx.font = `${on ? '400' : '300'} 17px "Segoe UI", sans-serif`;
        ctx.fillStyle = on ? 'rgba(127,233,255,0.95)' : 'rgba(215,227,234,0.55)';
        ctx.fillText((on ? '› ' : '  ') + o.label, x0, y);

        ctx.textAlign = 'right';
        if (o.type === 'slider') {
          const v = F.settings[o.key];
          const bw = 150, bh = 6, bx = x1 - bw, by = y - 3;
          ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = on ? 'rgba(127,233,255,0.9)' : 'rgba(215,227,234,0.5)'; ctx.fillRect(bx, by, bw * v, bh);
          ctx.font = '300 13px monospace'; ctx.fillStyle = 'rgba(215,227,234,0.6)';
          ctx.fillText(Math.round(v * 100) + '%', bx - 12, y);
        } else if (o.type === 'toggle') {
          ctx.font = '400 15px "Segoe UI", sans-serif';
          ctx.fillStyle = F.settings[o.key] ? 'rgba(124,255,178,0.9)' : 'rgba(215,227,234,0.4)';
          ctx.fillText(F.settings[o.key] ? 'ON' : 'OFF', x1, y);
        }
      }
      F.UI.text(ctx, '↑↓ select   ←→ adjust   Enter toggle   Esc back', W / 2, H - 36, 12, 0.4);
    }
  }

  F.SM.register('settings', new SettingsScene());
})(window.FATHOM = window.FATHOM || {});
