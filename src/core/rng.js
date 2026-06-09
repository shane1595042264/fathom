/*
 * FATHOM — deterministic, seedable RNG (mulberry32).
 * A seeded generator means a given "depth seed" always produces the same maze,
 * which is great for daily-challenge runs and for reproducing bugs.
 */
(function (F) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) { this.seed = (seed >>> 0) || 1; this._n = mulberry32(this.seed); }
    next() { return this._n(); }                              // [0,1)
    range(lo, hi) { return lo + this._n() * (hi - lo); }
    int(lo, hi) { return Math.floor(this.range(lo, hi + 1)); } // inclusive
    chance(p) { return this._n() < p; }
    pick(arr) { return arr[Math.floor(this._n() * arr.length)]; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this._n() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  }

  // A non-deterministic seed source for normal runs.
  F.randomSeed = function () { return (Math.floor(Math.random() * 0xffffffff)) >>> 0; };
  F.RNG = RNG;
})(window.FATHOM = window.FATHOM || {});
