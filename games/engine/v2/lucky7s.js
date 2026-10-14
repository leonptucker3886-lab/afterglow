/* LUCKY 7S — classic 3x3 stepper, 5 paylines (3 rows + 2 diagonals).
 * No wilds, no extras. Pure 3-of-a-kind line pays.
 *
 * PAYTABLE (line-bet multiples, 3 of a kind):
 *   seven 300 | triplebar 100 | doublebar 50 | bell 30 | bar 20 | cherry 10
 * Strips (all 3 reels identical, weighted): seven:1 triplebar:2 doublebar:3
 *   bell:4 bar:5 cherry:7  (22 stops)
 *
 * SIM RESULTS (3,000,000 spins, seeds 5/6/7, bet 100; exact RTP by
 * per-line outcome enumeration):
 *   exact RTP 96.73% | sim RTP 96.22% | hit freq 11.31% | max win 100.0x bet
 */
import { mulberry32, stopReel } from './common.js';

export const SYMBOLS = {
  seven:     { name: 'Seven',      pays: { '3': 300 } },
  triplebar: { name: 'Triple Bar', pays: { '3': 100 } },
  doublebar: { name: 'Double Bar', pays: { '3': 50 } },
  bell:      { name: 'Bell',       pays: { '3': 30 } },
  bar:       { name: 'Bar',        pays: { '3': 20 } },
  cherry:    { name: 'Cherry',     pays: { '3': 10 } },
};

export const META = {
  id: 'lucky7s',
  name: 'Lucky 7s',
  tagline: 'Three reels, five lines, nothing but sevens and bars.',
  reels: 3,
  rows: 3,
  lines: 5,
  wild: null,
  volatility: 'low-medium',
  targetRTP: 0.96,
  features: ['3x3 classic', '5 paylines', 'Sevens pay 300x line bet'],
};

const LINES = [
  [0, 0, 0], [1, 1, 1], [2, 2, 2], // rows
  [0, 1, 2], [2, 1, 0],           // diagonals
];

function buildStrip() {
  const w = { seven: 1, triplebar: 2, doublebar: 3, bell: 4, bar: 5, cherry: 7 };
  const s = [];
  for (const id in w) for (let i = 0; i < w[id]; i++) s.push(id);
  return s;
}
const STRIPS = [buildStrip(), buildStrip(), buildStrip()];

// 3-reel, left-to-right, no wilds: win iff all 3 on the line match.
function evalClassic(grid, lines, lineBet) {
  const wins = [];
  let total = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const s0 = grid[0][line[0]];
    if (grid[1][line[1]] === s0 && grid[2][line[2]] === s0) {
      const mult = ((SYMBOLS[s0] || {}).pays || {})['3'] || 0;
      if (!mult) continue;
      const coins = mult * lineBet;
      wins.push({ line: li + 1, symbol: s0, count: 3, coins });
      total += coins;
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
      const { wins, total } = evalClassic(grid, LINES, lineBet);
      return finalize(bet, grid, LINES, wins, total);
    },
  };
}
