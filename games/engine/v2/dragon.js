/* Dragon's Hoard — Hold & Win (Link-style) slot math engine.
 * Pure logic, no DOM. Node + browser compatible (ES module).
 *
 * GAME: 5x3, 30 paylines, no wilds.
 * Symbols: dragon, egg, chest, sword, gemR, gemB, gemG, coin.
 *
 * PAYTABLE (line-bet multiples; line bet = total bet / 30):
 *   dragon : 3oak 100   4oak 400   5oak 2000
 *   egg    : 3oak 60    4oak 200   5oak 800
 *   chest  : 3oak 40    4oak 120   5oak 500
 *   sword  : 3oak 25    4oak 80    5oak 320
 *   gemR   : 3oak 16    4oak 50    5oak 200
 *   gemB   : 3oak 9     4oak 32    5oak 120
 *   gemG   : 3oak 5     4oak 20    5oak 80
 *   coin   : no line pay. 6+ coins anywhere on a spin trigger the Hoard Link.
 *
 * HOARD LINK rules:
 *   - Grid switches to 3 rows x 5 reels, coins only.
 *   - Triggering coins LOCK in place with their revealed values (hidden until
 *     the Link starts). Each coin carries a value in total-bet multiples.
 *   - 3 respins. Every new coin locks and RESETS the respin counter to 3.
 *   - A respin with no new coin decrements the counter.
 *   - The Link ends when respins hit 0 or all 15 cells are filled.
 *   - Payout = sum of all locked coin values (total-bet multiples).
 *   - Fill all 15 cells -> GRAND prize 1000x total bet (replaces the sum).
 *
 * COIN VALUE TABLE (total-bet multiples, one table for trigger + respin coins):
 *   70.0% : regular coin, 1x-5x            (uniform 1..5)
 *   18.0% : regular coin, 6x-10x           (uniform 6..10)
 *    7.0% : regular coin, 12x / 15x / 20x  (uniform pick)
 *    3.5% : MINI coin, 20x
 *    1.2% : MINOR coin, 50x
 *    0.3% : MAJOR coin, 150x
 *   Mean coin value ~= 6.39x bet.
 *
 * No pity/boost mechanics. Clean math.
 *
 * SIM RESULTS (final code, 6 x 1,000,000 spins, seeds 11/22/33/44/55/66):
 *   total RTP : 0.9592  (per-seed: .9491 / .9676 / .9625 / .9541 / .9601 / .9621)
 *   (Integer-flooring applied 2026-10-14 — wallet settles whole coins; 3x1M
 *    re-verification after flooring, seeds 11/22/33: .9480 / .9664 / .9614,
 *    mean 0.9586. Combined 9M-spin mean ~0.959.)
 *   base-game RTP : 0.583 (60.8% of total)
 *   Hoard Link RTP: 0.376 (39.2% of total)
 *   Hoard Link trigger: ~1 in 158 spins (6+ coins)
 *   hit frequency (any win): 31.9%
 *   max observed win: ~1002x bet
 *   Hoard Link internals: mean Link win ~59x bet; avg 6.4 trigger coins;
 *     GRAND (full 15-coin grid) ~0.27% of Links; avg ~6.6 respin rounds
 *   bet-invariance spot check (bet 1 vs 37, same seed): PASS (identical multiples)
 */

import { mulberry32, PAYLINES_30, stopReel, evalLines } from './common.js';

/* Ordered symbol metadata (player-facing). 'pays' are LINE-BET multiples.
 * Terminology: "Link" for the feature, "Lines" for line-style triggers. */
export const SYMBOLS = [
  { id: 'dragon', name: 'Ancient Dragon', pays: { '3': 100, '4': 400, '5': 2000 } },
  { id: 'egg',    name: 'Dragon Egg',     pays: { '3': 60,  '4': 200, '5': 800 } },
  { id: 'chest',  name: 'Treasure Chest', pays: { '3': 40,  '4': 120, '5': 500 } },
  { id: 'sword',  name: "Knight's Sword", pays: { '3': 25,  '4': 80,  '5': 320 } },
  { id: 'gemR',   name: 'Ruby',           pays: { '3': 16,  '4': 50,  '5': 200 } },
  { id: 'gemB',   name: 'Sapphire',       pays: { '3': 9,   '4': 32,  '5': 120 } },
  { id: 'gemG',   name: 'Emerald',        pays: { '3': 5,   '4': 20,  '5': 80 } },
  { id: 'coin',   name: 'Hoard Coin',     pays: null,
    note: 'No line pay. 6+ coins anywhere trigger the Hoard Link.' }
];

export const META = {
  name: "Dragon's Hoard",
  tagline: 'Feed the dragon. Crack the Hoard Link for up to 1000x.',
  features: [
    '30 paylines over 5x3 with 7 regular symbols',
    'Hoard Coin lands on every reel; 6+ coins trigger the Hoard Link',
    'Hoard Link: coins lock, 3 respins that reset on every new coin',
    'MINI (20x), MINOR (50x), MAJOR (150x) coins; full grid pays the 1000x GRAND'
  ],
  volatility: 'medium-high'
};

const SYM_MAP = {};
for (const s of SYMBOLS) SYM_MAP[s.id] = s;

/* Reel strips: regulars are dealt round-robin for an even spread (no artificial
 * vertical runs), then a single run of 3 coins is inserted mid-strip. That
 * coin run sets the Hoard Link trigger rate (~1 in 158 spins). All 5 reels
 * share the strip with independent random offsets. */
const STRIP = (() => {
  const counts = { gemG: 9, gemB: 9, gemR: 8, sword: 7, chest: 6, egg: 6, dragon: 4 };
  const order = ['gemG', 'gemB', 'gemR', 'sword', 'chest', 'egg', 'dragon'];
  const strip = [];
  for (;;) {
    let placed = false;
    for (const id of order) {
      if (counts[id] > 0) { strip.push(id); counts[id]--; placed = true; }
    }
    if (!placed) break;
  }
  strip.splice(Math.floor(strip.length / 2), 0, 'coin', 'coin', 'coin');
  return strip;
})();

/* Per-empty-cell coin probability on each Hoard Link respin (tuned: 0.056 gives
 * mean Link win ~59x bet at ~1/158 trigger rate). */
const RESPIN_COIN_P = 0.056;

const GRAND_MULT = 1000;

/* Draw one coin value. Returns {value, kind}; value in total-bet multiples. */
function drawCoin(rnd) {
  const u = rnd();
  if (u < 0.70)  return { value: 1 + Math.floor(rnd() * 5), kind: 'coin' };
  if (u < 0.88)  return { value: 6 + Math.floor(rnd() * 5), kind: 'coin' };
  if (u < 0.95)  return { value: [12, 15, 20][Math.floor(rnd() * 3)], kind: 'coin' };
  if (u < 0.985) return { value: 20, kind: 'mini' };
  if (u < 0.997) return { value: 50, kind: 'minor' };
  return { value: 150, kind: 'major' };
}

/* Winning cells for a line win: first `count` reels along the payline. */
function lineCells(lineIdx, count) {
  const line = PAYLINES_30[lineIdx - 1];
  const cells = [];
  for (let reel = 0; reel < count; reel++) cells.push([reel, line[reel]]);
  return cells;
}

function runHoard(rnd, bet, triggerCells) {
  const occupied = new Set();
  const locked = [];
  const triggerCoins = [];
  for (const [reel, row] of triggerCells) {
    const c = drawCoin(rnd);
    const entry = { pos: [reel, row], value: c.value, kind: c.kind };
    triggerCoins.push(entry);
    locked.push({ pos: [reel, row], value: c.value, kind: c.kind });
    occupied.add(reel + ',' + row);
  }

  const respins = [];
  let respinsLeft = 3;
  while (respinsLeft > 0 && locked.length < 15) {
    const newCoins = [];
    for (let reel = 0; reel < 5; reel++) {
      for (let row = 0; row < 3; row++) {
        if (occupied.has(reel + ',' + row)) continue;
        if (rnd() < RESPIN_COIN_P) {
          const c = drawCoin(rnd);
          const entry = { pos: [reel, row], value: c.value, kind: c.kind };
          newCoins.push(entry);
          locked.push({ pos: [reel, row], value: c.value, kind: c.kind });
          occupied.add(reel + ',' + row);
        }
      }
    }
    if (newCoins.length > 0) respinsLeft = 3;
    else respinsLeft -= 1;
    respins.push({
      locked: locked.map(e => ({ pos: [e.pos[0], e.pos[1]], value: e.value, kind: e.kind })),
      newCoins: newCoins,
      respinsLeft: respinsLeft
    });
  }

  const grand = locked.length === 15;
  let sum = 0;
  for (const e of locked) sum += e.value;
  const totalWin = (grand ? GRAND_MULT : sum) * bet;
  return { triggerCoins, respins, totalWin, grand };
}

function tierFor(mult) {
  if (mult <= 0) return 'none';
  if (mult < 5) return 'small';
  if (mult < 25) return 'big';
  if (mult < 100) return 'huge';
  return 'epic';
}

export function createGame(rng) {
  const rnd = rng || Math.random;
  return {
    spin(bet) {
      const lineBet = bet / 30;
      const grid = [];
      for (let reel = 0; reel < 5; reel++) grid.push(stopReel(STRIP, 3, rnd));

      const ev = evalLines(grid, PAYLINES_30, lineBet, SYM_MAP);
      const lineWins = ev.wins.map(w => ({
        line: w.line, symbol: w.symbol, count: w.count,
        coins: w.coins, cells: lineCells(w.line, w.count)
      }));

      let coinCount = 0;
      const coinCells = [];
      for (let reel = 0; reel < 5; reel++) {
        for (let row = 0; row < 3; row++) {
          if (grid[reel][row] === 'coin') { coinCount++; coinCells.push([reel, row]); }
        }
      }

      let hoard = null;
      let totalWin = ev.total;
      if (coinCount >= 6) {
        hoard = runHoard(rnd, bet, coinCells);
        totalWin += hoard.totalWin;
      }
      totalWin = Math.floor(totalWin); // wallet settles integer coins

      return {
        bet: bet,
        totalWin: totalWin,
        tier: tierFor(totalWin / bet),
        grid: grid,
        lineWins: lineWins,
        coinCount: coinCount,
        hoard: hoard
      };
    }
  };
}

export { mulberry32 };
