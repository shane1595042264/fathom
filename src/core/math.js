/* FATHOM — small math helpers. Plain functions, no allocations in hot paths. */
(function (F) {
  'use strict';

  const M = {
    clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    // Frame-rate-independent exponential smoothing factor.
    damp(a, b, lambda, dt) { return M.lerp(a, b, 1 - Math.exp(-lambda * dt)); },
    sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; },
    dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); },
    dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
    len(x, y) { return Math.sqrt(x * x + y * y); },
    // Smoothstep 0..1.
    smooth(t) { t = M.clamp(t, 0, 1); return t * t * (3 - 2 * t); },
    // Angle helpers.
    angle(dx, dy) { return Math.atan2(dy, dx); },
    angleLerp(a, b, t) {
      let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (d < -Math.PI) d += Math.PI * 2;
      return a + d * t;
    },
    TAU: Math.PI * 2
  };

  F.M = M;
})(window.FATHOM = window.FATHOM || {});
