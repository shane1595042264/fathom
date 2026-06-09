/*
 * FATHOM — world renderer.
 *
 * The screen is black. Light is information, and information is scarce. We draw,
 * in order: the faint passive glow around the diver (always, line-of-sight
 * masked), each active sonar ping (swept floor wash + the bright expanding
 * wavefront + the crisp wall outlines it found, all fading), then the objects /
 * creature / diver at whatever brightness the sonar currently grants them.
 *
 * Everything is vector art tinted from F.PALETTE — minimalist by design, both for
 * the Tetris-clean identity and so there are zero art assets to ship.
 */
(function (F) {
  'use strict';

  const P = F.PALETTE;

  class Renderer {
    constructor(ctx) { this.ctx = ctx; this.cam = { x: 0, y: 0 }; this._passiveRays = 110; }

    camera(game) {
      const w = game.world;
      let cx = game.player.x - F.VIEW.w / 2;
      let cy = game.player.y - F.VIEW.h / 2;
      cx = F.M.clamp(cx, 0, Math.max(0, w.pxW - F.VIEW.w));
      cy = F.M.clamp(cy, 0, Math.max(0, w.pxH - F.VIEW.h));
      // If world smaller than view, center it.
      if (w.pxW < F.VIEW.w) cx = (w.pxW - F.VIEW.w) / 2;
      if (w.pxH < F.VIEW.h) cy = (w.pxH - F.VIEW.h) / 2;
      this.cam.x = cx; this.cam.y = cy;
      return this.cam;
    }

    draw(game) {
      const ctx = this.ctx;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, F.VIEW.w, F.VIEW.h);
      const cam = this.camera(game);
      ctx.save();
      ctx.translate(-cam.x + game.juice.shakeX, -cam.y + game.juice.shakeY);

      this._drawPassive(game);
      ctx.globalCompositeOperation = 'lighter';
      for (const ping of game.sonar.pings) this._drawPing(game, ping);
      ctx.globalCompositeOperation = 'source-over';

      this._drawObjects(game);
      this._drawEntities(game);
      this._drawPlayer(game);

      ctx.restore();
    }

    _drawPassive(game) {
      const ctx = this.ctx, pl = game.player, R = game.sonar.passiveVision;
      // Build a small LOS polygon and fill with a faint cyan radial glow.
      const N = this._passiveRays, dA = F.M.TAU / N;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const a = i * dA;
        const r = game.world.castRay(pl.x, pl.y, a, R);
        const d = r.dist;
        const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
      const g = ctx.createRadialGradient(pl.x, pl.y, 2, pl.x, pl.y, R);
      g.addColorStop(0, 'rgba(127,233,255,0.20)');
      g.addColorStop(0.6, 'rgba(127,233,255,0.06)');
      g.addColorStop(1, 'rgba(127,233,255,0)');
      ctx.fillStyle = g; ctx.fillRect(pl.x - R, pl.y - R, R * 2, R * 2);
      ctx.restore();
    }

    _drawPing(game, ping) {
      const ctx = this.ctx;
      const speed = F.CONFIG.ping.speed, fade = F.CONFIG.ping.revealFade, maxR = F.CONFIG.ping.maxRadius;
      const R = ping.age * speed;
      const N = ping.nRays, dA = ping.dAng;
      const cos = Math.cos, sin = Math.sin;

      // Overall reveal fade for this ping: bright as the wavefront sweeps, then a
      // dimming afterimage you navigate from memory.
      const ageFade = F.M.clamp(1 - (ping.age - 0.3) / fade, 0, 1);

      // ---- lit area: fill the visibility polygon so the open water/corridors
      //      glow (the primary, readable reveal). Brightest near the wavefront. ----
      if (ageFade > 0.01) {
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const idx = i % N, a = idx * dA;
          const d = Math.min(R, ping.dist[idx]);
          const x = ping.x + cos(a) * d, y = ping.y + sin(a) * d;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(ping.x, ping.y, R * 0.08, ping.x, ping.y, Math.max(10, R));
        g.addColorStop(0, `rgba(90,210,240,${0.06 * ageFade})`);
        g.addColorStop(0.7, `rgba(127,233,255,${0.16 * ageFade})`);
        g.addColorStop(1, `rgba(180,247,255,${0.40 * ageFade})`);
        ctx.fillStyle = g; ctx.fill();
      }

      // ---- wall outlines (the crisp revealed geometry), bucketed by brightness ----
      const buckets = [[], [], [], []]; // 4 brightness levels
      let prevWall = false, px = 0, py = 0, pb = 0, pd = 0;
      for (let i = 0; i < N; i++) {
        let plotted = false;
        if (ping.hit[i]) {
          const d = ping.dist[i];
          if (R >= d) {
            const since = ping.age - d / speed;
            const b = 1 - since / fade;
            if (b > 0) {
              const a = i * dA;
              const x = ping.x + cos(a) * d, y = ping.y + sin(a) * d;
              if (prevWall && Math.abs(d - pd) < F.TILE * 1.1) {
                const bb = Math.min(b, pb);
                buckets[Math.min(3, (bb * 4) | 0)].push(px, py, x, y);
              }
              prevWall = true; px = x; py = y; pb = b; pd = d; plotted = true;
            }
          }
        }
        if (!plotted) prevWall = false;
      }
      for (let bk = 0; bk < 4; bk++) {
        const seg = buckets[bk]; if (!seg.length) continue;
        const alpha = (bk + 1) / 4;
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 4) { ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
        // glow pass
        ctx.lineWidth = 7; ctx.strokeStyle = `rgba(127,233,255,${alpha * 0.28})`; ctx.stroke();
        // core pass
        ctx.lineWidth = 2.6; ctx.strokeStyle = `rgba(216,250,255,${alpha})`; ctx.stroke();
      }

      // ---- the bright expanding wavefront (only where it's still in open water) ----
      const edgeA = F.M.clamp(1 - R / maxR, 0, 1) * 0.85;
      if (edgeA > 0.01 && R > 4) {
        ctx.lineWidth = 2.6; ctx.strokeStyle = `rgba(150,240,255,${edgeA})`;
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i <= N; i++) {
          const idx = i % N, a = idx * dA;
          if (R < ping.dist[idx]) {
            const x = ping.x + cos(a) * R, y = ping.y + sin(a) * R;
            if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
          } else { pen = false; }
        }
        ctx.stroke();
        // a faint bloom on the wavefront
        ctx.lineWidth = 7; ctx.strokeStyle = `rgba(127,233,255,${edgeA * 0.15})`; ctx.stroke();
      }
    }

    _glowDot(x, y, r, color, a, blur) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color.replace('A', a));
      g.addColorStop(1, color.replace('A', '0'));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, F.M.TAU); ctx.fill();
      ctx.restore();
    }

    _drawObjects(game) {
      const ctx = this.ctx, w = game.world, pl = game.player, son = game.sonar;
      const pulse = 0.5 + 0.5 * Math.sin(game.time * 2.2);

      // Beacons.
      for (const b of w.beacons) {
        if (b.collected) continue;
        const lit = Math.max(son.brightnessAt(b.x, b.y, w, pl), 0.10 + pulse * 0.06);
        this._glowDot(b.x, b.y, 26 + pulse * 6, 'rgba(255,209,102,A)', (lit * 0.9).toFixed(3), 0);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(game.time * 0.8);
        ctx.fillStyle = `rgba(255,224,150,${lit})`;
        ctx.beginPath();
        const s = 7;
        ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // Air pockets.
      for (const a of w.airPockets) {
        const lit = Math.max(son.brightnessAt(a.x, a.y, w, pl), 0.08 + pulse * 0.04);
        this._glowDot(a.x, a.y, 22, 'rgba(124,255,178,A)', (lit * 0.8).toFixed(3), 0);
        ctx.fillStyle = `rgba(150,255,200,${lit})`;
        for (let i = 0; i < 3; i++) {
          const bx = a.x + Math.sin(game.time * 1.7 + i * 2) * 5;
          const by = a.y - ((game.time * 18 + i * 9) % 18) + 9;
          ctx.beginPath(); ctx.arc(bx, by, 2 + i, 0, F.M.TAU); ctx.fill();
        }
      }

      // Descent hatch.
      if (w.exit) {
        const open = game.exitOpen;
        const lit = Math.max(son.brightnessAt(w.exit.x, w.exit.y, w, pl), open ? 0.16 + pulse * 0.12 : 0.0);
        if (lit > 0.02) {
          const col = open ? '124,255,178' : '127,233,255';
          this._glowDot(w.exit.x, w.exit.y, open ? 34 : 22, `rgba(${col},A)`, (lit).toFixed(3), 0);
          ctx.strokeStyle = `rgba(${col},${lit})`; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(w.exit.x, w.exit.y, 14, 0, F.M.TAU); ctx.stroke();
          // downward chevrons
          if (open) {
            ctx.beginPath();
            for (let i = -1; i <= 1; i++) {
              const yy = w.exit.y - 6 + i * 7 + (game.time * 14 % 7);
              ctx.moveTo(w.exit.x - 7, yy); ctx.lineTo(w.exit.x, yy + 5); ctx.lineTo(w.exit.x + 7, yy);
            }
            ctx.stroke();
          }
        }
      }
    }

    _drawEntities(game) {
      const ctx = this.ctx, w = game.world, pl = game.player, son = game.sonar;
      for (const e of game.entities) {
        let lit = son.brightnessAt(e.x, e.y, w, pl);
        const dP = F.M.dist(e.x, e.y, pl.x, pl.y);
        if (dP < F.CONFIG.entity.killRadius * 4) lit = Math.max(lit, 0.22); // last-moment glimpse
        if (lit < 0.02) continue;
        ctx.save();
        ctx.translate(e.x, e.y); ctx.rotate(e.facing);
        // menacing red bloom
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const dg = F.dangerRGB(game.settings);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 44);
        g.addColorStop(0, `rgba(${dg},${lit * 0.5})`); g.addColorStop(1, `rgba(${dg},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 44, 0, F.M.TAU); ctx.fill();
        ctx.restore();
        // jagged body
        ctx.fillStyle = `rgba(${this._dangerRGB(game)},${0.5 + lit * 0.5})`;
        ctx.beginPath();
        const spikes = 11, base = e.radius + 4;
        for (let i = 0; i <= spikes; i++) {
          const a = (i / spikes) * F.M.TAU;
          const rr = base * (i % 2 === 0 ? 1.0 : 0.55) + Math.sin(game.time * 6 + i) * 2;
          const x = Math.cos(a) * (rr + 8), y = Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();
        // eyes
        ctx.fillStyle = `rgba(255,235,235,${lit})`;
        ctx.beginPath(); ctx.arc(10, -5, 2.4, 0, F.M.TAU); ctx.arc(10, 5, 2.4, 0, F.M.TAU); ctx.fill();
        ctx.restore();
      }
    }

    _dangerRGB(game) { return F.dangerRGB(game.settings); }

    _drawPlayer(game) {
      const ctx = this.ctx, pl = game.player;
      if (!pl.alive) return;
      ctx.save();
      ctx.translate(pl.x, pl.y); ctx.rotate(pl.facing);
      // soft self light
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
      g.addColorStop(0, 'rgba(215,227,234,0.5)'); g.addColorStop(1, 'rgba(215,227,234,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 20, 0, F.M.TAU); ctx.fill();
      ctx.restore();
      // body
      ctx.fillStyle = '#cfe6ee';
      ctx.beginPath(); ctx.ellipse(0, 0, pl.radius, pl.radius * 0.78, 0, 0, F.M.TAU); ctx.fill();
      // dead lamp / head
      ctx.fillStyle = '#9fb6bf';
      ctx.beginPath(); ctx.arc(pl.radius * 0.5, 0, 4, 0, F.M.TAU); ctx.fill();
      // fins
      ctx.strokeStyle = 'rgba(180,205,214,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-pl.radius, -5); ctx.lineTo(-pl.radius - 6, -9);
      ctx.moveTo(-pl.radius, 5); ctx.lineTo(-pl.radius - 6, 9); ctx.stroke();
      ctx.restore();
    }
  }

  F.Renderer = Renderer;
})(window.FATHOM = window.FATHOM || {});
