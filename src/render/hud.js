/*
 * FATHOM — heads-up display. Deliberately sparse so the darkness stays the star:
 * depth & score on top, oxygen + sonar-readiness on the bottom, beacon pips, and
 * accessibility subtitle "cues" for important audio (the creature, surfacing).
 */
(function (F) {
  'use strict';

  class HUD {
    constructor() { this.cues = []; this._lastCue = ''; this._lastCueT = 0; this.time = 0; }
    reset() { this.cues.length = 0; }

    cue(text, strength) {
      // Throttle identical cues so the screen doesn't spam.
      if (text === this._lastCue && this.time - this._lastCueT < 0.9) return;
      this._lastCue = text; this._lastCueT = this.time;
      this.cues.push({ text, strength: strength || 0.7, t: 1.8 });
      if (this.cues.length > 3) this.cues.shift();
    }

    update(dt) {
      this.time += dt;
      for (let i = this.cues.length - 1; i >= 0; i--) { this.cues[i].t -= dt; if (this.cues[i].t <= 0) this.cues.splice(i, 1); }
    }

    // Diegetic objective marker: your suit picks up the transponder "signal" (gold);
    // once all are recovered it homes on the descent hatch (green). If the target is
    // off-screen it becomes an edge chevron pointing the way — so you always know
    // where to go, and can route around the Angler instead of feeling trapped.
    _drawCompass(ctx, game) {
      let target = null, col = '255,209,102';
      if (game.exitOpen && game.world.exit) { target = game.world.exit; col = '124,255,178'; }
      else {
        let best = Infinity;
        for (const b of game.world.beacons) {
          if (b.collected) continue;
          const d = F.M.dist(game.player.x, game.player.y, b.x, b.y);
          if (d < best) { best = d; target = b; }
        }
      }
      if (!target || !game.renderer) return;
      const cam = game.renderer.cam, W = F.VIEW.w, H = F.VIEW.h;
      const sx = target.x - cam.x, sy = target.y - cam.y;
      const cx = W / 2, cy = H / 2;
      let dx = sx - cx, dy = sy - cy;
      const mag = Math.hypot(dx, dy) || 1; dx /= mag; dy /= mag;
      const pulse = 0.55 + 0.45 * Math.sin(this.time * 4);
      // Edge ring inset (avoids the top/bottom HUD bars).
      const t = Math.min((W / 2 - 54) / Math.max(1e-3, Math.abs(dx)), (H / 2 - 96) / Math.max(1e-3, Math.abs(dy)));
      ctx.save();
      if (mag < t - 6) {
        // On-screen: a soft ring on the target itself.
        ctx.globalAlpha = 0.5 + pulse * 0.3;
        ctx.strokeStyle = `rgba(${col},0.8)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 18 + pulse * 4, 0, F.M.TAU); ctx.stroke();
      } else {
        // Off-screen: a chevron at the edge pointing the way.
        const ex = cx + dx * t, ey = cy + dy * t, ang = Math.atan2(dy, dx);
        ctx.translate(ex, ey); ctx.rotate(ang);
        ctx.globalAlpha = 0.55 + pulse * 0.35;
        ctx.fillStyle = `rgba(${col},0.95)`; ctx.shadowColor = `rgba(${col},0.7)`; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, -8); ctx.lineTo(-2, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    draw(ctx, game) {
      const W = F.VIEW.w, H = F.VIEW.h;
      ctx.save();
      ctx.textBaseline = 'middle';

      // Top-left: depth.
      ctx.textAlign = 'left';
      ctx.font = '300 13px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(215,227,234,0.55)';
      ctx.fillText('DEPTH', 22, 26);
      ctx.font = '200 30px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(215,227,234,0.92)';
      ctx.fillText(String(game.depth).padStart(2, '0'), 22, 50);

      // Top-right: score.
      ctx.textAlign = 'right';
      ctx.font = '300 13px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(215,227,234,0.55)';
      ctx.fillText('SCORE', W - 22, 26);
      ctx.font = '200 30px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(215,227,234,0.92)';
      ctx.fillText(String(Math.floor(game.score)), W - 22, 50);
      // Style (nerve) multiplier — glows brighter the higher it climbs.
      if (game.style > 1.05) {
        const s = F.M.clamp((game.style - 1) / (F.CONFIG.score.styleMax - 1), 0, 1);
        ctx.font = '400 15px "Segoe UI", sans-serif';
        ctx.fillStyle = `rgba(255,${Math.round(209 - s * 60)},${Math.round(102 - s * 60)},${0.5 + s * 0.5})`;
        ctx.fillText('×' + game.style.toFixed(1) + ' nerve', W - 22, 74);
      }

      // Top-center: beacon pips + objective.
      const total = game.world.beacons.length;
      const got = game.beaconsCollected;
      ctx.textAlign = 'center';
      const pipW = 16, gap = 8, totalW = total * pipW + (total - 1) * gap;
      let x0 = W / 2 - totalW / 2;
      for (let i = 0; i < total; i++) {
        const on = i < got;
        ctx.beginPath();
        const cx = x0 + i * (pipW + gap) + pipW / 2, cy = 30, s = 5;
        ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy); ctx.closePath();
        ctx.fillStyle = on ? 'rgba(255,209,102,0.95)' : 'rgba(255,209,102,0.18)';
        ctx.fill();
      }
      ctx.font = '300 12px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(215,227,234,0.5)';
      ctx.fillText(game.exitOpen ? 'DESCENT OPEN — FIND THE HATCH' : `RECOVER TRANSPONDERS  ${got}/${total}`, W / 2, 50);

      // Signal compass — always shows where to go (this is how you win).
      this._drawCompass(ctx, game);

      // Bottom-center: oxygen bar.
      const ox = game.oxygen;
      const barW = 280, barH = 7, bx = W / 2 - barW / 2, by = H - 34;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx, by, barW, barH);
      const frac = ox.frac;
      const air = ox.low ? (ox.critical ? F.dangerRGB(game.settings) : '255,180,90') : '124,255,178';
      const pulse = ox.low ? (0.6 + 0.4 * Math.sin(this.time * 10)) : 1;
      ctx.fillStyle = `rgba(${air},${0.85 * pulse})`;
      ctx.fillRect(bx, by, barW * frac, barH);
      ctx.font = '300 11px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(215,227,234,0.55)'; ctx.textAlign = 'center';
      ctx.fillText(`OXYGEN  ${Math.ceil(ox.air)}s`, W / 2, by - 12);

      // Bottom-left: sonar readiness.
      const cd = game.sonar.cooldownLeft, cdMax = F.CONFIG.ping.cooldown;
      const ready = cd <= 0;
      const sr = 16, scx = 36, scy = H - 36;
      ctx.beginPath(); ctx.arc(scx, scy, sr, 0, F.M.TAU);
      ctx.strokeStyle = 'rgba(127,233,255,0.15)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath();
      const p = ready ? 1 : 1 - cd / cdMax;
      ctx.arc(scx, scy, sr, -Math.PI / 2, -Math.PI / 2 + F.M.TAU * p);
      ctx.strokeStyle = ready ? 'rgba(127,233,255,0.9)' : 'rgba(127,233,255,0.4)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = '300 9px "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(215,227,234,0.5)'; ctx.textAlign = 'center';
      ctx.fillText('PING', scx, scy + 1);

      // Subtitle cues (accessibility) near bottom.
      if (game.settings.subtitles) {
        ctx.textAlign = 'center'; ctx.font = '300 15px "Segoe UI", sans-serif';
        let yy = H - 70;
        for (let i = this.cues.length - 1; i >= 0; i--) {
          const c = this.cues[i];
          const a = F.M.clamp(c.t, 0, 1) * (0.5 + c.strength * 0.5);
          ctx.fillStyle = `rgba(215,227,234,${a})`;
          ctx.fillText(c.text, W / 2, yy);
          yy -= 22;
        }
      }

      if (game.settings.showFps) {
        ctx.textAlign = 'left'; ctx.font = '300 11px monospace'; ctx.fillStyle = 'rgba(124,255,178,0.6)';
        ctx.fillText(`${game.fps | 0} fps`, 22, H - 14);
      }
      ctx.restore();
    }
  }

  F.HUD = HUD;
})(window.FATHOM = window.FATHOM || {});
