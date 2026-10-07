// Thunder Herd: pure slot engine (reel strips, 1,024-ways evaluation, free spins). No DOM, works in browser + node.
// Symbols: B bison, E eagle, F wolf, C cougar, H elk, A K Q J T(10) N(9) royals, W sunset wild (reels 2-4), S gold coin scatter.

export const REELS = 5, ROWS = 4, MAX_WIN = 5000, FS_CAP = 200, WAY_CAP = 27;

export const SYMBOLS = {
  B: { name: 'Thunder Bison', short: 'Bison' },
  E: { name: 'Sky Eagle', short: 'Eagle' },
  F: { name: 'Moon Wolf', short: 'Wolf' },
  C: { name: 'Canyon Cougar', short: 'Cougar' },
  H: { name: 'Ridge Elk', short: 'Elk' },
  A: { name: 'Ace', short: 'A' }, K: { name: 'King', short: 'K' }, Q: { name: 'Queen', short: 'Q' },
  J: { name: 'Jack', short: 'J' }, T: { name: 'Ten', short: '10' }, N: { name: 'Nine', short: '9' },
  W: { name: 'Sunset Wild', short: 'Wild' },
  S: { name: 'Gold Coin', short: 'Coin' },
};

// Pays per WAY, as multiples of the TOTAL bet, for 3 / 4 / 5 adjacent reels from reel 1.
export const PAYS = {
  B: [0.45, 1.3, 3.45],
  E: [0.35, 0.9, 2.2],
  F: [0.25, 0.7, 1.8],
  C: [0.2, 0.55, 1.4],
  H: [0.18, 0.45, 1.1],
  A: [0.09, 0.22, 0.7], K: [0.09, 0.22, 0.7],
  Q: [0.07, 0.18, 0.55], J: [0.07, 0.18, 0.55],
  T: [0.05, 0.13, 0.45], N: [0.05, 0.13, 0.45],
};
export const PAY_ORDER = ['B', 'E', 'F', 'C', 'H', 'A', 'K', 'Q', 'J', 'T', 'N'];
// Scatter: 3 / 4 / 5 coins anywhere pay x total bet and award free spins.
export const SCATTER_PAYS = [2, 10, 50];
export const FS_AWARD = [8, 15, 20];
// Free-spin retriggers: 2 coins = +5, 3+ coins = +8.
export const RETRIGGER = n => (n >= 3 ? 8 : n === 2 ? 5 : 0);
// Free-spin wild multiplier: one float per wild cell; below P2 -> 2x, else 3x.
export const P2 = 0.6;
export const STAMPEDE_AT = 15;

// Reel strips (circular), tuned by Monte Carlo. Coins are spaced so at most one shows per reel; bison come in stacks.
export const STRIPS = [
  'NJEAKEATQQTCSFAAJQFKNNBHNTJASHKBBBBJKHTEANCNNTQQJNFCQTCQKHCBKKJFQJNEHABBBBTJTT',
  'NQJHNAHTJJCAKTANQAFJHJTQFCCJHNQCNTEAKCNWQTEQTNKSBQKNASTAKTWWKJTFEJBBBBQBBBBBFKEHN',
  'QCJATNWFQQTJEBCTBBBBKJCJQNETWTKWWKHKBQFACJATHHSACNKNNHFKNHJTEEQAKTJABBBBNQQASJNNTF',
  'TJEAJBFNQQJKACAKJBBBBJNCQEQNTNBBBBBAKHCWWFAATTQFCHQWNNQTJSHFKKQKNECTTEHANKJJTTHNS',
  'TNAJCKKFSJHBBBBTTFJJAHJSQQEEAKFBBBBBHQQHTTAQNJKTCNNNQNANFKBAJTQJCHTAKNETQCKNCE',
];

export const stopFor = (strip, f) => Math.min(strip.length - 1, Math.floor(f * strip.length));

// grid[reel][row]; stop = index of the top visible row.
export function windowAt(stops, strips = STRIPS) {
  return stops.map((st, i) => { const s = strips[i], n = s.length; return [0, 1, 2, 3].map(r => s[(st + r) % n]); });
}

// 12 floats -> multipliers for wild cells on reels 2-4 (index [reel][row]); 1 elsewhere.
export function wildMults(grid, f) {
  return grid.map((col, i) => col.map((g, r) => (g === 'W' && i >= 1 && i <= 3 ? (f[(i - 1) * 4 + r] < P2 ? 2 : 3) : 1)));
}

// Evaluate a grid. mults (optional) = per-cell multipliers for wilds (free spins). Wins are multiples of the total bet.
export function evaluate(grid, mults = null) {
  const wins = [];
  let total = 0;
  for (const sym of PAY_ORDER) {
    if (!grid[0].includes(sym)) continue;
    let n = 0, ways = 1, mw = 1, wilds = 0;
    const cells = [];
    for (let i = 0; i < REELS; i++) {
      let c = 0, cm = 0;
      for (let r = 0; r < ROWS; r++) {
        const g = grid[i][r];
        if (g === sym) { c++; cm += 1; cells.push([i, r]); }
        else if (g === 'W') { c++; cm += mults ? mults[i][r] : 1; cells.push([i, r]); wilds++; }
      }
      if (!c) break;
      n++; ways *= c; mw *= cm;
    }
    if (n < 3) { continue; }
    // keep only cells on the paying reels
    const used = cells.filter(([i]) => i < n);
    // mw = sum over ways of the product of wild multipliers on that way (each way's product <= 3^3 = WAY_CAP)
    const win = PAYS[sym][n - 3] * mw;
    total += win;
    wins.push({ sym, count: n, ways, mult: ways ? mw / ways : 1, win, cells: used, wilds: used.filter(([i, r]) => grid[i][r] === 'W').length });
  }
  const scatCells = [];
  grid.forEach((col, i) => col.forEach((g, r) => g === 'S' && scatCells.push([i, r])));
  return { wins, total, scatCells, scat: scatCells.length };
}

// One spin. floats: 5 (base) or 17 (free spin: 5 stops + 12 wild multipliers).
export function spin(floats, fs = false, strips = STRIPS) {
  const stops = floats.slice(0, REELS).map((f, i) => stopFor(strips[i], f));
  const grid = windowAt(stops, strips);
  const mults = fs ? wildMults(grid, floats.slice(REELS, REELS + 12)) : null;
  const res = evaluate(grid, mults);
  const k = Math.min(res.scat, 5) - 3;
  res.scatWin = k >= 0 ? SCATTER_PAYS[k] : 0;
  res.total += res.scatWin;
  res.spins = fs ? RETRIGGER(res.scat) : k >= 0 ? FS_AWARD[k] : 0;
  res.bison = grid.reduce((a, col) => a + col.filter(g => g === 'B').length, 0);
  res.stampede = res.bison >= STAMPEDE_AT;
  return { stops, grid, mults, ...res };
}
export const FS_FLOATS = REELS + 12;

// Free-spin bookkeeping: never award more than FS_CAP spins in one round.
export const addSpins = (awarded, add) => Math.max(0, Math.min(add, FS_CAP - awarded));

// Synchronous full round for simulations: next(n) returns n floats. Returns total multiple of the bet (capped).
export function playRound(next, strips = STRIPS) {
  const base = spin(next(REELS), false, strips);
  let total = base.total, awarded = 0, left = 0, spins = 0, stampede = base.stampede ? 1 : 0;
  if (base.spins) awarded = left = addSpins(0, base.spins);
  while (left > 0 && total < MAX_WIN) {
    left--; spins++;
    const r = spin(next(FS_FLOATS), true, strips);
    total += r.total; if (r.stampede) stampede++;
    if (r.spins) { const a = addSpins(awarded, r.spins); awarded += a; left += a; }
  }
  return { total: Math.min(total, MAX_WIN), base: base.total, triggered: awarded > 0, spins, stampede, capped: total >= MAX_WIN };
}
