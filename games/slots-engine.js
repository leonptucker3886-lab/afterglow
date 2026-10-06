// Nebula Nights: pure slot engine (reel strips, paytable, evaluation). No DOM, works in browser + node.
// Symbols: d t c s = low glyphs, U A C P = cosmic highs, W = NOVA wild (reels 2-4), X = wormhole scatter.

export const REELS = 5, ROWS = 3, LINES_N = 20;
export const FS_MULT = 2, FS_CAP = 100;

export const SYMBOLS = {
  d: { name: 'Cyan Diamond', kind: 'low' },
  t: { name: 'Lime Triangle', kind: 'low' },
  c: { name: 'Pink Orb', kind: 'low' },
  s: { name: 'Violet Square', kind: 'low' },
  U: { name: 'Saucer', kind: 'high' },
  A: { name: 'Blip the Alien', kind: 'high' },
  C: { name: 'Comet', kind: 'high' },
  P: { name: 'Ringed Planet', kind: 'high' },
  W: { name: 'NOVA Wild', kind: 'wild' },
  X: { name: 'Wormhole', kind: 'scatter' },
};

// Line pays in multiples of the LINE bet (total bet / 20), for 3 / 4 / 5 of a kind from reel 1.
export const PAYS = {
  d: [20, 40, 150], t: [20, 40, 150], c: [22, 50, 200], s: [22, 50, 200],
  U: [40, 100, 400], A: [45, 125, 500], C: [60, 175, 750], P: [80, 250, 2000],
};
// Scatter pays in multiples of the TOTAL bet, and free spins awarded, for 3 / 4 / 5 anywhere.
export const SCATTER_PAYS = [3, 10, 50];
export const FS_AWARD = [8, 12, 20];

// Row index (0 top, 1 middle, 2 bottom) for each reel, per payline.
export const LINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0],
];

// Reel strips (circular). Tuned by Monte Carlo to ~96% RTP. Scatters spaced so at most one is visible per reel.
export const STRIPS = [
  'XAPUsdcCsdAtUtPcsdtCAUcsdtPdtAcCUsdtc',
  'sddPtAcXUCsdscWAPUdtcCsdAttUcPsdttCAUc',
  'dttCAUcsddtPcAXUCsdtcWAPUsdscCdtAtUcPs',
  'dAtUcPsdttACcUsddtPsAXUCcdtcsWAPUdtcCs',
  'csAdUtPcsdtCAcUsdtdPtAcUCsdtcXAPUsdtC',
];

// Map one fair float in [0,1) to a stop index on reel i.
export const stopFor = (i, f) => Math.min(STRIPS[i].length - 1, Math.floor(f * STRIPS[i].length));
export const stopsFrom = floats => floats.slice(0, REELS).map((f, i) => stopFor(i, f));

// grid[reel][row]; the stop index is the top visible row.
export function windowAt(stops) {
  return stops.map((st, i) => { const s = STRIPS[i], n = s.length; return [s[st % n], s[(st + 1) % n], s[(st + 2) % n]]; });
}

// Evaluate a grid. Returns wins as multiples of the TOTAL bet (already including the free-spin multiplier).
export function evaluate(grid, mult = 1) {
  const lines = [];
  let total = 0;
  for (let li = 0; li < LINES.length; li++) {
    const L = LINES[li], sym = grid[0][L[0]];
    if (!PAYS[sym]) continue;
    let n = 1;
    while (n < REELS) { const g = grid[n][L[n]]; if (g === sym || g === 'W') n++; else break; }
    if (n < 3) continue;
    const win = (PAYS[sym][n - 3] / LINES_N) * mult;
    total += win;
    lines.push({ line: li, sym, count: n, win, cells: L.slice(0, n).map((r, i) => [i, r]) });
  }
  const scatCells = [];
  grid.forEach((col, i) => col.forEach((g, r) => g === 'X' && scatCells.push([i, r])));
  const sc = scatCells.length, k = Math.min(sc, 5) - 3;
  const scatter = { count: sc, cells: scatCells, win: k >= 0 ? SCATTER_PAYS[k] * mult : 0, spins: k >= 0 ? FS_AWARD[k] : 0 };
  total += scatter.win;
  return { lines, scatter, total };
}

// One spin from 5 floats.
export function spin(floats, mult = 1) {
  const stops = stopsFrom(floats), grid = windowAt(stops);
  return { stops, grid, ...evaluate(grid, mult) };
}

// Free spins bookkeeping: add an award without exceeding FS_CAP spins in the round.
export const addSpins = (awardedSoFar, add) => Math.max(0, Math.min(add, FS_CAP - awardedSoFar));

// Synchronous full round for simulations: next() returns 5 floats. Returns total multiple of the bet.
export function playRound(next) {
  const base = spin(next(), 1);
  let total = base.total, awarded = 0, left = 0, spins = 0;
  if (base.scatter.spins) { awarded = left = addSpins(0, base.scatter.spins); }
  while (left > 0) {
    left--; spins++;
    const r = spin(next(), FS_MULT);
    total += r.total;
    if (r.scatter.spins) { const a = addSpins(awarded, r.scatter.spins); awarded += a; left += a; }
  }
  return { total, base, triggered: awarded > 0, spins };
}
