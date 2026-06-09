/*
 * FATHOM — world: procedural flooded labyrinth + collision + raycasting.
 *
 * The world is a grid of square tiles (1 = wall, 0 = flooded floor). We carve a
 * perfect maze with a randomized depth-first backtracker, then "braid" some
 * dead-ends into loops so the space feels like a structure to be hunted through
 * rather than a single thread. Beacons (collect to open the descent), air pockets
 * (refill oxygen), and the descent hatch are scattered with spacing rules.
 *
 * Raycasting (castRay) is the basis of all vision: the sonar reveal and the
 * faint passive glow are both "what can the player see from here", so walls
 * naturally occlude the reveal.
 */
(function (F) {
  'use strict';

  const TILE = F.TILE;

  class World {
    constructor() {
      this.cols = 0; this.rows = 0;
      this.grid = null;          // Uint8Array cols*rows
      this.start = { x: 0, y: 0 };
      this.exit = null;          // {tx,ty,x,y} descent hatch
      this.beacons = [];         // [{x,y,collected}]
      this.airPockets = [];      // [{x,y,tx,ty}]
      this.seed = 0;
    }

    idx(tx, ty) { return ty * this.cols + tx; }
    inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows; }
    isWallTile(tx, ty) { return !this.inBounds(tx, ty) || this.grid[this.idx(tx, ty)] === 1; }
    isWallPx(x, y) { return this.isWallTile(Math.floor(x / TILE), Math.floor(y / TILE)); }
    tileCenter(tx, ty) { return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }; }
    get pxW() { return this.cols * TILE; }
    get pxH() { return this.rows * TILE; }

    generate(depth, seed) {
      const C = F.CONFIG.world, S = F.SCALING;
      this.seed = seed >>> 0;
      const rng = new F.RNG(this.seed);

      // Maze dimensions must be odd for the backtracker.
      let cols = C.baseCols + (depth - 1) * C.growthPerDepth;
      let rows = C.baseRows + (depth - 1) * C.growthPerDepth;
      cols = Math.min(C.maxCols, cols | 1);
      rows = Math.min(C.maxRows, rows | 1);
      this.cols = cols; this.rows = rows;

      const g = this.grid = new Uint8Array(cols * rows).fill(1);

      // Recursive backtracker over odd cells.
      const carve = (cx, cy) => {
        g[this.idx(cx, cy)] = 0;
        const dirs = rng.shuffle([[0, -2], [0, 2], [-2, 0], [2, 0]]);
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && g[this.idx(nx, ny)] === 1) {
            g[this.idx(cx + dx / 2, cy + dy / 2)] = 0; // knock down wall between
            carve(nx, ny);
          }
        }
      };
      carve(1, 1);

      // Open the starting chamber so you never spawn in a 1-wide dead-end.
      const sr = C.startRoom;
      for (let ty = 1; ty < 1 + sr && ty < rows - 1; ty++)
        for (let tx = 1; tx < 1 + sr && tx < cols - 1; tx++)
          g[this.idx(tx, ty)] = 0;

      // Carve scattered open rooms — space to dodge the Angler and circle around it
      // instead of being trapped in a single corridor.
      const roomCount = Math.round(C.roomsBase + (depth - 1) * C.roomsPerDepth);
      for (let r = 0; r < roomCount; r++) {
        const rw = rng.int(C.roomMinSize, C.roomMaxSize);
        const rh = rng.int(C.roomMinSize, C.roomMaxSize);
        const rx = rng.int(1, Math.max(1, cols - 1 - rw));
        const ry = rng.int(1, Math.max(1, rows - 1 - rh));
        for (let ty = ry; ty < ry + rh && ty < rows - 1; ty++)
          for (let tx = rx; tx < rx + rw && tx < cols - 1; tx++)
            g[this.idx(tx, ty)] = 0;
      }

      // Braid: open most dead-ends to create loops (open, navigable structure).
      for (let ty = 1; ty < rows - 1; ty++) {
        for (let tx = 1; tx < cols - 1; tx++) {
          if (g[this.idx(tx, ty)] !== 0) continue;
          // Count open neighbors.
          let open = 0; const walls = [];
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            if (g[this.idx(tx + dx, ty + dy)] === 0) open++;
            else walls.push([tx + dx, ty + dy]);
          }
          if (open === 1 && walls.length && rng.chance(C.braidChance)) {
            const w = rng.pick(walls);
            // Don't open the outer border.
            if (w[0] > 0 && w[1] > 0 && w[0] < cols - 1 && w[1] < rows - 1) g[this.idx(w[0], w[1])] = 0;
          }
        }
      }

      // Gather all floor cells for placement.
      const floors = [];
      for (let ty = 1; ty < rows - 1; ty++)
        for (let tx = 1; tx < cols - 1; tx++)
          if (g[this.idx(tx, ty)] === 0) floors.push([tx, ty]);

      // Player start near a corner.
      this.start = this.tileCenter(1, 1);
      const startTile = [1, 1];

      // Helper: pick floor tiles far from a set of points (BFS distance in tiles).
      const distFrom = this._bfsDistances(startTile);

      // Beacons: spread out, biased toward far tiles.
      const beaconCount = C.beaconsBase + (depth - 1) * C.beaconsPerDepth;
      this.beacons = [];
      const used = new Set([this.idx(1, 1)]);
      const farSorted = floors.slice().sort((a, b) =>
        (distFrom[this.idx(b[0], b[1])] || 0) - (distFrom[this.idx(a[0], a[1])] || 0));
      let bi = 0;
      while (this.beacons.length < beaconCount && bi < farSorted.length) {
        const [tx, ty] = farSorted[bi++];
        if (this._spaced(tx, ty, this.beacons, 4) && !used.has(this.idx(tx, ty))) {
          const c = this.tileCenter(tx, ty);
          this.beacons.push({ x: c.x, y: c.y, tx, ty, collected: false });
          used.add(this.idx(tx, ty));
        }
      }

      // Exit hatch: the farthest floor tile from start (never the start tile itself).
      let exT = farSorted[0] || [cols - 2, rows - 2];
      if (exT[0] === 1 && exT[1] === 1) exT = farSorted[1] || [cols - 2, rows - 2];
      const exC = this.tileCenter(exT[0], exT[1]);
      this.exit = { tx: exT[0], ty: exT[1], x: exC.x, y: exC.y };

      // Air pockets: scattered, away from start & each other.
      const airCount = C.airPocketsBase;
      this.airPockets = [];
      const shuffled = rng.shuffle(floors.slice());
      for (const [tx, ty] of shuffled) {
        if (this.airPockets.length >= airCount) break;
        if (this.idx(tx, ty) === this.idx(1, 1)) continue;
        if (this._spaced(tx, ty, this.airPockets, 5) && this._spaced(tx, ty, this.beacons, 2)) {
          const c = this.tileCenter(tx, ty);
          this.airPockets.push({ x: c.x, y: c.y, tx, ty });
        }
      }

      // Entity spawn tiles: far from the player start.
      this.entitySpawns = farSorted.slice(0, 8).map(([tx, ty]) => this.tileCenter(tx, ty));
      this.floors = floors;
      return this;
    }

    _spaced(tx, ty, list, minTiles) {
      for (const o of list) {
        if (Math.abs(o.tx - tx) + Math.abs(o.ty - ty) < minTiles) return false;
      }
      return true;
    }

    // BFS tile distances from a start tile (in tile steps); used for placement.
    _bfsDistances(start) {
      const dist = new Int32Array(this.cols * this.rows).fill(-1);
      const q = [start]; dist[this.idx(start[0], start[1])] = 0;
      let head = 0;
      while (head < q.length) {
        const [cx, cy] = q[head++];
        const d = dist[this.idx(cx, cy)];
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const nx = cx + dx, ny = cy + dy;
          if (this.inBounds(nx, ny) && this.grid[this.idx(nx, ny)] === 0 && dist[this.idx(nx, ny)] === -1) {
            dist[this.idx(nx, ny)] = d + 1; q.push([nx, ny]);
          }
        }
      }
      const out = {};
      for (let i = 0; i < dist.length; i++) if (dist[i] >= 0) out[i] = dist[i];
      return out;
    }

    // Cast a ray from (x,y) at `ang`; return distance to first wall (or maxDist).
    // Uses fine stepping with a short bisection refine for a clean edge.
    castRay(x, y, ang, maxDist) {
      const step = 5;
      const cx = Math.cos(ang), cy = Math.sin(ang);
      let d = 0, px = x, py = y;
      while (d < maxDist) {
        d += step; px = x + cx * d; py = y + cy * d;
        if (this.isWallPx(px, py)) {
          // Refine the hit point for a crisper wall edge.
          let lo = d - step, hi = d;
          for (let i = 0; i < 4; i++) {
            const mid = (lo + hi) * 0.5;
            if (this.isWallPx(x + cx * mid, y + cy * mid)) hi = mid; else lo = mid;
          }
          return { dist: lo, hit: true, x: x + cx * lo, y: y + cy * lo };
        }
      }
      return { dist: maxDist, hit: false, x: px, y: py };
    }

    // Resolve a circle out of solid tiles. Returns {x,y,hit,push} where push is
    // the magnitude of correction (used to detect hard "bumps").
    collideCircle(x, y, r) {
      let hit = false, push = 0;
      const minTx = Math.floor((x - r) / TILE), maxTx = Math.floor((x + r) / TILE);
      const minTy = Math.floor((y - r) / TILE), maxTy = Math.floor((y + r) / TILE);
      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          if (!this.isWallTile(tx, ty)) continue;
          const left = tx * TILE, top = ty * TILE, right = left + TILE, bot = top + TILE;
          const nx = F.M.clamp(x, left, right), ny = F.M.clamp(y, top, bot);
          let dx = x - nx, dy = y - ny;
          let d = Math.hypot(dx, dy);
          if (d < r) {
            hit = true;
            if (d === 0) {
              // Center inside the tile: push out along the smallest axis.
              const toL = x - left, toR = right - x, toT = y - top, toB = bot - y;
              const m = Math.min(toL, toR, toT, toB);
              if (m === toL) { x = left - r; } else if (m === toR) { x = right + r; }
              else if (m === toT) { y = top - r; } else { y = bot + r; }
              push = Math.max(push, r);
            } else {
              const overlap = r - d;
              x += (dx / d) * overlap; y += (dy / d) * overlap;
              push = Math.max(push, overlap);
            }
          }
        }
      }
      return { x, y, hit, push };
    }
  }

  F.World = World;
})(window.FATHOM = window.FATHOM || {});
