// Neon Joker: pure slot engine (strips, paytable, expanding sticky jokers, respins, gamble card).
// No DOM: runs identically in the browser and in the node simulation.
// Symbols: c cherries, l lemon, o orange, p plum, g grapes, w watermelon, b bell, B BAR, 7 lucky seven,
//          J joker (wild, reels 2-4 only), S star scatter.

export const REELS = 5, ROWS = 3, LINES_N = 10, MAX_RESPINS = 3, MAX_WIN = 5000, GAMBLE_LIMIT = 50, GAMBLE_MAX = 5;

export const SYMBOLS = {
  c: 'Cherries', l: 'Lemon', o: 'Orange', p: 'Plum', g: 'Grapes', w: 'Watermelon',
  b: 'Bell', B: 'BAR', 7: 'Lucky 7', J: 'Joker (wild)', S: 'Star (scatter)',
};

// Line pays in multiples of the LINE bet (total bet / 10) for 3 / 4 / 5 of a kind from reel 1.
export const PAYS = {
  c: [4, 12, 40], l: [5, 12, 40], o: [6, 20, 60], p: [6, 18, 50], g: [10, 30, 100],
  w: [12, 40, 125], b: [20, 60, 250], B: [30, 100, 500], 7: [50, 200, 1000],
};
// Scatter pays in multiples of the TOTAL bet for 3 / 4 / 5 stars anywhere.
export const SCATTER_PAYS = [5, 20, 100];

// Row index (0 top, 1 middle, 2 bottom) per reel for each of the 10 fixed paylines.
export const LINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
];

// Symbol counts per reel strip. Stars are placed evenly so at most one is visible per reel.
const COUNTS = [
  { c: 7, l: 7, o: 6, p: 6, g: 5, w: 4, b: 3, B: 3, 7: 2, S: 2 },
  { c: 7, l: 7, o: 6, p: 6, g: 5, w: 4, b: 3, B: 3, 7: 2, S: 2, J: 1 },
  { c: 7, l: 7, o: 6, p: 6, g: 5, w: 4, b: 3, B: 3, 7: 2, S: 2, J: 1 },
  { c: 7, l: 7, o: 6, p: 6, g: 5, w: 4, b: 3, B: 3, 7: 2, S: 2, J: 1 },
  { c: 7, l: 7, o: 6, p: 6, g: 5, w: 4, b: 3, B: 3, 7: 2, S: 2 },
];

// Deterministic strip construction (fixed seed), so the strips are constant everywhere.
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function buildStrip(counts, seed) {
  const rnd = mulberry(seed), pool = [];
  for (const [k, n] of Object.entries(counts)) if (k !== 'S') for (let i = 0; i < n; i++) pool.push(k);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const len = pool.length + counts.S, strip = [];
  const starAt = new Set(Array.from({ length: counts.S }, (_, i) => Math.floor((i + 0.5) * len / counts.S)));
  for (let i = 0; i < len; i++) strip.push(starAt.has(i) ? 'S' : pool.pop());
  return strip.join('');
}
export const STRIPS = COUNTS.map((c, i) => buildStrip(c, 7771 + i * 97));

export const stopFor = (i, f) => Math.min(STRIPS[i].length - 1, Math.floor(f * STRIPS[i].length));
export const column = (i, stop) => { const s = STRIPS[i], n = s.length; return [s[stop % n], s[(stop + 1) % n], s[(stop + 2) % n]]; };

// Spin from 5 floats. Sticky reels (expanded jokers) stay full of jokers and ignore their float.
export function spin(floats, sticky = []) {
  const stops = [], grid = [];
  for (let i = 0; i < REELS; i++) {
    if (sticky.includes(i)) { stops.push(-1); grid.push(['J', 'J', 'J']); continue; }
    const st = stopFor(i, floats[i]); stops.push(st); grid.push(column(i, st));
  }
  return { stops, grid };
}

// Evaluate a grid. Wins are multiples of the TOTAL bet.
export function evaluate(grid) {
  const lines = []; let total = 0;
  for (let li = 0; li < LINES_N; li++) {
    const L = LINES[li], sym = grid[0][L[0]];
    if (!PAYS[sym]) continue;
    let n = 1;
    while (n < REELS) { const g = grid[n][L[n]]; if (g === sym || g === 'J') n++; else break; }
    if (n < 3) continue;
    const win = PAYS[sym][n - 3] / LINES_N;
    total += win;
    lines.push({ line: li, sym, count: n, win, cells: L.slice(0, n).map((r, i) => [i, r]) });
  }
  const cells = [];
  grid.forEach((col, i) => col.forEach((g, r) => g === 'S' && cells.push([i, r])));
  const k = Math.min(cells.length, 5) - 3;
  const scatter = { count: cells.length, cells, win: k >= 0 ? SCATTER_PAYS[k] : 0 };
  total += scatter.win;
  return { lines, scatter, total };
}

const withReels = (grid, reels) => grid.map((col, i) => (reels.includes(i) ? ['J', 'J', 'J'] : col.slice()));
const jokerReels = (grid, sticky) => [1, 2, 3].filter(i => !sticky.includes(i) && grid[i].includes('J'));

// Which jokers expand. Base spin (requireWin): a joker reel expands if, once expanded, it is part of a
// winning line (wins are contiguous from reel 1, so one pass is exact). Respins: every new joker expands.
export function expansions(grid, sticky = [], requireWin = true) {
  const cand = jokerReels(grid, sticky);
  if (!cand.length || !requireWin) return cand;
  const ev = evaluate(withReels(grid, [...sticky, ...cand]));
  return cand.filter(i => ev.lines.some(w => w.count > i));
}
export const expandGrid = withReels;

// Gamble card from one float: hearts / diamonds are red, clubs / spades black.
export const SUITS = ['h', 'd', 'c', 's'];
export function gambleCard(f) { const suit = SUITS[Math.min(3, Math.floor(f * 4))]; return { suit, red: suit === 'h' || suit === 'd' }; }
export const canGamble = (win, bet, step) => win > 0 && win < bet * GAMBLE_LIMIT && step < GAMBLE_MAX;

// Full round, synchronous, for simulations. next() returns 5 floats. Returns total multiple of bet (capped).
export function playRound(next) {
  const base = spin(next());
  let sticky = expansions(base.grid, [], true), grid = expandGrid(base.grid, sticky);
  let total = evaluate(grid).total, respins = 0, expanded = sticky.length > 0;
  let pending = expanded;
  while (pending && respins < MAX_RESPINS) {
    respins++;
    const r = spin(next(), sticky), add = expansions(r.grid, sticky, false);
    sticky = [...sticky, ...add].sort();
    total += evaluate(expandGrid(r.grid, sticky)).total;
    pending = add.length > 0;
  }
  return { total: Math.min(total, MAX_WIN), respins, expanded, capped: total > MAX_WIN };
}
