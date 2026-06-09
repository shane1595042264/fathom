/*
 * FATHOM — oxygen, the second bind.
 *
 * Air drains constantly. Air pockets refill it fast, but surfacing for air forces
 * a loud GASP that the creature hears — so the resource you need most is guarded
 * by the act of getting it. Low air also muffles your hearing (panic), and
 * running out drowns you.
 */
(function (F) {
  'use strict';

  class Oxygen {
    constructor() { this.max = F.CONFIG.oxygen.start; this.air = this.max; this._refilling = false; this._gaspTimer = 0; }

    reset(maxAir) { this.max = maxAir; this.air = maxAir; this._refilling = false; this._gaspTimer = 0; this.drowning = false; this.drownTimer = 0; }

    get frac() { return F.M.clamp(this.air / this.max, 0, 1); }
    get low() { return this.air <= F.CONFIG.oxygen.lowThreshold; }
    get critical() { return this.air <= F.CONFIG.oxygen.criticalThreshold; }

    update(dt, player, game) {
      const O = F.CONFIG.oxygen;
      // Are we sitting on an air pocket?
      let onAir = null;
      for (const a of game.world.airPockets) {
        if (F.M.dist(player.x, player.y, a.x, a.y) < F.TILE * 0.7) { onAir = a; break; }
      }

      if (onAir && this.air < this.max) {
        if (!this._refilling) { this._refilling = true; this._gaspTimer = 0; F.Audio.gasp(); }
        this.drowning = false; this.drownTimer = 0;
        this.air = Math.min(this.max, this.air + O.refillRate * dt);
        // Repeated gasping while refilling keeps making noise (risk).
        this._gaspTimer -= dt;
        if (this._gaspTimer <= 0) { this._gaspTimer = 0.6; game.emitNoise(player.x, player.y, O.gaspNoise, 'gasp'); }
        game.hud.cue('▲ surfacing — loud!', 1);
      } else if (this.air > 0) {
        this._refilling = false;
        // Fear spiral: the closer the Angler, the faster you breathe. sqrt(threat)
        // so it already bites at mid-range, not just on contact.
        const fear = game.juice ? game.juice.threat : 0;
        const mult = 1 + (O.fearDrainMult - 1) * Math.sqrt(fear);
        this.air -= O.drainPerSec * mult * dt;
        if (this.air < 0) this.air = 0;
        // Ragged, accelerating gasps as you run critically low — an audio tell that
        // also carries (low air doesn't just suffocate you, it exposes you).
        if (this.critical) {
          this._gaspTimer -= dt;
          if (this._gaspTimer <= 0) {
            this._gaspTimer = F.M.lerp(0.55, 1.4, this.air / O.criticalThreshold);
            F.Audio.gasp();
            game.emitNoise(player.x, player.y, O.gaspNoise * 0.6, 'gasp');
          }
        } else { this._gaspTimer = 0; }
      } else {
        // Out of air: the involuntary drowning window. You thrash and gasp loudly
        // — a slim chance to reach a vent, but the creature now knows exactly where
        // you are.
        if (!this.drowning) { this.drowning = true; this.drownTimer = O.drownWindow; this._gaspTimer = 0; }
        this.drownTimer -= dt;
        this._gaspTimer -= dt;
        if (this._gaspTimer <= 0) {
          this._gaspTimer = 0.5;
          F.Audio.gasp();
          game.emitNoise(player.x, player.y, O.gaspNoise * 1.3, 'gasp');
          game.hud.cue('✸ DROWNING — find air', 1);
        }
        if (this.drownTimer <= 0 && player.alive) game.drown();
      }

      // Drowning muffles hearing and grays the screen (handled by renderer via critical).
      F.Audio.setSubmerged(this.air <= 0 ? 0.85 : (this.critical ? F.M.clamp(1 - this.air / O.criticalThreshold, 0, 1) * 0.85 : 0));
    }
  }

  F.Oxygen = Oxygen;
})(window.FATHOM = window.FATHOM || {});
