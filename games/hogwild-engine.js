// Hog Wild: pure slot engine (no DOM). Shared by the browser game and the node simulation.
// 5 reels x 3 rows, 20 paylines. Growing pig wild on reels 2-4, piggy bank scatter -> hold & spin bonus.
// Symbols: c corn, h horseshoe, b barn, f pitchfork (lows) · M mud pig, S shades pig, K king pig (highs)
//          W growing pig wild (reels 2-4 only) · B piggy bank scatter.

export const REELS = 5, ROWS = 3, LINES_N = 20, MAX_WIN = 5000;

export const SYMBOLS = {
  c: { name: 'Sweet Corn', kind: 'low' },
  h: { name: 'Lucky Horseshoe', kind: 'low' },
  b: { name: 'Big Red Barn', kind: 'low' },
  f: { name: 'Pitchfork', kind: 'low' },
  M: { name: 'Mud Pig', kind: 'high' },
  S: { name: 'Cool Pig', kind: 'high' },
  K: { name: 'King Hog', kind: 'high' },
  W: { name: 'Growing Pig Wild', kind: 'wild' },
  B: { name: 'Piggy Bank', kind: 'scatter' },
};

// Line pays in multiples of the LINE bet (total bet / 20), for 3 / 4 / 5 of a kind from reel 1.
export const PAYS = {
  c: [3, 8, 25], h: [3, 8, 25], b: [4, 10, 35], f: [4, 10, 35],
  M: [8, 25, 100], S: [10, 40, 150], K: [15, 60, 300],
};

// Per-cell symbol weights for each reel. Wild only on reels 2-4.
const BASEW = { c: 24, h: 24, b: 19, f: 19, M: 11, S: 8, K: 6 };
export const WILD_W = 3.05, BANK_W = 3.42;
export const WEIGHTS = [0, 1, 2, 3, 4].map(i => ({ ...BASEW, ...(i >= 1 && i <= 3 ? { W: WILD_W } : {}), B: BANK_W }));
const TOT = WEIGHTS.map(w => Object.values(w).reduce((a, b) => a + b, 0));

// Growth odds when a pig wild lands (only the first wild, scanning reel 2 -> 4, top -> bottom, can grow).
export const GROW2 = 0.24, GROW3 = 0.08;

// Row index per payline (0 top, 1 middle, 2 bottom).
export const LINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0],
];

export function pickSym(reel, f) {
  let x = f * TOT[reel];
  for (const [k, w] of Object.entries(WEIGHTS[reel])) if ((x -= w) < 0) return k;
  return 'c';
}

export const BASE_FLOATS = 17; // 15 cells + grow roll + placement roll

// Evaluate paylines on a (post-growth) grid. Returns wins as multiples of the TOTAL bet.
export function evaluate(grid) {
  const lines = [];
  let total = 0;
  for (let li = 0; li < LINES.length; li++) {
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

// Work out where a landed wild grows to. Returns {x0,y0,size} or null. Never covers a piggy bank.
export function growFor(grid, c, r, g, p) {
  const clear = (x0, y0, s) => { for (let x = x0; x < x0 + s; x++) for (let y = y0; y < y0 + s; y++) if (grid[x][y] === 'B') return false; return true; };
  const tryS = s => {
    const opts = [];
    for (let x0 = 1; x0 + s - 1 <= 3; x0++) for (let y0 = 0; y0 + s - 1 <= 2; y0++)
      if (c >= x0 && c < x0 + s && r >= y0 && r < y0 + s && clear(x0, y0, s)) opts.push({ x0, y0, size: s });
    return opts.length ? opts[Math.min(opts.length - 1, Math.floor(p * opts.length))] : null;
  };
  if (g < GROW3) return tryS(3) || tryS(2);
  if (g < GROW3 + GROW2) return tryS(2);
  return null;
}

// One base spin from BASE_FLOATS floats.
export function baseSpin(f) {
  const raw = [0, 1, 2, 3, 4].map(i => [0, 1, 2].map(r => pickSym(i, f[i * 3 + r])));
  const grid = raw.map(col => col.slice());
  let wild = null, grow = null, eaten = null;
  for (let i = 1; i <= 3 && !wild; i++) for (let r = 0; r < 3; r++) if (raw[i][r] === 'W') { wild = [i, r]; break; }
  if (wild) {
    grow = growFor(raw, wild[0], wild[1], f[15], f[16]);
    if (grow) {
      for (let x = grow.x0; x < grow.x0 + grow.size; x++) for (let y = grow.y0; y < grow.y0 + grow.size; y++) {
        if (!eaten && raw[x][y] === 'c') eaten = [x, y];
        grid[x][y] = 'W';
      }
    }
  }
  const banks = [];
  grid.forEach((col, i) => col.forEach((s, r) => s === 'B' && banks.push(i * 3 + r)));
  const ev = evaluate(grid);
  return { raw, grid, wild, grow, eaten, banks, trigger: banks.length >= 3, ...ev };
}

/* ---------------- Piggy Bank Bonus (hold & spin) ---------------- */
export const RESPINS = 3, CELLS = 15, P_LAND = 0.07;
export const JACKPOTS = { mini: 25, major: 100, grand: 1000 };
// Coin values as multiples of the total bet.
export const COIN_TABLE = [
  { v: 1, w: 300 }, { v: 2, w: 250 }, { v: 3, w: 170 }, { v: 5, w: 120 }, { v: 10, w: 60 },
  { v: 15, w: 26 }, { v: 20, w: 14 }, { v: 50, w: 4 },
  { v: 25, w: 9, kind: 'mini' }, { v: 100, w: 1.2, kind: 'major' },
];
const COIN_TOT = COIN_TABLE.reduce((a, c) => a + c.w, 0);
export function coinFrom(f) {
  let x = f * COIN_TOT;
  for (const c of COIN_TABLE) if ((x -= c.w) < 0) return { v: c.v, kind: c.kind || 'coin' };
  return { v: 1, kind: 'coin' };
}

// Start the bonus: the triggering banks become the first coins (one float each, in bank order).
export function bonusStart(banks, floats) {
  const cells = Array(CELLS).fill(null);
  banks.forEach((idx, k) => (cells[idx] = coinFrom(floats[k])));
  return cells;
}
export const emptyCount = cells => cells.filter(c => !c).length;

// One respin: 2 floats per empty cell (land roll, value roll), empty cells in index order.
export function respin(cells, floats) {
  const next = cells.slice(), added = [];
  let k = 0;
  for (let i = 0; i < CELLS; i++) {
    if (cells[i]) continue;
    const land = floats[k++], val = floats[k++];
    if (land < P_LAND) { next[i] = coinFrom(val); added.push(i); }
  }
  return { cells: next, added };
}

export function bonusTotal(cells) {
  const sum = cells.reduce((a, c) => a + (c ? c.v : 0), 0), full = cells.every(Boolean);
  return { sum, full, grand: full ? JACKPOTS.grand : 0, total: sum + (full ? JACKPOTS.grand : 0) };
}

export const capWin = x => Math.min(MAX_WIN, x);

// Synchronous full round for the sim. next(n) returns n floats. Returns multiples of the total bet.
export function playRound(next) {
  const base = baseSpin(next(BASE_FLOATS));
  let total = base.total, bonus = 0, respins = 0, full = false;
  if (base.trigger) {
    let cells = bonusStart(base.banks, next(base.banks.length)), left = RESPINS;
    while (left > 0 && emptyCount(cells)) {
      const r = respin(cells, next(emptyCount(cells) * 2));
      respins++; cells = r.cells;
      left = r.added.length ? RESPINS : left - 1;
    }
    const bt = bonusTotal(cells);
    bonus = bt.total; full = bt.full; total += bonus;
  }
  return { total: capWin(total), raw: total, base, bonus, triggered: base.trigger, respins, full };
}
