// Lucky Lure: pure slot engine (5x3, 10 lines, fish money symbols, angler collect free spins).
// No DOM. Shared by the browser and the node simulation, so both run identical math.

export const REELS = 5, ROWS = 3, LINES_N = 10, MAX_WIN = 5000;
export const FLOATS_PER_SPIN = 34; // 15 cells + 15 fish values + 4 dynamite

// Symbol keys. j q k a = lows, L lure, B bobber, R rod, T tackle box, F fish (cash), W angler wild, S boat scatter.
export const SYMBOLS = {
  j: { name: 'Neon J', kind: 'low' },
  q: { name: 'Neon Q', kind: 'low' },
  k: { name: 'Neon K', kind: 'low' },
  a: { name: 'Neon A', kind: 'low' },
  L: { name: 'Dragonfly Lure', kind: 'high' },
  B: { name: 'Glow Bobber', kind: 'high' },
  R: { name: 'Fishing Rod', kind: 'high' },
  T: { name: 'Tackle Box', kind: 'high' },
  F: { name: 'Cash Fish', kind: 'fish' },
  W: { name: 'Angler Wild', kind: 'wild' },
  S: { name: 'Boat Scatter', kind: 'scatter' },
};
export const KEYS = ['j', 'q', 'k', 'a', 'L', 'B', 'R', 'T', 'F', 'W', 'S'];

// Line pays, multiples of the LINE bet (total bet / 10), for 3 / 4 / 5 of a kind from reel 1.
export const PAYS = {
  j: [10, 30, 100], q: [10, 30, 100], k: [12, 40, 125], a: [12, 40, 125],
  L: [20, 60, 250], B: [20, 60, 250], R: [25, 100, 400], T: [40, 150, 750],
  F: [20, 75, 300],
};
export const SCATTER_SPINS = [10, 15, 20]; // 3 / 4 / 5 boats

// Fish cash values (× total bet) and their weights.
export const FISH_VALUES = [2, 5, 10, 15, 20, 25, 50, 250, 1000];
export const FISH_W = {
  base: [400, 260, 120, 60, 40, 30, 12, 1.2, 0.15],
  fs:   [400, 260, 120, 60, 40, 30, 12, 1.2, 0.15],
};

// Per-reel symbol weights, in KEYS order. Wild only on reels 2-5. No boats during free spins.
//                j   q   k   a   L   B   R   T   F   W   S
const BASE = [
  [30, 30, 26, 26, 11, 11, 8, 6, 7, 0, 4.4],
  [30, 30, 26, 26, 11, 11, 8, 6, 7, 5, 4.4],
  [30, 30, 26, 26, 11, 11, 8, 6, 7, 5, 4.4],
  [30, 30, 26, 26, 11, 11, 8, 6, 7, 5, 4.4],
  [30, 30, 26, 26, 11, 11, 8, 6, 7, 5, 4.4],
];
const FS = [
  [30, 30, 26, 26, 11, 11, 8, 6, 14, 0, 0],
  [30, 30, 26, 26, 11, 11, 8, 6, 14, 3.58, 0],
  [30, 30, 26, 26, 11, 11, 8, 6, 14, 3.58, 0],
  [30, 30, 26, 26, 11, 11, 8, 6, 14, 3.58, 0],
  [30, 30, 26, 26, 11, 11, 8, 6, 14, 3.58, 0],
];
export const WEIGHTS = { base: BASE, fs: FS };
export const DYNAMITE_P = 0.017; // base game: chance a fish-but-no-angler spin gets a splash angler

// Free spins progression: every 4 anglers collected = +10 spins and the next multiplier.
export const LEVEL_MULTS = [1, 2, 3, 10];
export const ANGLERS_PER_LEVEL = 4, RETRIGGER_SPINS = 10;

// Row index (0 top, 1 middle, 2 bottom) per reel, for each payline.
export const LINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 2, 1, 0, 1],
];

function pickW(ws, f) {
  let tot = 0; for (const w of ws) tot += w;
  let x = f * tot;
  for (let i = 0; i < ws.length; i++) { if ((x -= ws[i]) < 0) return i; }
  return ws.length - 1;
}
export const fishValue = (mode, f) => FISH_VALUES[pickW(FISH_W[mode], f)];

// Build grid[reel][row] and fish values from floats. At most one boat per reel.
export function buildGrid(f, mode) {
  const W = WEIGHTS[mode], grid = [], vals = [];
  for (let r = 0; r < REELS; r++) {
    const col = [], vcol = [];
    let boat = false;
    for (let row = 0; row < ROWS; row++) {
      const i = r * ROWS + row;
      let s = KEYS[pickW(W[r], f[i])];
      if (s === 'S') { if (boat) s = 'j'; boat = true; }
      col.push(s);
      vcol.push(s === 'F' ? fishValue(mode, f[15 + i]) : 0);
    }
    grid.push(col); vals.push(vcol);
  }
  return { grid, vals };
}

// Line wins (× total bet). Reel 1 never holds a wild, so the line symbol is grid[0][row].
export function evalLines(grid) {
  const lines = [];
  let total = 0;
  for (let li = 0; li < LINES_N; li++) {
    const L = LINES[li], sym = grid[0][L[0]];
    if (!PAYS[sym]) continue;
    let n = 1;
    while (n < REELS) { const g = grid[n][L[n]]; if (g === sym || g === 'W') n++; else break; }
    if (n < 3) continue;
    const win = PAYS[sym][n - 3] / LINES_N;
    total += win;
    lines.push({ line: li, sym, count: n, win, cells: L.slice(0, n).map((r, i) => [i, r]) });
  }
  return { lines, total };
}

export function scan(grid, vals) {
  const fish = [], anglers = [], boats = [];
  let fishSum = 0;
  grid.forEach((col, r) => col.forEach((s, row) => {
    if (s === 'F') { fish.push([r, row, vals[r][row]]); fishSum += vals[r][row]; }
    else if (s === 'W') anglers.push([r, row]);
    else if (s === 'S') boats.push([r, row]);
  }));
  return { fish, anglers, boats, fishSum };
}

// One spin. mode 'base' | 'fs'. All wins are multiples of the total bet.
// Base: lines + scatter award + optional dynamite (adds an angler that collects fish at 1×).
// FS:   lines + anglers×fishSum×mult collect (mult passed in).
export function spin(f, mode, mult = 1) {
  const { grid, vals } = buildGrid(f, mode);
  let sc = scan(grid, vals), dynamite = null;
  if (mode === 'base' && sc.fish.length && !sc.anglers.length && f[30] < DYNAMITE_P) {
    // splash: drop an angler on a random reel 2-5, on a cell that is not a fish or boat
    const start = Math.floor(f[31] * 4), r0 = Math.floor(f[32] * 3);
    outer: for (let k = 0; k < 4; k++) {
      const r = 1 + ((start + k) % 4);
      for (let j = 0; j < 3; j++) {
        const row = (r0 + j) % 3;
        if (grid[r][row] !== 'F' && grid[r][row] !== 'S') { dynamite = [r, row, grid[r][row]]; grid[r][row] = 'W'; break outer; }
      }
    }
    if (dynamite) sc = scan(grid, vals);
  }
  const ln = evalLines(grid);
  const nb = sc.boats.length, spins = nb >= 3 ? SCATTER_SPINS[Math.min(nb, 5) - 3] : 0;
  let collect = 0;
  if (mode === 'fs') collect = sc.anglers.length * sc.fishSum * mult;
  else if (dynamite) collect = sc.fishSum;
  return { grid, vals, ...sc, lines: ln.lines, lineWin: ln.total, spins, dynamite, collect, total: ln.total + collect };
}

export const levelOf = anglers => Math.min(LEVEL_MULTS.length - 1, Math.floor(anglers / ANGLERS_PER_LEVEL));

// Full round for the sim. next(n) returns n floats synchronously. Mirrors the browser flow exactly.
export function playRound(next) {
  const base = spin(next(FLOATS_PER_SPIN), 'base');
  let total = base.total, spinsLeft = base.spins, played = 0, anglers = 0, caught = 0, fsWin = 0;
  while (spinsLeft > 0 && total < MAX_WIN) {
    spinsLeft--; played++;
    const lvl = levelOf(anglers);
    const s = spin(next(FLOATS_PER_SPIN), 'fs', LEVEL_MULTS[lvl]);
    total += s.total; fsWin += s.total;
    if (s.anglers.length) caught += s.anglers.length * s.fish.length;
    const before = anglers;
    anglers += s.anglers.length;
    spinsLeft += RETRIGGER_SPINS * (levelOf(anglers) - levelOf(before));
  }
  return { total: Math.min(total, MAX_WIN), base, triggered: base.spins > 0, played, anglers, caught, fsWin };
}
