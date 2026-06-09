/*
 * FATHOM — the Angler. A blind predator that hunts purely by sound.
 *
 * Design contract that makes it fair (and therefore scary rather than cheap):
 *   - It only knows where you WERE when you last made noise, never where you are.
 *   - It is loud: it groans on a cadence, panned/attenuated by its real position,
 *     so an attentive player can read its location by ear and route around it.
 *   - Pings are the loudest thing in the game, so the core "ping to see" verb is
 *     also "ping to be found" — the whole game is that one tension.
 *
 * States: PATROL (wander) -> HUNT (go to last heard noise) -> SEARCH (sniff around
 * the last known point) -> back to PATROL. Pathfinding is BFS on the tile grid,
 * recomputed when the target moves or the path runs out.
 */
(function (F) {
  'use strict';

  const PATROL = 0, HUNT = 1, SEARCH = 2;

  class Entity {
    constructor(world, x, y, huntSpeed) {
      this.world = world;
      this.x = x; this.y = y;
      this.radius = F.CONFIG.entity.radius;
      this.huntSpeed = huntSpeed || F.CONFIG.entity.baseSpeed;
      this.state = PATROL;
      this.target = { x, y };
      this.path = null; this.pathIdx = 0;
      this.repathTimer = 0;
      this.interest = 0;
      this.score = 0;
      this.relock = 0;
      this.voiceTimer = 1 + Math.random() * 2;
      this.facing = Math.random() * F.M.TAU;
      this.searchTimer = 0;
      this.vx = 0; this.vy = 0;
      this.hearMult = 1;       // sharpens with depth (set by the game from progression)
      this._lunged = false;    // one lunge-surge SFX per commit
      this._gotClose = false;  // for the "survived a standoff" achievement
    }

    tile() { return [Math.floor(this.x / F.TILE), Math.floor(this.y / F.TILE)]; }

    hear(noise) {
      const E = F.CONFIG.entity;
      let range;
      switch (noise.type) {
        case 'ping': range = E.hearPing; break;
        case 'gasp': range = E.hearGasp; break;
        case 'bump': range = E.hearBump; break;
        default: range = E.hearSwim; break;
      }
      range *= F.M.clamp(noise.loudness, 0.05, 2) * this.hearMult;
      const d = F.M.dist(this.x, this.y, noise.x, noise.y);
      if (d > range) return false;
      const score = noise.loudness * (1 - d / range);
      // Commit to a new sound if we're allowed to re-lock and it's compelling.
      if (this.relock <= 0 || score > this.score * 1.25) {
        const wasPassive = this.state !== HUNT;
        this.target = { x: noise.x, y: noise.y };
        this.score = score;
        this.interest = F.CONFIG.entity.interestSec;
        this.relock = F.CONFIG.entity.relockSec;
        this.state = HUNT;
        this.path = null;
        if (wasPassive && (noise.type === 'ping' || noise.type === 'gasp' || noise.type === 'bump')) {
          F.Audio.stinger();
        }
        return true;
      }
      return false;
    }

    _bfsPath(from, to) {
      const w = this.world;
      if (w.isWallTile(to[0], to[1])) {
        // Snap target to nearest floor tile.
        let best = null, bd = 1e9;
        for (const f of w.floors) {
          const dd = Math.abs(f[0] - to[0]) + Math.abs(f[1] - to[1]);
          if (dd < bd) { bd = dd; best = f; }
        }
        if (best) to = best; else return null;
      }
      const prev = new Int32Array(w.cols * w.rows).fill(-2);
      const startI = w.idx(from[0], from[1]);
      prev[startI] = -1;
      const q = [from]; let head = 0;
      const goalI = w.idx(to[0], to[1]);
      while (head < q.length) {
        const [cx, cy] = q[head++];
        const ci = w.idx(cx, cy);
        if (ci === goalI) break;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const nx = cx + dx, ny = cy + dy;
          if (w.inBounds(nx, ny) && w.grid[w.idx(nx, ny)] === 0 && prev[w.idx(nx, ny)] === -2) {
            prev[w.idx(nx, ny)] = ci; q.push([nx, ny]);
          }
        }
      }
      if (prev[goalI] === -2) return null;
      // Reconstruct.
      const path = []; let cur = goalI;
      while (cur !== -1) { path.push([cur % w.cols, Math.floor(cur / w.cols)]); cur = prev[cur]; }
      path.reverse();
      return path;
    }

    _pickPatrolTarget(rng) {
      const w = this.world;
      const spots = w.entitySpawns.concat(w.floors.filter((_, i) => i % 17 === 0).map(([tx, ty]) => w.tileCenter(tx, ty)));
      const pick = spots[(Math.random() * spots.length) | 0] || w.tileCenter(1, 1);
      this.target = { x: pick.x, y: pick.y };
      this.path = null;
    }

    update(dt, player, game) {
      const E = F.CONFIG.entity;
      if (this.relock > 0) this.relock -= dt;
      this.score *= Math.exp(-dt * 0.6); // interest in old sounds decays

      // State timers.
      if (this.state === HUNT || this.state === SEARCH) {
        this.interest -= dt;
        if (this.interest <= 0) {
          if (this.state === HUNT) { this.state = SEARCH; this.searchTimer = 2.5; }
          else {
            // Gave up the hunt. If it had gotten close to you, you out-waited it.
            this.state = PATROL; this._pickPatrolTarget();
            if (this._gotClose) { this._gotClose = false; if (game.onStandoffSurvived) game.onStandoffSurvived(); }
          }
        }
      }
      if (this.state === SEARCH) {
        this.searchTimer -= dt;
        if (this.searchTimer <= 0) {
          // Wander a little around the last known point.
          const a = Math.random() * F.M.TAU, r = F.TILE * 2;
          this.target = { x: this.target.x + Math.cos(a) * r, y: this.target.y + Math.sin(a) * r };
          this.path = null; this.searchTimer = 1.6;
        }
      }

      // Repath toward target.
      this.repathTimer -= dt;
      const targetTile = [Math.floor(this.target.x / F.TILE), Math.floor(this.target.y / F.TILE)];
      if (!this.path || this.repathTimer <= 0) {
        const p = this._bfsPath(this.tile(), targetTile);
        if (p && p.length > 1) { this.path = p; this.pathIdx = 1; }
        this.repathTimer = 0.45;
      }

      // Steering toward current waypoint.
      let tx = this.target.x, ty = this.target.y;
      if (this.path && this.pathIdx < this.path.length) {
        const wp = this.world.tileCenter(this.path[this.pathIdx][0], this.path[this.pathIdx][1]);
        tx = wp.x; ty = wp.y;
        if (F.M.dist(this.x, this.y, tx, ty) < F.TILE * 0.4) this.pathIdx++;
      }

      // Final-approach lunge: a sharp surge inside the commit window so the kill
      // has kinematic punch and a readable tell (paired with the visual glimpse).
      let speed = this.state === PATROL ? E.patrolSpeed : this.huntSpeed;
      if (this.state !== PATROL) {
        const dpre = F.M.dist(this.x, this.y, player.x, player.y);
        if (dpre < E.killRadius * 3) {
          speed *= 1.8;
          if (!this._lunged) { this._lunged = true; F.Audio.lunge(); }
        } else if (dpre > E.killRadius * 4) { this._lunged = false; }
      }
      const ang = Math.atan2(ty - this.y, tx - this.x);
      this.facing = F.M.angleLerp(this.facing, ang, 0.12);
      this.vx = Math.cos(ang) * speed; this.vy = Math.sin(ang) * speed;
      this.x += this.vx * dt; this.y += this.vy * dt;
      const c = this.world.collideCircle(this.x, this.y, this.radius);
      this.x = c.x; this.y = c.y;
      if (c.hit) this.repathTimer = 0; // stuck on a corner: repath next frame

      // Patrol arrival -> new target.
      if (this.state === PATROL && F.M.dist(this.x, this.y, this.target.x, this.target.y) < F.TILE) {
        this._pickPatrolTarget();
      }

      // Voice (directional groan). Cadence depends on state & proximity.
      const dPlayer = F.M.dist(this.x, this.y, player.x, player.y);
      this.voiceTimer -= dt;
      if (this.voiceTimer <= 0) {
        const close = dPlayer < E.dreadRadius;
        if (this.state === HUNT) this.voiceTimer = close ? 1.0 + Math.random() * 0.6 : 1.8 + Math.random();
        else if (this.state === SEARCH) this.voiceTimer = 1.6 + Math.random();
        else this.voiceTimer = 3.5 + Math.random() * 3;
        const pan = F.M.clamp((this.x - player.x) / (F.VIEW.w * 0.5), -1, 1);
        // Scale loudness against the dread range (not hearPing 1500) so the groan
        // audibly swells as it closes the last few hundred px — where you feel hunted.
        const dist01 = F.M.clamp(dPlayer / (E.dreadRadius * 1.5), 0, 1);
        F.Audio.entityVoice(pan, dist01);
        if (game.settings.subtitles && dPlayer < E.dreadRadius * 1.5) {
          const dir = this.x < player.x ? '◄' : '►';
          game.hud.cue(this.state === HUNT ? `${dir} it is hunting` : `${dir} something moves`, dPlayer < E.dreadRadius ? 1 : 0.6);
        }
      }

      // Kill check.
      if (player.alive && dPlayer < E.killRadius) {
        game.killPlayer(this);
      } else if (player.alive && dPlayer < E.dreadRadius) {
        // Feed dread/heartbeat tension to the game (closest entity wins).
        game.registerThreat(dPlayer, this);
        if (this.state !== PATROL) this._gotClose = true;
      }
    }
  }

  Entity.PATROL = PATROL; Entity.HUNT = HUNT; Entity.SEARCH = SEARCH;
  F.Entity = Entity;
})(window.FATHOM = window.FATHOM || {});
