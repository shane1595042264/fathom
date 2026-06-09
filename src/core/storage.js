/*
 * FATHOM — persistence for settings + local leaderboard.
 *
 * Uses localStorage when available (works from file:// in Chrome/Edge and in the
 * Electron build). All access is guarded so the game still runs if storage is
 * blocked (e.g. private mode) — it just won't persist.
 */
(function (F) {
  'use strict';

  const KEY_SETTINGS = 'fathom.settings.v1';
  const KEY_SCORES = 'fathom.scores.v1';
  const KEY_META = 'fathom.meta.v1';

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  const Storage = {
    loadSettings() {
      const raw = safeGet(KEY_SETTINGS);
      const base = Object.assign({}, F.DEFAULT_SETTINGS);
      if (!raw) return base;
      try { return Object.assign(base, JSON.parse(raw)); } catch (e) { return base; }
    },
    saveSettings(s) { safeSet(KEY_SETTINGS, JSON.stringify(s)); },

    loadScores() {
      const raw = safeGet(KEY_SCORES);
      if (!raw) return [];
      try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    },
    // Returns {rank, isBest} for the submitted run.
    addScore(entry) {
      const scores = Storage.loadScores();
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      const rank = scores.indexOf(entry) + 1;
      const trimmed = scores.slice(0, 10);
      safeSet(KEY_SCORES, JSON.stringify(trimmed));
      return { rank, isBest: rank === 1, table: trimmed };
    },
    bestScore() {
      const s = Storage.loadScores();
      return s.length ? s[0].score : 0;
    },

    loadMeta() {
      const raw = safeGet(KEY_META);
      const base = { runs: 0, deaths: 0, deepest: 0, beaconsTotal: 0, seenIntro: false, tutorialDone: false };
      if (!raw) return base;
      try { return Object.assign(base, JSON.parse(raw)); } catch (e) { return base; }
    },
    saveMeta(m) { safeSet(KEY_META, JSON.stringify(m)); }
  };

  F.Storage = Storage;
})(window.FATHOM = window.FATHOM || {});
