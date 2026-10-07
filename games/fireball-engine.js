// Fireball Fury: 5×3, 25 paylines + Hold & Spin with 4 jackpots. Pure logic, shared with the node sim.
// All amounts are multiples of the TOTAL bet. Cells are indexed reel*3+row.
export const REELS = 5, ROWS = 3, CELLS = 15, LINES_N = 25, MAX_WIN = 5000;
export const TRIGGER = 6, RESPINS = 3, GRAND = 1000;

// Line pays are multiples of the LINE bet (total bet / 25) for 3, 4, 5 of a kind left to right.
export const SYMBOLS = {
  DR: { name: 'Dragon', w: 4, pays: [150, 750, 3750] },
  PH: { name: 'Phoenix', w: 5, pays: [110, 450, 2200] },
  VO: { name: 'Volcano', w: 6, pays: [90, 300, 1500] },
  HS: { name: 'Flaming Horseshoe', w: 7, pays: [70, 220, 900] },
  S7: { name: 'Fire 7', w: 8, pays: [60, 175, 700] },
  A: { name: 'A', w: 16, pays: [35, 110, 350] },
  K: { name: 'K', w: 17, pays: [30, 90, 300] },
  Q: { name: 'Q', w: 18, pays: [22, 70, 220] },
  J: { name: 'J', w: 19, pays: [23, 60, 180] },
  FB: { name: 'Fireball', w: 13, pays: null },
};
export const ORDER = ['DR', 'PH', 'VO', 'HS', 'S7', 'A', 'K', 'Q', 'J'];
const SYM_KEYS = Object.keys(SYMBOLS);
const SYM_TOTAL = SYM_KEYS.reduce((a, k) => a + SYMBOLS[k].w, 0);

// Fireball values: bet multiples or jackpots.
export const JACKPOTS = { MINI: 20, MINOR: 50, MAJOR: 250, GRAND };
export const VALUES = [
  { v: 1, w: 110 }, { v: 2, w: 175 }, { v: 3, w: 160 }, { v: 5, w: 135 }, { v: 8, w: 90 },
  { v: 10, w: 62 }, { v: 15, w: 36 }, { v: 25, w: 18 },
  { v: 20, jp: 'MINI', w: 14 }, { v: 50, jp: 'MINOR', w: 4.5 }, { v: 250, jp: 'MAJOR', w: 0.6 },
];
const VAL_TOTAL = VALUES.reduce((a, x) => a + x.w, 0);
// Chance that an empty cell lands a fireball on each respin.
export const RESPIN_P = 0.07;

export const LINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2], [1, 0, 2, 0, 1], [1, 2, 0, 2, 1], [0, 2, 2, 2, 0], [2, 0, 0, 0, 2],
];

export function pickSym(f) {
  let x = f * SYM_TOTAL;
  for (const k of SYM_KEYS) { if ((x -= SYMBOLS[k].w) < 0) return k; }
  return SYM_KEYS[SYM_KEYS.length - 1];
}
export function pickValue(f) {
  let x = f * VAL_TOTAL;
  for (const o of VALUES) { if ((x -= o.w) < 0) return o; }
  return VALUES[VALUES.length - 1];
}
const fb = o => ({ s: 'FB', v: o.v, jp: o.jp || null });

// 30 floats -> base spin. cells[i] = {s} or {s:'FB', v, jp}
export function spinBase(f) {
  const cells = [];
  for (let i = 0; i < CELLS; i++) {
    const s = pickSym(f[i]);
    cells.push(s === 'FB' ? fb(pickValue(f[CELLS + i])) : { s });
  }
  return evaluate(cells);
}

export function evaluate(cells) {
  const lines = [];
  let lineWin = 0;
  LINES.forEach((L, li) => {
    const first = cells[L[0]].s;
    if (first === 'FB') return;
    let n = 1;
    while (n < REELS && cells[n * 3 + L[n]].s === first) n++;
    if (n >= 3) {
      const win = SYMBOLS[first].pays[n - 3] / LINES_N;
      lineWin += win;
      lines.push({ line: li, sym: first, count: n, win, cells: L.slice(0, n).map((r, i) => i * 3 + r) });
    }
  });
  const fbCount = cells.filter(c => c.s === 'FB').length;
  return { cells, lines, lineWin, fbCount, trigger: fbCount >= TRIGGER };
}

// Hold & Spin state from the base cells: locked[i] = fireball or null.
export const lockFrom = cells => cells.map(c => (c.s === 'FB' ? c : null));
export const emptyCount = locked => locked.filter(c => !c).length;

// One respin: floats length = 2 * empties. Returns indices of newly landed fireballs (mutates locked).
export function respin(locked, f) {
  const hits = [];
  let k = 0;
  for (let i = 0; i < CELLS; i++) {
    if (locked[i]) continue;
    const a = f[k++], b = f[k++];
    if (a < RESPIN_P) { locked[i] = fb(pickValue(b)); hits.push(i); }
  }
  return hits;
}

export function bonusTotal(locked) {
  let sum = 0;
  const jps = [];
  for (const c of locked) if (c) { sum += c.v; if (c.jp) jps.push(c.jp); }
  const grand = locked.every(Boolean);
  if (grand) { sum += GRAND; jps.push('GRAND'); }
  return { sum, jps, grand };
}

// Full bonus run with a float source (used by the sim; the browser runs the same steps with animation).
export function playBonus(cells, floats) {
  const locked = lockFrom(cells);
  let left = RESPINS, spins = 0;
  while (left > 0 && emptyCount(locked)) {
    const hits = respin(locked, floats(2 * emptyCount(locked)));
    spins++;
    left = hits.length ? RESPINS : left - 1;
  }
  return { locked, spins, ...bonusTotal(locked) };
}

export const capWin = m => Math.min(MAX_WIN, m);
