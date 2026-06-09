/*
 * FATHOM — the diver.
 *
 * Movement is momentum-based (you're in water): you accelerate toward the stick
 * direction and drift to a stop. The key tension lives here: swimming fast is
 * loud, swimming quietly (hold Shift) is slow but near-silent, and bumping a wall
 * in the dark is loud. Every loud thing is reported to the game as a "noise" the
 * creature can hear. Pinging is also issued here — the loudest act of all.
 */
(function (F) {
  'use strict';

  class Player {
    constructor() {
      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.radius = F.CONFIG.player.radius;
      this.facing = 0;
      this.alive = true;
      this._swimNoiseTimer = 0;
      this.speed = 0;
      this.atAir = null;        // air pocket currently overlapped (set by game)
      this.movingLoud = false;
    }

    spawn(x, y) {
      this.x = x; this.y = y; this.vx = 0; this.vy = 0;
      this.alive = true; this.facing = 0; this._swimNoiseTimer = 0;
    }

    update(dt, input, world, game, settings) {
      if (!this.alive) return;
      const P = F.CONFIG.player;

      // Ping (core verb).
      if (input.pingPressed() && game.sonar.canPing()) {
        game.sonar.emit(this.x, this.y, world);
        F.Audio.ping();
        game.emitNoise(this.x, this.y, F.CONFIG.ping.noise, 'ping');
        game.onPing(this.x, this.y);
        game.oxygen.air = Math.max(0, game.oxygen.air - F.CONFIG.ping.oxygenCost);
        game.juice.flash(0.5);
        game.juice.shake(2.5);
      }

      // Desired movement.
      const ax = input.axis();
      let quiet = input.down('quiet');
      if (settings.invertQuiet) quiet = !quiet;
      const targetSpeed = quiet ? P.maxSpeed * P.quietSpeedMult : P.maxSpeed;
      const desVx = ax.x * targetSpeed, desVy = ax.y * targetSpeed;

      // Accelerate toward desired velocity, then water drag.
      this.vx += (desVx - this.vx) * F.M.clamp(P.accel * dt / Math.max(1, P.maxSpeed), 0, 1);
      this.vy += (desVy - this.vy) * F.M.clamp(P.accel * dt / Math.max(1, P.maxSpeed), 0, 1);
      this.vx -= this.vx * P.drag * dt;
      this.vy -= this.vy * P.drag * dt;

      const preSpeed = Math.hypot(this.vx, this.vy);

      // Integrate + collide.
      this.x += this.vx * dt; this.y += this.vy * dt;
      const c = world.collideCircle(this.x, this.y, this.radius);
      this.x = c.x; this.y = c.y;
      if (c.hit) {
        // Kill velocity into the wall; a hard bump makes noise.
        if (preSpeed > P.bumpSpeedThreshold && c.push > 1.2) {
          F.Audio.bump(F.M.clamp(preSpeed / P.maxSpeed, 0.3, 1));
          game.emitNoise(this.x, this.y, P.bumpNoise * F.M.clamp(preSpeed / P.maxSpeed, 0.4, 1), 'bump');
          game.juice.shake(3);
        }
        this.vx *= 0.2; this.vy *= 0.2;
      }

      this.speed = Math.hypot(this.vx, this.vy);
      if (this.speed > 6) this.facing = F.M.angleLerp(this.facing, Math.atan2(this.vy, this.vx), 0.3);

      // Continuous swim noise (heard by the creature). Quiet swimming barely carries.
      const moveFrac = this.speed / P.maxSpeed;
      this.movingLoud = moveFrac > 0.25 && !quiet;
      if (moveFrac > 0.12) {
        this._swimNoiseTimer -= dt;
        if (this._swimNoiseTimer <= 0) {
          this._swimNoiseTimer = 0.28;
          const lvl = (quiet ? P.quietSwimNoise : P.swimNoise) * moveFrac;
          game.emitNoise(this.x, this.y, lvl, 'swim');
        }
      }
    }
  }

  F.Player = Player;
})(window.FATHOM = window.FATHOM || {});
