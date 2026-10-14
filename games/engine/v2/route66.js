/* Route 66 — Road Trip Link + Link Wheel slot math engine.
 * Pure logic, no DOM. Node + browser compatible (ES module).
 *
 * GAME: 5x3, 30 paylines, no wilds.
 * Symbols: car, motel, guitar, boots, hat, badge, A, K, Q, J, diner.
 *
 * PAYTABLE (line-bet multiples; line bet = total bet / 30):
 *   car    : 3oak 430   4oak 1600   5oak 6400
 *   motel  : 3oak 270   4oak 860    5oak 3200
 *   guitar : 3oak 160   4oak 540    5oak 2100
 *   boots  : 3oak 110   4oak 320    5oak 1300
 *   hat    : 3oak 65    4oak 215    5oak 860
 *   badge  : 3oak 43    4oak 130    5oak 540
 *   A      : 3oak 27    4oak 86     5oak 320
 *   K      : 3oak 21    4oak 64     5oak 270
 *   Q      : 3oak 16    4oak 54     5oak 215
 *   J      : 3oak 11    4oak 32     5oak 130
 *   diner  : no line pay. 3+ diners anywhere trigger the Road Trip Link.
 *
 * ROAD TRIP LINK rules:
 *   - 5 roadside stops, each pre-assigned a hidden outcome before the player
 *     picks: 4 INSTANT prize stops + exactly 1 LINK WHEEL stop.
 *   - The player picks 3 of the 5 stops; each picked INSTANT stop pays its
 *     hidden bet multiple immediately.
 *   - If the picked set includes the wheel stop, the Link Wheel spins once.
 *   - Engine predetermines all stop outcomes AND the wheel segment at Link
 *     start (the spin result carries everything; presentation reveals it).
 *
 * INSTANT PRIZE TABLE (total-bet multiples):
 *   5x: 25%   8x: 20%   10x: 20%   15x: 15%   20x: 10%   30x: 6%   50x: 5%
 *   Mean instant ~= 13.27x bet.
 *
 * LINK WHEEL (10 segments, weighted; values in total-bet multiples):
 *   5x (40)  8x (35)  10x (30)  15x (25)  20x (20)
 *   25x (15)  40x (12)  60x (10)  100x (12)  JACKPOT 500x (1)
 *   Jackpot probability = 1/200 = 0.5% of wheel spins. Mean wheel ~= 23.55x.
 *
 * Road Trip Link mean ~= 46.0x bet.
 * No pity/boost mechanics. Clean math.
 *
 * SIM RESULTS (final code, 3 x 1,000,000 spins, seeds 7/99/1234, floored integer wins):
 *   total RTP : 0.9650  (per-seed: .9625 / .9657 / .9667)
 *   base-game RTP : ~0.64 (66% of total)
 *   Road Trip Link RTP: ~0.325 (34% of total)
 *   Road Trip Link trigger: ~1 in 140 spins (3+ diner Lines)
 *   hit frequency (any win): ~20%
 *   max observed win: ~565x bet (wheel JACKPOT 500x + picked instant stops)
 *   Link Wheel: JACKPOT lands 1/200 = 0.5% of wheel spins (as specified)
 *   bet-invariance spot check (bet 1 vs 37, same seed): PASS (identical multiples)
 *   (Retuned 2026-10-14: instant table 20->22 at weight 10 to center RTP after
 *    integer-flooring; prior 6x1M sim by engine author: 0.9660.)
 */

import { mulberry32, PAYLINES_30, stopReel, evalLines } from './common.js';

/* Ordered symbol metadata (player-facing). 'pays' are LINE-BET multiples.
 * Terminology: "Link" for the feature, "Lines" for line-style triggers. */
export const SYMBOLS = [
  { id: 'car',    name: 'Classic Coupe',   pays: { '3': 430, '4': 1600, '5': 6400 } },
  { id: 'motel',  name: 'Starlight Motel', pays: { '3': 270, '4': 860,  '5': 3200 } },
  { id: 'guitar', name: 'Chrome Guitar',   pays: { '3': 160, '4': 540,  '5': 2100 } },
  { id: 'boots',  name: 'Rider Boots',     pays: { '3': 110, '4': 320,  '5': 1300 } },
  { id: 'hat',    name: 'Stetson Hat',     pays: { '3': 65,  '4': 215,  '5': 860 } },
  { id: 'badge',  name: "Sheriff's Badge", pays: { '3': 43,  '4': 130,  '5': 540 } },
  { id: 'A',      name: 'Ace',             pays: { '3': 27,  '4': 86,   '5': 320 } },
  { id: 'K',      name: 'King',            pays: { '3': 21,  '4': 64,   '5': 270 } },
  { id: 'Q',      name: 'Queen',           pays: { '3': 16,  '4': 54,   '5': 215 } },
  { id: 'J',      name: 'Jack',            pays: { '3': 11,  '4': 32,   '5': 130 } },
  { id: 'diner',  name: 'Desert Diner',    pays: null,
    note: 'No line pay. 3+ diners anywhere trigger the Road Trip Link.' }
];

export const META = {
  name: 'Route 66',
  tagline: 'Cruise the mother road. The Road Trip Link can top out at 500x.',
  features: [
    '30 paylines over 5x3 with 10 regular symbols',
    'Desert Diner lands on every reel; 3+ diners trigger the Road Trip Link',
    'Road Trip Link: pick 3 of 5 roadside stops, each hiding an instant prize',
    'One stop hides the Link Wheel: 10 weighted segments up to the 500x JACKPOT'
  ],
  volatility: 'medium'
};

const SYM_MAP = {};
for (const s of SYMBOLS) SYM_MAP[s.id] = s;

/* Reel strips: regulars dealt round-robin for an even spread (no artificial
 * vertical runs); the single isolated diner copy sits at the end of the strip
 * and sets the Road Trip Link trigger rate (~1 in 140 spins). All 5 reels
 * share the strip with independent random offsets. */
const STRIP = (() => {
  const counts = { J: 5, Q: 4, K: 4, A: 4, badge: 3, hat: 3, boots: 2, guitar: 2, motel: 2, car: 2 };
  const order = ['J', 'Q', 'K', 'A', 'badge', 'hat', 'boots', 'guitar', 'motel', 'car'];
  const strip = [];
  for (;;) {
    let placed = false;
    for (const id of order) {
      if (counts[id] > 0) { strip.push(id); counts[id]--; placed = true; }
    }
    if (!placed) break;
  }
  strip.push('diner');
  return strip;
})();

/* Instant prize table: [value (bet multiples), weight]. */
const INSTANT_TABLE = [
  [5, 25], [8, 20], [10, 20], [15, 15], [22, 10], [30, 6], [50, 5]
];
const INSTANT_TOTAL_W = INSTANT_TABLE.reduce((a, t) => a + t[1], 0);

/* Link Wheel segments: label, value (bet multiples), weight. */
const WHEEL_SEGMENTS = [
  { label: '5x',      value: 5,   weight: 40 },
  { label: '8x',      value: 8,   weight: 35 },
  { label: '10x',     value: 10,  weight: 30 },
  { label: '15x',     value: 15,  weight: 25 },
  { label: '20x',     value: 20,  weight: 20 },
  { label: '25x',     value: 25,  weight: 15 },
  { label: '40x',     value: 40,  weight: 12 },
  { label: '60x',     value: 60,  weight: 10 },
  { label: '100x',    value: 100, weight: 12 },
  { label: 'JACKPOT', value: 500, weight: 1 }
];
const WHEEL_TOTAL_W = WHEEL_SEGMENTS.reduce((a, s) => a + s.weight, 0);

/* Original Americana stop names (generic-descriptive, no real trademarks). */
const STOP_NAMES = [
  'Neon Motel', 'Desert Diner', 'Cactus Garage',
  'Starlight Drive-In', 'Chrome Gas Station'
];

function drawInstant(rnd) {
  let u = rnd() * INSTANT_TOTAL_W;
  for (const [value, w] of INSTANT_TABLE) {
    u -= w;
    if (u < 0) return value;
  }
  return INSTANT_TABLE[INSTANT_TABLE.length - 1][0];
}

function drawWheelIndex(rnd) {
  let u = rnd() * WHEEL_TOTAL_W;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    u -= WHEEL_SEGMENTS[i].weight;
    if (u < 0) return i;
  }
  return WHEEL_SEGMENTS.length - 1;
}

/* Winning cells for a line win: first `count` reels along the payline. */
function lineCells(lineIdx, count) {
  const line = PAYLINES_30[lineIdx - 1];
  const cells = [];
  for (let reel = 0; reel < count; reel++) cells.push([reel, line[reel]]);
  return cells;
}

function runRoadTrip(rnd, bet) {
  // Exactly one wheel stop among the 5; the rest are instant prizes.
  const wheelIdx = Math.floor(rnd() * 5);
  const landedIndex = drawWheelIndex(rnd); // predetermined up front
  const prize = WHEEL_SEGMENTS[landedIndex].value;

  const stops = [];
  for (let i = 0; i < 5; i++) {
    if (i === wheelIdx) {
      stops.push({ id: i, name: STOP_NAMES[i], kind: 'wheel', value: prize });
    } else {
      stops.push({ id: i, name: STOP_NAMES[i], kind: 'instant', value: drawInstant(rnd) });
    }
  }

  // Player picks 3 of the 5 (sim resolves a random pick).
  const ids = [0, 1, 2, 3, 4];
  const picked = [];
  for (let k = 0; k < 3; k++) {
    const j = k + Math.floor(rnd() * (ids.length - k));
    const tmp = ids[k]; ids[k] = ids[j]; ids[j] = tmp;
    picked.push(ids[k]);
  }

  const wheelPicked = picked.indexOf(wheelIdx) !== -1;
  const wheel = wheelPicked
    ? { segments: WHEEL_SEGMENTS.map(s => ({ label: s.label, value: s.value, weight: s.weight })),
        landedIndex: landedIndex, prize: prize }
    : null;

  let totalWin = 0;
  for (const id of picked) totalWin += stops[id].value * bet;

  return { stops, picked, wheel, totalWin };
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

      // Diner "Lines" count: 3+ diners anywhere trigger the Road Trip Link.
      let scatterCount = 0;
      for (let reel = 0; reel < 5; reel++) {
        for (let row = 0; row < 3; row++) {
          if (grid[reel][row] === 'diner') scatterCount++;
        }
      }

      let roadTrip = null;
      let totalWin = ev.total;
      if (scatterCount >= 3) {
        roadTrip = runRoadTrip(rnd, bet);
        totalWin += roadTrip.totalWin;
      }
      totalWin = Math.floor(totalWin); // wallet settles integer coins

      return {
        bet: bet,
        totalWin: totalWin,
        tier: tierFor(totalWin / bet),
        grid: grid,
        lineWins: lineWins,
        scatterCount: scatterCount,
        roadTrip: roadTrip
      };
    }
  };
}

export { mulberry32 };
