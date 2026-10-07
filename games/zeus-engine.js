// Storm of Olympus: pure game logic, shared by the browser and the node RTP simulation.
// 6 reels x 5 rows, scatter pays (8+ anywhere), tumbles, lightning multiplier orbs, free spins
// with a persistent multiplier. No DOM, no Math.random: every outcome comes from supplied floats.
//
// The whole round is a generator. It yields {t:'need', n} when it wants n fair floats (resume it with
// an array of n floats) and yields UI events ({t:'drop'|'win'|'tumble'|'orbs'|'seq'|...}) in between,
// which the browser animates and the simulation ignores. Both run the exact same code path.

export const COLS = 6, ROWS = 5, CELLS = COLS * ROWS;
export const MAX_WIN = 5000;       // × bet, per round (base spin + all free spins)
export const FS_AWARD = 15, FS_RETRIGGER = 5, FS_TRIGGER = 4, FS_RETRIGGER_AT = 3;

// Symbol ids. Lows are gems, highs are Olympian relics. Z = Zeus scatter, M = lightning orb.
export const SYMBOLS = {
  K: { name: 'Sky Crown', kind: 'high', pays: [10, 25, 50] },
  H: { name: 'Storm Hourglass', kind: 'high', pays: [3, 10, 25] },
  R: { name: 'Titan Ring', kind: 'high', pays: [2, 5, 15] },
  C: { name: 'Nectar Chalice', kind: 'high', pays: [1.5, 3, 12] },
  L: { name: 'Laurel Wreath', kind: 'high', pays: [1, 2, 10] },
  b: { name: 'Sapphire', kind: 'low', pays: [0.8, 1.5, 8] },
  g: { name: 'Emerald', kind: 'low', pays: [0.6, 1, 5] },
  p: { name: 'Amethyst', kind: 'low', pays: [0.4, 0.9, 4] },
  r: { name: 'Ruby', kind: 'low', pays: [0.25, 0.75, 2] },
  Z: { name: 'Zeus Scatter', kind: 'scatter' },
  M: { name: 'Lightning Orb', kind: 'orb' },
};
export const PAY_IDS = ['K', 'H', 'R', 'C', 'L', 'b', 'g', 'p', 'r'];
export const TIERS = [[8, 9], [10, 11], [12, 30]]; // count ranges for pays[0], pays[1], pays[2]
export const SCATTER_PAYS = { 4: 3, 5: 5, 6: 100 }; // × bet; 6 or more pays 100×

// Per-cell symbol weights (base game and free spins).
const W_BASE = { K: 7, H: 9, R: 11, C: 13, L: 15, b: 18, g: 20, p: 22, r: 24, Z: 2.4, M: 1.2 };
const W_FS = { K: 7, H: 9, R: 11, C: 13, L: 15, b: 20, g: 24, p: 28, r: 32, Z: 2.2, M: 5.3 };

// Orb multiplier values, weighted heavily towards the small ones.
export const ORB_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500];
export const ORB_WEIGHTS = [300, 220, 170, 130, 100, 70, 50, 30, 20, 12, 8, 4, 1.5, 0.4, 0.1];

const table = w => { const ids = Object.keys(w), tot = ids.reduce((a, k) => a + w[k], 0); let acc = 0; return ids.map(k => [k, (acc += w[k]) / tot]); };
const T_BASE = table(W_BASE), T_FS = table(W_FS);
const ORB_TOT = ORB_WEIGHTS.reduce((a, b) => a + b, 0);
export const orbValue = f => { let x = f * ORB_TOT; for (let i = 0; i < ORB_VALUES.length; i++) if ((x -= ORB_WEIGHTS[i]) < 0) return ORB_VALUES[i]; return ORB_VALUES[0]; };
export const ORB_CHANCE = { base: W_BASE.M / Object.values(W_BASE).reduce((a, b) => a + b), fs: W_FS.M / Object.values(W_FS).reduce((a, b) => a + b) };

// One cell from two floats: f1 picks the symbol, f2 the orb value (only used if it's an orb).
export function cell(f1, f2, mode) {
  const t = mode === 'fs' ? T_FS : T_BASE;
  for (let i = 0; i < t.length; i++) if (f1 < t[i][1]) return t[i][0] === 'M' ? { s: 'M', v: orbValue(f2) } : { s: t[i][0], v: 0 };
  return { s: 'r', v: 0 };
}

// grid[col][row], row 0 at the top. 60 floats, column by column, top to bottom.
export function fillGrid(f, mode) {
  const g = [];
  for (let c = 0; c < COLS; c++) { const col = []; for (let r = 0; r < ROWS; r++) { const i = (c * ROWS + r) * 2; col.push(cell(f[i], f[i + 1], mode)); } g.push(col); }
  return g;
}

export const payFor = (s, n) => { const p = SYMBOLS[s].pays; return n >= 12 ? p[2] : n >= 10 ? p[1] : n >= 8 ? p[0] : 0; };

// Find all paying symbols (8+ anywhere). Returns win in × bet and the cells to explode.
export function evaluate(g) {
  const cnt = {};
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const s = g[c][r].s; cnt[s] = (cnt[s] || 0) + 1; }
  const wins = []; let win = 0;
  for (const s of PAY_IDS) { const n = cnt[s] || 0; if (n >= 8) { const pay = payFor(s, n); wins.push({ s, n, pay }); win += pay; } }
  const remove = [];
  if (wins.length) { const hit = new Set(wins.map(w => w.s)); for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (hit.has(g[c][r].s)) remove.push([c, r]); }
  return { wins, win, remove, scatters: cnt.Z || 0 };
}

// Explode the removed cells, drop survivors, fill from the top. Needs 2 floats per removed cell.
// moves[c][r] = source row of the cell now at (c, r), or a negative number for new cells (-1 lands lowest).
export function tumble(g, remove, f, mode) {
  const gone = new Set(remove.map(([c, r]) => c * ROWS + r));
  const out = [], moves = []; let k = 0;
  for (let c = 0; c < COLS; c++) {
    const keep = [], src = [];
    for (let r = 0; r < ROWS; r++) if (!gone.has(c * ROWS + r)) { keep.push(g[c][r]); src.push(r); }
    const n = ROWS - keep.length, fresh = [], fsrc = [];
    for (let i = 0; i < n; i++) { fresh.push(cell(f[k], f[k + 1], mode)); k += 2; fsrc.push(-(n - i)); }
    out.push([...fresh, ...keep]); moves.push([...fsrc, ...src]);
  }
  return { grid: out, moves };
}

export const orbsOn = g => { const o = []; for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (g[c][r].s === 'M') o.push({ c, r, v: g[c][r].v }); return o; };
export const scatterPay = n => (n >= 6 ? SCATTER_PAYS[6] : SCATTER_PAYS[n] || 0);

// One spin with its full tumble sequence. Returns { win (after multipliers), seqWin, mult, running, scatters, scatterPay, tumbles }.
function* spin(mode, running) {
  let grid = fillGrid(yield { t: 'need', n: CELLS * 2 }, mode);
  yield { t: 'drop', grid, mode };
  let seqWin = 0, tumbles = 0, ev;
  for (;;) {
    ev = evaluate(grid);
    if (!ev.win) break;
    seqWin += ev.win; tumbles++;
    yield { t: 'win', grid, wins: ev.wins, remove: ev.remove, win: ev.win, seqWin };
    const f = yield { t: 'need', n: ev.remove.length * 2 };
    const tm = tumble(grid, ev.remove, f, mode);
    grid = tm.grid;
    yield { t: 'tumble', grid, moves: tm.moves, mode };
  }
  let mult = 1;
  const orbs = orbsOn(grid), sum = orbs.reduce((a, o) => a + o.v, 0);
  if (seqWin > 0) {
    if (mode === 'fs') { running += sum; if (running > 0) mult = running; }
    else if (sum > 0) mult = sum;
    if (sum > 0 || (mode === 'fs' && running > 0)) yield { t: 'orbs', grid, orbs, sum, mult, running, mode, seqWin };
  }
  const win = seqWin * mult, scatters = ev.scatters, sp = scatterPay(scatters);
  yield { t: 'seq', grid, seqWin, mult, win, scatters, scatterPay: sp, mode, running };
  return { win, seqWin, mult, running, scatters, scatterPay: sp, tumbles };
}

// A whole paid round: base spin, then any free spins it triggers. Returns totals in × bet.
export function* playRound() {
  let total = 0, best = 0, fsPlayed = 0, fsAwarded = 0, capped = false, running = 0;
  const add = x => { total += x; if (total >= MAX_WIN) { total = MAX_WIN; capped = true; } };
  const b = yield* spin('base', 0);
  add(b.win + b.scatterPay); best = Math.max(best, b.win);
  if (b.scatters >= FS_TRIGGER && !capped) {
    let left = FS_AWARD; fsAwarded = FS_AWARD;
    yield { t: 'fsStart', spins: left, total };
    while (left > 0 && !capped) {
      left--; fsPlayed++;
      yield { t: 'fsSpin', left, played: fsPlayed, awarded: fsAwarded, running, total };
      const s = yield* spin('fs', running);
      running = s.running;
      add(s.win + (s.scatters >= FS_TRIGGER ? s.scatterPay : 0)); best = Math.max(best, s.win);
      if (s.scatters >= FS_RETRIGGER_AT && !capped) { left += FS_RETRIGGER; fsAwarded += FS_RETRIGGER; yield { t: 'retrigger', add: FS_RETRIGGER, left, total }; }
      yield { t: 'fsAfter', left, total, running };
    }
    yield { t: 'fsEnd', played: fsPlayed, total, running, capped };
  }
  if (capped) yield { t: 'cap', total };
  return { total, best, fsPlayed, fsAwarded, capped, running, baseScatters: b.scatters };
}
