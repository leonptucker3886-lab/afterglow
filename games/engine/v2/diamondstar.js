/* DIAMOND STAR — 5x3 gem slot, 20 paylines.
 * Diamond is the top symbol AND a WILD: any line win that includes at least
 * one diamond pays x2. All-diamond lines pay the diamond table x2.
 * Each line pays its best possible interpretation (max coins).
 *
 * PAYTABLE (line-bet multiples, 3 / 4 / 5 of a kind; x2 when a diamond
 * is part of the win):
 *   diamond  10 / 30 / 100
 *   ruby      6 / 20 / 60
 *   emerald   4 / 12 / 40
 *   sapphire  3 / 10 / 30
 *   amethyst  2 / 6  / 22
 *   quartz    2 / 4  / 14
 * Strips (weighted stops per reel):
 *   R1:   diamond:1 ruby:2 emerald:3 sapphire:4 amethyst:5 quartz:6  (21)
 *   R2-4: diamond:2 ruby:2 emerald:3 sapphire:4 amethyst:4 quartz:5  (20)
 *   R5:   diamond:1 ruby:2 emerald:3 sapphire:4 amethyst:5 quartz:5  (20)
 *
 * SIM RESULTS (3,000,000 spins, seeds 5/6/7, bet 100; exact RTP by
 * per-line outcome enumeration):
 *   exact RTP 96.04% | sim RTP 96.03% | hit freq 29.68% | max win 130.0x bet
 */
import { mulberry32, PAYLINES_20, stopReel } from './common.js';

export const SYMBOLS = {
  diamond:  { name: 'Diamond',  wild: true, mult: 2, pays: { '3': 10, '4': 30,  '5': 100 } },
  ruby:     { name: 'Ruby',     pays: { '3': 6,  '4': 20,  '5': 60 } },
  emerald:  { name: 'Emerald',  pays: { '3': 4,  '4': 12,  '5': 40 } },
  sapphire: { name: 'Sapphire', pays: { '3': 3,  '4': 10,  '5': 30 } },
  amethyst: { name: 'Amethyst', pays: { '3': 2,  '4': 6,   '5': 22 } },
  quartz:   { name: 'Quartz',   pays: { '3': 2,  '4': 4,   '5': 14 } },
};

export const META = {
  id: 'diamondstar',
  name: 'Diamond Star',
  tagline: 'Diamonds are wild — and they double every win they touch.',
  reels: 5,
  rows: 3,
  lines: 20,
  wild: 'diamond',
  volatility: 'medium',
  targetRTP: 0.96,
  features: ['5x3', '20 paylines', 'Diamond wild doubles any win it joins'],
};

const WILD = 'diamond';
const LINES = PAYLINES_20;
const CANDIDATES = ['diamond', 'ruby', 'emerald', 'sapphire', 'amethyst', 'quartz'];

function buildStrip(weights) {
  const s = [];
  for (const id in weights) for (let i = 0; i < weights[id]; i++) s.push(id);
  return s;
}
const STRIPS = [
  buildStrip({ diamond: 1, ruby: 2, emerald: 3, sapphire: 4, amethyst: 5, quartz: 6 }),
  buildStrip({ diamond: 2, ruby: 2, emerald: 3, sapphire: 4, amethyst: 4, quartz: 5 }),
  buildStrip({ diamond: 2, ruby: 2, emerald: 3, sapphire: 4, amethyst: 4, quartz: 5 }),
  buildStrip({ diamond: 2, ruby: 2, emerald: 3, sapphire: 4, amethyst: 4, quartz: 5 }),
  buildStrip({ diamond: 1, ruby: 2, emerald: 3, sapphire: 4, amethyst: 5, quartz: 5 }),
];

// Best-of evaluation: for each candidate symbol, count the leading run of
// (symbol | diamond); any diamond in the run doubles the pay. Keep max coins.
function evalLinesX2(grid, lines, lineBet) {
  const wins = [];
  let total = 0;
  const R = grid.length;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let best = null;
    for (const s of CANDIDATES) {
      let len = 0, wilds = 0;
      for (let r = 0; r < R; r++) {
        const c = grid[r][line[r]];
        if (c === s) { len++; if (s === WILD) wilds++; }
        else if (c === WILD) { len++; wilds++; }
        else break;
      }
      if (len < 3) continue;
      const mult = ((SYMBOLS[s] || {}).pays || {})[String(len)] || 0;
      if (!mult) continue;
      const coins = mult * (wilds > 0 ? 2 : 1) * lineBet;
      if (!best || coins > best.coins) best = { symbol: s, count: len, coins };
    }
    if (best) {
      wins.push({ line: li + 1, symbol: best.symbol, count: best.count, coins: best.coins });
      total += best.coins;
    }
  }
  return { wins, total };
}

function finalize(bet, grid, lines, wins, total) {
  const lineWins = wins.map(w => ({
    line: w.line,
    symbol: w.symbol,
    count: w.count,
    coins: w.coins,
    cells: Array.from({ length: w.count }, (_, r) => [r, lines[w.line - 1][r]]),
  }));
  const totalWin = total;
  const tier = totalWin === 0 ? 'none'
    : totalWin < bet * 10 ? 'small'
    : totalWin < bet * 25 ? 'big' : 'mega';
  return { bet, totalWin, tier, grid, lineWins };
}

export function createGame(rng) {
  const rnd = (typeof rng === 'function') ? rng : mulberry32(Date.now() >>> 0);
  return {
    spin(bet) {
      const grid = STRIPS.map(strip => stopReel(strip, 3, rnd));
      const lineBet = bet / LINES.length;
      const { wins, total } = evalLinesX2(grid, LINES, lineBet);
      return finalize(bet, grid, LINES, wins, total);
    },
  };
}
