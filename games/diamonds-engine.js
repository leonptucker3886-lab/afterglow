// Diamond Fever: classic 3-reel stepper with multiplying diamond wilds. Pure logic, shared with the node sim.
// Every outcome comes from floats in [0,1): one float per reel picks a physical stop on a weighted strip.

export const SYMS = [
  { k: 'BL', name: 'Blank' },
  { k: 'CH', name: 'Cherry' },
  { k: 'B1', name: '1-BAR', bar: 1 },
  { k: 'B2', name: '2-BAR', bar: 2 },
  { k: 'B3', name: '3-BAR', bar: 3 },
  { k: 'S7', name: 'Red 7' },
  { k: 'DC', name: 'Cyan Diamond', wild: 2 },
  { k: 'DM', name: 'Magenta Diamond', wild: 5 },
  { k: 'DL', name: 'Lime Diamond', wild: 10 },
];
export const BY = Object.fromEntries(SYMS.map(s => [s.k, s]));

// Line pays, in multiples of the LINE bet.
export const PAY = { S7: 40, B3: 25, B2: 15, B1: 10, ANYBAR: 3, CH: [0, 1, 4, 10], D3: 5 };
export const TOP = 5000;          // three Lime diamonds = 5 × 10 × 10 × 10. No single line can pay more.
export const MAX_WIN = 5000;      // max win per spin, × that spin's TOTAL bet
export const FEVER_PIPS = 10, FEVER_SPINS = 5;

// Paylines as rows per reel. 1 line = centre; 3 = + top/bottom; 5 = + both diagonals.
export const LINES = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
export const LINE_OPTS = [1, 3, 5];

// Physical strips: symbol stops alternate with blank stops (like a real stepper).
// Symbol counts per reel (each reel has the same number of symbol stops).
export const COUNTS = [
  { CH: 8, B1: 44, B2: 34, B3: 28, S7: 20, DC: 3, DM: 1, DL: 1 },
  { CH: 8, B1: 44, B2: 34, B3: 28, S7: 20, DC: 3, DM: 1, DL: 1 },
  { CH: 8, B1: 44, B2: 34, B3: 28, S7: 20, DC: 3, DM: 1, DL: 1 },
];

// Deterministic layout (seeded shuffle that avoids identical neighbours), so the art and the math share one strip.
function build(counts, seed) {
  const syms = [];
  for (const [k, n] of Object.entries(counts)) for (let i = 0; i < n; i++) syms.push(k);
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = syms.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [syms[i], syms[j]] = [syms[j], syms[i]]; }
  for (let pass = 0; pass < 4; pass++) for (let i = 0; i < syms.length; i++) {
    const n = (i + 1) % syms.length;
    if (syms[i] === syms[n]) { const j = (i + 2 + Math.floor(rnd() * (syms.length - 3))) % syms.length; [syms[n], syms[j]] = [syms[j], syms[n]]; }
  }
  return syms.flatMap(k => [k, 'BL']);
}
export const buildStrips = counts => counts.map((c, i) => build(c, 0x5eed + i * 7919));
export const STRIPS = buildStrips(COUNTS);

export const stopsFrom = f => STRIPS.map((s, i) => Math.floor(f[i] * s.length) % s.length);
export const symAt = (reel, stop, fever) => { const s = STRIPS[reel], k = s[((stop % s.length) + s.length) % s.length]; return fever && k === 'BL' ? 'CH' : k; };
// grid[reel][row]: row 0 = above the centre stop, 1 = centre, 2 = below
export const windowAt = (stops, fever = false) => stops.map((st, r) => [symAt(r, st - 1, fever), symAt(r, st, fever), symAt(r, st + 1, fever)]);

// Evaluate one line of three symbol keys. Returns { pay (× line bet), kind, mult }.
export function evalLine(line) {
  const wilds = line.filter(k => BY[k].wild), M = wilds.reduce((a, k) => a * BY[k].wild, 1);
  if (wilds.length === 3) {
    const pay = Math.min(TOP, PAY.D3 * M);
    return { pay, kind: line.every(k => k === 'DL') ? 'DL3' : 'D3', mult: M };
  }
  const nw = line.filter(k => !BY[k].wild);
  let best = { pay: 0, kind: '', mult: M };
  const take = (pay, kind) => { pay = Math.min(TOP, pay * M); if (pay > best.pay) best = { pay, kind, mult: M }; };
  if (nw.every(k => k === nw[0]) && PAY[nw[0]] && nw[0] !== 'CH') take(PAY[nw[0]], nw[0]);
  if (nw.every(k => BY[k].bar)) take(PAY.ANYBAR, 'ANYBAR');
  const ch = nw.filter(k => k === 'CH').length;
  if (ch) { const n = Math.min(3, ch + wilds.length); take(PAY.CH[n], 'CH' + n); }
  return best;
}

// Full spin evaluation. Returns line wins in LINE-bet units and whether the spin earns a Fever pip.
export function evaluate(grid, nLines) {
  const lines = [];
  let total = 0;
  for (let i = 0; i < nLines; i++) {
    const L = LINES[i], syms = L.map((row, r) => grid[r][row]);
    const w = evalLine(syms);
    if (w.pay > 0) { lines.push({ line: i, ...w, syms, cells: L.map((row, r) => [r, row]) }); total += w.pay; }
  }
  const pip = [0, 1, 2].some(r => BY[grid[r][1]].wild);
  return { lines, total, pip };
}

// One spin from 3 floats. `total` is in line-bet units, capped at MAX_WIN × the total bet (nLines line bets).
export function spin(f, nLines, fever = false) {
  const stops = stopsFrom(f), grid = windowAt(stops, fever), res = evaluate(grid, nLines);
  const cap = MAX_WIN * nLines, capped = res.total > cap;
  return { stops, grid, ...res, total: Math.min(cap, res.total), capped, pip: !fever && res.pip };
}

// Exact per-line RTP for a strip set (base or fever). Used by the sim / tuning.
export function exactLineRtp(fever = false, strips = STRIPS) {
  const dist = strips.map(s => { const m = {}; s.forEach(k => { k = fever && k === 'BL' ? 'CH' : k; m[k] = (m[k] || 0) + 1 / s.length; }); return Object.entries(m); });
  let r = 0, hit = 0;
  for (const [a, pa] of dist[0]) for (const [b, pb] of dist[1]) for (const [c, pc] of dist[2]) {
    const p = pa * pb * pc, w = evalLine([a, b, c]).pay; r += p * w; if (w) hit += p;
  }
  const pip = 1 - strips.reduce((a, s) => a * (1 - s.filter(k => BY[k].wild).length / s.length), 1);
  return { rtp: r, hit, pip };
}
