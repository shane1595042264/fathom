/* FATHOM — tiny synchronous event bus used to decouple gameplay from audio/juice. */
(function (F) {
  'use strict';

  class Bus {
    constructor() { this.map = new Map(); }
    on(type, fn) {
      if (!this.map.has(type)) this.map.set(type, new Set());
      this.map.get(type).add(fn);
      return () => this.off(type, fn);
    }
    off(type, fn) { const s = this.map.get(type); if (s) s.delete(fn); }
    emit(type, payload) {
      const s = this.map.get(type);
      if (!s) return;
      for (const fn of s) { try { fn(payload); } catch (e) { console.error('[bus]', type, e); } }
    }
    clear() { this.map.clear(); }
  }

  // Shared global bus. Event payloads carry world-space positions so audio can
  // pan/attenuate and juice can react (e.g. {x,y,loudness} for a noise).
  F.bus = new Bus();
  F.Bus = Bus;
})(window.FATHOM = window.FATHOM || {});
