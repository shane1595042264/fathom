/*
 * FATHOM — input. Keyboard + mouse + gamepad, mapped to abstract actions so the
 * rest of the game never reads raw keycodes. Edge detection ("just pressed") is
 * computed once per frame in update().
 */
(function (F) {
  'use strict';

  // action -> list of physical bindings
  const KEYMAP = {
    up:     ['KeyW', 'ArrowUp'],
    down:   ['KeyS', 'ArrowDown'],
    left:   ['KeyA', 'ArrowLeft'],
    right:  ['KeyD', 'ArrowRight'],
    ping:   ['Space', 'KeyJ', 'Enter'],
    quiet:  ['ShiftLeft', 'ShiftRight'],
    pause:  ['Escape', 'KeyP'],
    back:   ['Escape'],
    confirm:['Enter', 'Space'],
    restart:['KeyR'],
    mute:   ['KeyM']
  };

  class Input {
    constructor() {
      this.keys = new Set();
      this.prev = new Set();
      // Latch of codes that received a keydown since the last postUpdate(). This
      // makes "pressed" robust to presses shorter than a frame (fast taps, and
      // synthetic test input) — edge sampling alone would miss a sub-frame keyup.
      this.pressedKeys = new Set();
      this.pointer = { x: F.VIEW.w / 2, y: F.VIEW.h / 2, down: false, prevDown: false, moved: false, pressed: false };
      this.gamepadIndex = null;
      this.gp = { buttons: [], axes: [0, 0, 0, 0], prevButtons: [] };
      this.anyInputThisFrame = false;
      this._canvas = null;
    }

    init(canvas) {
      this._canvas = canvas;
      window.addEventListener('keydown', (e) => {
        // Prevent the page from scrolling on space/arrows.
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        if (!e.repeat) { this.keys.add(e.code); this.pressedKeys.add(e.code); }
        this.anyInputThisFrame = true;
      });
      window.addEventListener('keyup', (e) => this.keys.delete(e.code));
      window.addEventListener('blur', () => { this.keys.clear(); this.pointer.down = false; });

      const setPointer = (e) => {
        const r = canvas.getBoundingClientRect();
        const sx = F.VIEW.w / r.width, sy = F.VIEW.h / r.height;
        this.pointer.x = (e.clientX - r.left) * sx;
        this.pointer.y = (e.clientY - r.top) * sy;
        this.pointer.moved = true;
      };
      window.addEventListener('mousemove', setPointer);
      canvas.addEventListener('mousedown', (e) => { setPointer(e); this.pointer.down = true; this.pointer.pressed = true; this.anyInputThisFrame = true; });
      window.addEventListener('mouseup', () => { this.pointer.down = false; });

      // Touch (basic, for tablets / Steam Deck touchscreen): left half = move via
      // virtual stick from touch start, tap right half = ping.
      this.touch = { active: false, ox: 0, oy: 0, x: 0, y: 0, pingTap: false };
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        for (const t of e.changedTouches) {
          const px = (t.clientX - r.left);
          if (px < r.width * 0.5) { this.touch.active = true; this.touch.ox = t.clientX; this.touch.oy = t.clientY; this.touch.x = t.clientX; this.touch.y = t.clientY; }
          else { this.touch.pingTap = true; }
        }
        this.anyInputThisFrame = true;
      }, { passive: false });
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) { this.touch.x = t.clientX; this.touch.y = t.clientY; }
      }, { passive: false });
      canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.touch.active = false; }, { passive: false });

      window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
      window.addEventListener('gamepaddisconnected', () => { this.gamepadIndex = null; });
    }

    pollGamepad() {
      if (this.gamepadIndex === null || !navigator.getGamepads) return;
      const pad = navigator.getGamepads()[this.gamepadIndex];
      if (!pad) return;
      this.gp.prevButtons = this.gp.buttons;
      this.gp.buttons = pad.buttons.map((b) => b.pressed);
      this.gp.axes = pad.axes.slice();
      if (this.gp.buttons.some(Boolean) || Math.abs(pad.axes[0]) > 0.3 || Math.abs(pad.axes[1]) > 0.3) {
        this.anyInputThisFrame = true;
      }
    }

    update() {
      this.pollGamepad();
    }

    // Call AFTER the frame's logic to clear per-frame latches.
    postUpdate() {
      this.prev = new Set(this.keys);
      this.pressedKeys.clear();
      this.pointer.prevDown = this.pointer.down;
      this.pointer.pressed = false;
      this.pointer.moved = false;
      this.touch.pingTap = false;
      this.anyInputThisFrame = false;
    }

    _anyKey(list) { for (const k of list) if (this.keys.has(k)) return true; return false; }
    _anyLatched(list) { for (const k of list) if (this.pressedKeys.has(k)) return true; return false; }

    down(action) {
      const list = KEYMAP[action] || [];
      if (this._anyKey(list)) return true;
      return this._gpDown(action);
    }
    pressed(action) { // true once per physical press (latched; robust to fast taps)
      const list = KEYMAP[action] || [];
      return this._anyLatched(list) || this._gpPressed(action);
    }

    pointerClicked() { return this.pointer.pressed; }

    // Clear per-frame press latches. Called on scene changes so the key/click that
    // confirmed one screen doesn't immediately trigger the default item of the next.
    clearLatches() { this.pressedKeys.clear(); this.pointer.pressed = false; if (this.touch) this.touch.pingTap = false; }

    // Gamepad action mapping (standard layout).
    _gpButton(action) {
      switch (action) {
        case 'ping': return [0, 7];       // A / RT
        case 'quiet': return [4, 6];      // LB / LT (bumper, matches docs)
        case 'pause': return [9];         // Start
        case 'back': return [1, 8];       // B / Select
        case 'confirm': return [0];       // A
        case 'restart': return [3];       // Y
        default: return [];
      }
    }
    _gpDown(action) { const b = this._gpButton(action); for (const i of b) if (this.gp.buttons[i]) return true; return false; }
    _gpPressed(action) { const b = this._gpButton(action); for (const i of b) if (this.gp.buttons[i] && !this.gp.prevButtons[i]) return true; return false; }

    // Normalized desired-move vector in [-1,1]^2 (deadzoned, clamped to unit).
    axis() {
      let x = 0, y = 0;
      if (this.down('left')) x -= 1;
      if (this.down('right')) x += 1;
      if (this.down('up')) y -= 1;
      if (this.down('down')) y += 1;
      // Gamepad left stick.
      const ax = this.gp.axes[0] || 0, ay = this.gp.axes[1] || 0;
      if (Math.abs(ax) > 0.18) x += ax;
      if (Math.abs(ay) > 0.18) y += ay;
      // Touch virtual stick.
      if (this.touch && this.touch.active) {
        const dx = this.touch.x - this.touch.ox, dy = this.touch.y - this.touch.oy;
        const m = Math.hypot(dx, dy);
        if (m > 8) { x += dx / 60; y += dy / 60; }
      }
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      return { x, y };
    }

    pingPressed() { return this.pressed('ping') || this.pointer.pressed || (this.touch && this.touch.pingTap); }
  }

  F.Input = new Input();
})(window.FATHOM = window.FATHOM || {});
