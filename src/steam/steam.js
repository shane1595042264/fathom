/*
 * FATHOM — Steam integration shim.
 *
 * The game is platform-agnostic. In the Electron/Steam build, the preload exposes
 * `window.fathomNative.steam`, which bridges to steamworks.js in the main process.
 * On the web (or if the native module isn't installed) every call is a safe no-op,
 * so the exact same game code ships everywhere.
 *
 * Achievement API names here MUST match what you create in Steamworks (see
 * steam/achievements.md).
 */
(function (F) {
  'use strict';

  const bridge = (typeof window !== 'undefined') ? window.fathomNative : null;
  const steam = bridge && bridge.steam;

  const ACH = {
    DEPTH_5: 'REACH_DEPTH_5',
    DEPTH_10: 'REACH_DEPTH_10',
    DEPTH_15: 'REACH_DEPTH_15',
    DEPTH_20: 'REACH_DEPTH_20',
    NO_PING_DESCENT: 'SILENT_DESCENT',
    STANDOFF: 'SURVIVED_A_STANDOFF',
    FIRST_BLOOD: 'FIRST_DESCENT'
  };

  const SteamAPI = {
    enabled: !!(bridge && bridge.isSteam),
    ACH,
    submitScore(depth, score) {
      if (!steam) return;
      try { steam.submitLeaderboard('DEEPEST_DESCENT', depth | 0); steam.submitLeaderboard('HIGH_SCORE', score | 0); } catch (e) {}
    },
    unlock(api) {
      if (!steam || !api) return;
      try { steam.unlock(api); } catch (e) {}
    },
    richPresence(text) {
      if (!steam || !steam.richPresence) return;
      try { steam.richPresence(text); } catch (e) {}
    },
    // Unlock the depth-milestone achievement(s) for a newly reached depth.
    onDepthReached(depth) {
      if (depth >= 5) this.unlock(ACH.DEPTH_5);
      if (depth >= 10) this.unlock(ACH.DEPTH_10);
      if (depth >= 15) this.unlock(ACH.DEPTH_15);
      if (depth >= 20) this.unlock(ACH.DEPTH_20);
    }
  };

  F.SteamAPI = SteamAPI;
})(window.FATHOM = window.FATHOM || {});
