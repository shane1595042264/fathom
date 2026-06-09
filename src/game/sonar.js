/*
 * FATHOM — sonar: the core verb.
 *
 * A ping is an expanding ring of light cast from the player. On emit we cast a
 * fan of rays and remember the distance to the first wall along each — that frozen
 * "visibility polygon" is what the ring paints as it sweeps outward, so walls
 * correctly occlude what you can see. Painted surfaces fade back to black over
 * `revealFade` seconds, leaving you blind again.
 *
 * `brightnessAt()` answers "how lit is this world point right now?" for any point
 * object (beacon, air pocket, the creature), combining every active ping plus the
 * faint always-on passive glow around the player.
 */
(function (F) {
  'use strict';

  const NRAYS = 600;

  class Sonar {
    constructor() {
      this.pings = [];
      this.cooldownLeft = 0;
      this.passiveVision = F.CONFIG.ping.passiveVision;
    }

    reset() { this.pings.length = 0; this.cooldownLeft = 0; this.passiveVision = F.CONFIG.ping.passiveVision; }

    canPing() { return this.cooldownLeft <= 0; }

    emit(x, y, world) {
      const dist = new Float32Array(NRAYS);
      const hit = new Uint8Array(NRAYS);
      const dAng = F.M.TAU / NRAYS;
      const maxR = F.CONFIG.ping.maxRadius;
      for (let i = 0; i < NRAYS; i++) {
        const r = world.castRay(x, y, i * dAng, maxR);
        dist[i] = r.dist; hit[i] = r.hit ? 1 : 0;
      }
      this.pings.push({ x, y, age: 0, nRays: NRAYS, ang0: 0, dAng, dist, hit });
      // Keep only the few most recent pings (older ones have faded anyway).
      if (this.pings.length > 4) this.pings.shift();
      this.cooldownLeft = F.CONFIG.ping.cooldown;
    }

    update(dt) {
      if (this.cooldownLeft > 0) this.cooldownLeft -= dt;
      const speed = F.CONFIG.ping.speed, maxR = F.CONFIG.ping.maxRadius, fade = F.CONFIG.ping.revealFade;
      const maxLife = maxR / speed + fade;
      for (let i = this.pings.length - 1; i >= 0; i--) {
        this.pings[i].age += dt;
        if (this.pings[i].age > maxLife) this.pings.splice(i, 1);
      }
    }

    radius(ping) { return ping.age * F.CONFIG.ping.speed; }

    // Brightness 0..1 of a world point, accounting for occlusion + fade + passive.
    brightnessAt(px, py, world, player) {
      const speed = F.CONFIG.ping.speed, fade = F.CONFIG.ping.revealFade, maxR = F.CONFIG.ping.maxRadius;
      let best = 0;
      for (const p of this.pings) {
        const dx = px - p.x, dy = py - p.y;
        const dd = Math.hypot(dx, dy);
        if (dd > maxR) continue;
        const wf = p.age * speed;
        if (wf < dd) continue;                       // wavefront hasn't reached yet
        let ang = Math.atan2(dy, dx); if (ang < 0) ang += F.M.TAU;
        const idx = Math.round(ang / p.dAng) % p.nRays;
        // Tolerance grows with distance to cover the inter-ray gap (~dd*dAng) so a
        // point between two rays near max radius doesn't flicker dark.
        if (dd > p.dist[idx] + Math.max(8, dd * p.dAng + 6)) continue; // occluded by a nearer wall
        const since = p.age - dd / speed;
        const b = 1 - since / fade;
        if (b > best) best = b;
      }
      // Passive glow (very dim, line-of-sight checked).
      if (player) {
        const dd0 = Math.hypot(px - player.x, py - player.y);
        if (dd0 < this.passiveVision) {
          const ray = world.castRay(player.x, player.y, Math.atan2(py - player.y, px - player.x), dd0 + 2);
          if (!ray.hit || ray.dist >= dd0 - 2) {
            const b = (1 - dd0 / this.passiveVision) * 0.55;
            if (b > best) best = b;
          }
        }
      }
      return F.M.clamp(best, 0, 1);
    }
  }

  F.Sonar = Sonar;
})(window.FATHOM = window.FATHOM || {});
