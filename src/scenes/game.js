/*
 * FATHOM — the game scene. Owns the run and wires every system together each
 * frame: player makes noise -> the Angler(s) hear it -> sonar/oxygen update ->
 * win/lose checks -> render + HUD + post-fx. The little methods at the bottom
 * (emitNoise/registerThreat/killPlayer/drown/onPing) are the hooks the other
 * systems call back into.
 */
(function (F) {
  'use strict';

  class GameScene extends F.Scene {
    constructor() {
      super();
      this.world = new F.World();
      this.player = new F.Player();
      this.sonar = new F.Sonar();
      this.oxygen = new F.Oxygen();
      this.juice = new F.Juice();
      this.hud = new F.HUD();
      this.entities = [];
      this.renderer = null;
      this.frameNoises = [];
      this.fps = 60;
    }

    enter(params) {
      this.settings = F.settings;
      this.juice.settings = F.settings;
      if (params.reset || !this.runSeed) {
        this.runSeed = F.randomSeed();
        this.depth = 1; this.score = 0; this.runBeacons = 0;
        this.meta = F.Storage.loadMeta();
        this.meta.runs = (this.meta.runs || 0) + 1; this.meta.seenIntro = true;
        F.Storage.saveMeta(this.meta);
      }
      if (!this.renderer) this.renderer = new F.Renderer(F.ctx);
      this.startLevel();
    }

    startLevel() {
      const prog = F.Progression.forDepth(this.depth);
      this.levelSeed = (this.runSeed + this.depth * 2654435761) >>> 0;
      this.world.generate(this.depth, this.levelSeed);
      this.sonar.reset();
      this.sonar.passiveVision = prog.passiveVision;
      this.player.spawn(this.world.start.x, this.world.start.y);
      this.oxygen.reset(prog.oxygenStart);

      this.entities = [];
      for (let i = 0; i < prog.entityCount; i++) {
        const s = this.world.entitySpawns[i % this.world.entitySpawns.length];
        const e = new F.Entity(this.world, s.x, s.y, prog.entitySpeed);
        e.hearMult = prog.hearMult;
        this.entities.push(e);
      }

      this.beaconsCollected = 0;
      this.exitOpen = false;
      this.juice.reset();
      this.hud.reset();
      this.time = 0; this.levelTime = 0;
      this.state = 'playing';
      this.endTimer = 0; this.deathCause = '';
      this._threat = 0;
      this.style = 1; this._blindTimer = 0;
      this.pingsThisDepth = 0;
      this.juice.flash(0.3, '127,233,255');
      this.hud.cue(`DEPTH ${String(this.depth).padStart(2, '0')} — recover ${this.world.beacons.length} beacons`, 1);
      F.Audio.startAmbience();
      if (F.SteamAPI) { F.SteamAPI.richPresence('Diving — depth ' + this.depth); F.SteamAPI.onDepthReached(this.depth); }
    }

    update(dt) {
      this.fps = F.M.damp(this.fps, 1 / Math.max(dt, 1e-4), 3, dt);
      const I = F.Input;

      if (this.state === 'playing') {
        if (I.pressed('pause')) { F.SM.pushOverlay('pause'); return; }
        this.time += dt; this.levelTime += dt;
        this.frameNoises.length = 0; this._threat = 0;

        this.player.update(dt, I, this.world, this, this.settings);
        this.oxygen.update(dt, this.player, this);

        for (const e of this.entities) {
          for (const n of this.frameNoises) e.hear(n);
          e.update(dt, this.player, this);
        }

        this.sonar.update(dt);

        // Style multiplier: climbs while you navigate blind, rewarding nerve.
        this._blindTimer += dt;
        this.style = Math.min(F.CONFIG.score.styleMax, 1 + this._blindTimer * F.CONFIG.score.styleGain);

        this._checkBeacons();
        this._checkExit();

        this.juice.threat = F.M.damp(this.juice.threat, this._threat, 8, dt);
        // Floor keeps a faint resting heartbeat always idling ("is that my heart…").
        const tension = Math.max(0.06, this.juice.threat, this.oxygen.critical ? 0.7 : this.oxygen.low ? 0.4 : 0);
        F.Audio.setTension(tension);
        this.juice.update(dt);
        this.hud.update(dt);
      } else if (this.state === 'dying') {
        this.endTimer -= dt;
        this.sonar.update(dt);
        this.juice.update(dt);
        this.hud.update(dt);
        F.Audio.setTension(0);
        if (this.endTimer <= 0) this._toGameOver();
      }
    }

    draw(ctx) {
      this.renderer.draw(this);
      this.hud.draw(ctx, this);
      this.juice.drawOverlay(ctx, this);
      if (this.state === 'dying') {
        // Let the face/lunge beat land for ~0.5s before the verdict fades in.
        const elapsed = 1.5 - this.endTimer;
        const k = F.M.clamp((elapsed - 0.5) / 1.0, 0, 1);
        if (k > 0) F.UI.title(ctx, this.deathCause === 'drowned' ? 'DROWNED' : 'TAKEN', F.VIEW.w / 2, F.VIEW.h / 2, 56, k * 0.9);
      }
    }

    // ---- win/lose checks ----
    _checkBeacons() {
      const TILE = F.TILE;
      for (const b of this.world.beacons) {
        if (b.collected) continue;
        if (F.M.dist(this.player.x, this.player.y, b.x, b.y) < TILE * 0.7) {
          b.collected = true; this.beaconsCollected++; this.runBeacons++;
          this.score += Math.floor(F.CONFIG.score.perBeacon * this.style);
          F.Audio.beacon();
          this.juice.flash(0.22, '255,209,102');
          if (this.beaconsCollected >= this.world.beacons.length) {
            this.exitOpen = true;
            this.hud.cue('the descent has opened', 1);
            F.Audio.beacon(); F.Audio.stinger();
          } else {
            this.hud.cue(`beacon recovered  ${this.beaconsCollected}/${this.world.beacons.length}`, 0.9);
          }
        }
      }
    }

    _checkExit() {
      if (!this.exitOpen || !this.world.exit) return;
      if (F.M.dist(this.player.x, this.player.y, this.world.exit.x, this.world.exit.y) < F.TILE * 0.7) this._descend();
    }

    _descend() {
      const airBank = Math.floor(this.oxygen.air * F.CONFIG.score.airBonusPerSecAtDescent);
      this.score += Math.floor(F.CONFIG.score.perDepth * this.style) + airBank;
      if (this.pingsThisDepth === 0 && F.SteamAPI) F.SteamAPI.unlock(F.SteamAPI.ACH.NO_PING_DESCENT);
      this.depth++;
      this.meta.deepest = Math.max(this.meta.deepest || 0, this.depth);
      F.Storage.saveMeta(this.meta);
      F.Audio.descend();
      this.juice.flash(0.5, '124,255,178'); this.juice.shake(6);
      this.startLevel();
    }

    // ---- hooks called by systems ----
    emitNoise(x, y, loudness, type) { this.frameNoises.push({ x, y, loudness, type }); }
    registerThreat(dist, entity) {
      const t = F.M.clamp(1 - dist / F.CONFIG.entity.dreadRadius, 0, 1);
      if (t > this._threat) { this._threat = t; this._threatEntity = entity || null; }
    }
    onStandoffSurvived() {
      this.hud.cue('it lost you', 0.8);
      if (F.SteamAPI) F.SteamAPI.unlock(F.SteamAPI.ACH.STANDOFF);
    }

    onPing(x, y) {
      // Pinging spends your accumulated nerve: the style multiplier drops back.
      this.style = Math.max(1, 1 + (this.style - 1) * F.CONFIG.score.styleOnPing);
      this._blindTimer = (this.style - 1) / F.CONFIG.score.styleGain;
      this.pingsThisDepth++;
      const E = F.CONFIG.entity;
      for (const e of this.entities) {
        const d = F.M.dist(x, y, e.x, e.y);
        if (d < E.faceRadius) {
          const ray = this.world.castRay(x, y, Math.atan2(e.y - y, e.x - x), d + 2);
          if (!ray.hit || ray.dist >= d - 2) {
            if (Math.random() < E.faceScareChance) {
              this.juice.triggerFace(e);
              const pan = F.M.clamp((e.x - x) / (F.VIEW.w * 0.5), -1, 1);
              F.Audio.faceScare(pan);
            }
            break;
          }
        }
      }
    }

    killPlayer(entity) {
      if (!this.player.alive) return;
      this.player.alive = false; this.state = 'dying'; this.deathCause = 'caught'; this.endTimer = 1.5;
      F.Audio.death(); this.juice.triggerDeath(); this.juice.shake(22); this.juice.triggerFace(entity);
      F.Audio.stopAmbience();
      this.meta.deaths = (this.meta.deaths || 0) + 1; F.Storage.saveMeta(this.meta);
    }

    drown() {
      if (!this.player.alive) return;
      this.player.alive = false; this.state = 'dying'; this.deathCause = 'drowned'; this.endTimer = 1.5;
      F.Audio.death(); this.juice.triggerDeath(); this.juice.shake(14);
      F.Audio.stopAmbience();
      this.meta.deaths = (this.meta.deaths || 0) + 1; F.Storage.saveMeta(this.meta);
    }

    _toGameOver() {
      this.meta.beaconsTotal = (this.meta.beaconsTotal || 0) + 0;
      F.Storage.saveMeta(this.meta);
      const entry = {
        score: Math.floor(this.score),
        depth: this.depth,
        beacons: this.runBeacons,
        cause: this.deathCause,
        date: Date.now()
      };
      const res = F.Storage.addScore(entry);
      if (F.SteamAPI) { F.SteamAPI.submitScore(this.depth, entry.score); F.SteamAPI.unlock(F.SteamAPI.ACH.FIRST_BLOOD); }
      F.SM.go('gameover', { entry, res, cause: this.deathCause, depth: this.depth, score: entry.score });
    }
  }

  F.SM.register('game', new GameScene());
})(window.FATHOM = window.FATHOM || {});
