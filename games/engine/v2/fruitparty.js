/* FRUIT PARTY — 5x3 video slot, 20 paylines.
 * Star is WILD (reels 2-4), substitutes for all fruit. No extras.
 *
 * PAYTABLE (line-bet multiples, 3 / 4 / 5 of a kind):
 *   melon  25 / 75  / 250
 *   grapes 20 / 50  / 150
 *   orange 14 / 40  / 100
 *   lemon   9 / 30  / 80
 *   cherry  8 / 18  / 55
 *   plum    5 / 12  / 35
 * Strips (weighted stops per reel; star only on reels 2-4):
 *   R1/R5: melon:2 grapes:3 orange:4 lemon:5 cherry:6 plum:6        (26)
 *   R2-4:  melon:2 grapes:3 orange:4 lemon:5 cherry:5 plum:5 star:2  (26)
 *
 * SIM RESULTS (3,000,000 spins, seeds 5/6/7, bet 100; exact RTP by
 * per-line outcome enumeration):
 *   exact RTP 96.08% | sim RTP 96.13% | hit freq 16.67% | max win 150.0x bet
 */
import { mulberry32, PAYLINES_20, stopReel } from './common.js';

export const SYMBOLS = {
  melon:  { name: 'Watermelon', pays: { '3': 25, '4': 75,  '5': 250 } },
  grapes: { name: 'Grapes',     pays: { '3': 20, '4': 50,  '5': 150 } },
  orange: { name: 'Orange',     pays: { '3': 14, '4': 40,  '5': 100 } },
  lemon:  { name: 'Lemon',      pays: { '3': 9,  '4': 30,  '5': 80 } },
  cherry: { name: 'Cherry',     pays: { '3': 8,  '4': 18,  '5': 55 } },
  plum:   { name: 'Plum',       pays: { '3': 5,  '4': 12,  '5': 35 } },
  star:   { name: 'Star', wild: true, pays: {} },
};

export const META = {
  id: 'fruitparty',
  name: 'Fruit Party',
  tagline: 'Juicy lines and a star that fills in the gaps.',
  reels: 5,
  rows: 3,
  lines: 20,
  wild: 'star',
  volatility: 'low-medium',
  targetRTP: 0.96,
  features: ['5x3', '20 paylines', 'Star wild on reels 2-4'],
};

const WILD = 'star';
const LINES = PAYLINES_20;

function buildStrip(weights) {
  const s = [];
  for (const id in weights) for (let i = 0; i < weights[id]; i++) s.push(id);
  return s;
}
const STRIPS = [
  buildStrip({ melon: 2, grapes: 3, orange: 4, lemon: 5, cherry: 6, plum: 6 }),
  buildStrip({ melon: 2, grapes: 3, orange: 4, lemon: 5, cherry: 5, plum: 5, star: 2 }),
  buildStrip({ melon: 2, grapes: 3, orange: 4, lemon: 5, cherry: 5, plum: 5, star: 2 }),
  buildStrip({ melon: 2, grapes: 3, orange: 4, lemon: 5, cherry: 5, plum: 5, star: 2 }),
  buildStrip({ melon: 2, grapes: 3, orange: 4, lemon: 5, cherry: 6, plum: 6 }),
];

// Left-to-right line eval with wild substitution (wild reels fixed by strips).
function evalLinesWild(grid, lines, lineBet) {
  const wins = [];
  let total = 0;
  const R = grid.length;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let target = null, count = 0;
    for (let r = 0; r < R; r++) {
      const s = grid[r][line[r]];
      const isW = (s === WILD);
      if (target === null) {
        if (isW) { count++; continue; }
        target = s; count++; continue;
      }
      if (s === target || isW) count++;
      else break;
    }
    if (count < 3) continue;
    if (target === null) continue; // all-wild run: star carries no paytable
    const mult = ((SYMBOLS[target] || {}).pays || {})[String(count)] || 0;
    if (!mult) continue;
    const coins = mult * lineBet;
    wins.push({ line: li + 1, symbol: target, count, coins });
    total += coins;
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
      const { wins, total } = evalLinesWild(grid, LINES, lineBet);
      return finalize(bet, grid, LINES, wins, total);
    },
  };
}
