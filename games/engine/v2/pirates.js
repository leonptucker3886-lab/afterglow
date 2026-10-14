/* PIRATES GOLD — 5x3 pirate slot, 20 paylines.
 * Parrot is WILD (reels 2-4), substitutes for all crew and loot. No extras.
 *
 * PAYTABLE (line-bet multiples, 3 / 4 / 5 of a kind):
 *   captain 25 / 75  / 250
 *   ship    18 / 50  / 150
 *   chest   12 / 35  / 90
 *   map      9 / 25  / 60
 *   compass  6 / 15  / 50
 *   anchor   5 / 14  / 30
 * Strips (weighted stops per reel; parrot only on reels 2-4):
 *   R1/R5: captain:2 ship:2 chest:3 map:4 compass:5 anchor:6          (22)
 *   R2-4:  captain:2 ship:2 chest:3 map:4 compass:4 anchor:5 parrot:2 (22)
 *
 * SIM RESULTS (3,000,000 spins, seeds 5/6/7, bet 100; exact RTP by
 * per-line outcome enumeration):
 *   exact RTP 96.03% | sim RTP 96.29% | hit freq 19.90% | max win 148.3x bet
 */
import { mulberry32, PAYLINES_20, stopReel } from './common.js';

export const SYMBOLS = {
  captain: { name: 'Captain',       pays: { '3': 25, '4': 75,  '5': 250 } },
  ship:    { name: 'Ship',          pays: { '3': 18, '4': 50,  '5': 150 } },
  chest:   { name: 'Treasure Chest',pays: { '3': 12, '4': 35,  '5': 90 } },
  map:     { name: 'Map',           pays: { '3': 9,  '4': 25,  '5': 60 } },
  compass: { name: 'Compass',       pays: { '3': 6,  '4': 15,  '5': 50 } },
  anchor:  { name: 'Anchor',        pays: { '3': 5,  '4': 14,  '5': 30 } },
  parrot:  { name: 'Parrot', wild: true, pays: {} },
};

export const META = {
  id: 'pirates',
  name: "Pirate's Gold",
  tagline: 'Sail the lines — the parrot fills in for the whole crew.',
  reels: 5,
  rows: 3,
  lines: 20,
  wild: 'parrot',
  volatility: 'medium',
  targetRTP: 0.96,
  features: ['5x3', '20 paylines', 'Parrot wild on reels 2-4'],
};

const WILD = 'parrot';
const LINES = PAYLINES_20;

function buildStrip(weights) {
  const s = [];
  for (const id in weights) for (let i = 0; i < weights[id]; i++) s.push(id);
  return s;
}
const STRIPS = [
  buildStrip({ captain: 2, ship: 2, chest: 3, map: 4, compass: 5, anchor: 6 }),
  buildStrip({ captain: 2, ship: 2, chest: 3, map: 4, compass: 4, anchor: 5, parrot: 2 }),
  buildStrip({ captain: 2, ship: 2, chest: 3, map: 4, compass: 4, anchor: 5, parrot: 2 }),
  buildStrip({ captain: 2, ship: 2, chest: 3, map: 4, compass: 4, anchor: 5, parrot: 2 }),
  buildStrip({ captain: 2, ship: 2, chest: 3, map: 4, compass: 5, anchor: 6 }),
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
    if (target === null) continue; // all-wild run: parrot carries no paytable
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
