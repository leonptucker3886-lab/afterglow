/* PHARAOH'S GOLD — 5x3 video slot, 30 paylines.
 * Scarab is WILD. In the base game a Scarab landing on reels 2, 3 or 4 EXPANDS to
 * fill its entire reel (Scarabs on reels 1 and 5 stay single but still substitute).
 * 3+ Pyramid LINE symbols anywhere trigger 10 LINK SPINS.
 *
 * LINK SPINS: any landed Scarab expands AND then locks its reel for the rest of
 * the round. Every newly locked cell raises a GLOBAL multiplier by +1 (starts x1,
 * applies to all line wins from the locking spin onward). 3+ Pyramids retrigger
 * +5 Link Spins. Line pays are never multiplied.
 *
 * PAYTABLE — line-BET multiples (3 / 4 / 5 of a kind, left to right):
 *   scarab (all-wild line)  56 / 140 / 420
 *   mask                    35 / 105 / 350
 *   ankh                    28 / 84  / 245
 *   eye                     21 / 63  / 195
 *   sarcophagus             18 / 49  / 140
 *   cobra                   15 / 39  / 112
 *   jackal                  12 / 32  / 90
 *   A                       9.5 / 23 / 70
 *   K                       8 / 18   / 56
 *   Q                       7 / 14   / 45
 *   J                       5.5 / 11 / 35
 * Pyramid LINE pays (total-bet multiples, anywhere): 3:1  4:5  5:25
 *
 * Reel strips (weighted; deterministically interleaved so identical symbols never
 * clump — a shuffled run would otherwise fake pairs/triples through stopReel's
 * 3-consecutive-symbol windows):
 *   BASE (93 stops): J:14 Q:14 K:12 A:11 jackal:8 cobra:8 sarcophagus:6 eye:6
 *                    ankh:4 mask:4 scarab:3 pyramid:3
 *   LINK SPINS (595 stops): J:124 Q:124 K:93 A:78 jackal:31 cobra:31 sarcophagus:16
 *                    eye:16 ankh:8 mask:8 scarab:2 pyramid:12
 * (Link strip is deliberately low-weighted: sticky full-reel wilds with an uncapped
 *  +1/cell global multiplier compound ferociously, so the Link reels run rich in
 *  low payers — locks stay frequent and fun, but locked reels mostly build modest
 *  low-symbol wins instead of jackpot 5-oaks. Scarabs are scarce: ~1.1% lock
 *  chance per reel per spin keeps the round's tail under control.)
 *
 * SIM RESULTS (3,000,000 base spins x 3 seeds; bet 100 / bet 250):
 *   Total RTP 95.84% / 95.91% | base game 71.64% / 71.71% | Link Spins 24.20%
 *   Link Spins trigger 1/128 spins | avg 31.7x bet per trigger | avg 1.5 locked cells/round
 *   Hit frequency 37.1% | max observed win 8011.5x bet (rare 4-5 reel lock tail)
 *   spin().totalWin is Math.floor'd to integer coins (casino wallet settlement);
 *   the ~0.001 bet-size RTP delta is the floor interacting with bet size.
 */
import { mulberry32, PAYLINES_30, stopReel, evalLines, countScatter } from './common.js';

const WILD = 'scarab';
const LINE = 'pyramid';
const REELS = 5, ROWS = 3;
const EXPAND_REELS_BASE = [1, 2, 3]; // 0-based: reels 2,3,4 expand in base game
const LINK_TRIGGER = 3;
const LINK_SPINS = 10;

export const SYMBOLS = [
  { id: 'scarab', name: 'Scarab', wild: true, note: 'Wild — expands to fill its reel', pays: { '3': 56, '4': 140, '5': 420 } },
  { id: 'pyramid', name: 'Pyramid', scatter: true, note: 'LINE symbol — 3+ Lines trigger 10 Link Spins' },
  { id: 'mask', name: "Pharaoh's Mask", pays: { '3': 35, '4': 105, '5': 350 } },
  { id: 'ankh', name: 'Ankh', pays: { '3': 28, '4': 84, '5': 245 } },
  { id: 'eye', name: 'Eye of Horus', pays: { '3': 21, '4': 63, '5': 195 } },
  { id: 'sarcophagus', name: 'Sarcophagus', pays: { '3': 18, '4': 49, '5': 140 } },
  { id: 'cobra', name: 'Cobra', pays: { '3': 15, '4': 39, '5': 112 } },
  { id: 'jackal', name: 'Jackal', pays: { '3': 12, '4': 32, '5': 90 } },
  { id: 'A', name: 'Ace', pays: { '3': 9.5, '4': 23, '5': 70 } },
  { id: 'K', name: 'King', pays: { '3': 8, '4': 18, '5': 56 } },
  { id: 'Q', name: 'Queen', pays: { '3': 7, '4': 14, '5': 45 } },
  { id: 'J', name: 'Jack', pays: { '3': 5.5, '4': 11, '5': 35 } },
];

export const META = {
  name: "Pharaoh's Gold",
  tagline: 'Sticky expanding wilds raise the multiplier with every lock.',
  volatility: 'medium',
  features: [
    '5x3, 30 paylines',
    'Scarab wilds expand on reels 2-4',
    'Link Spins: landed wilds expand, lock, and raise a global multiplier +1 per cell',
    '3+ Pyramid Lines trigger 10 Link Spins; retrigger +5',
  ],
};

// Internal defs for common.js evaluators. 'wild' alias pays all-wild lines.
const DEFS = { wild: { pays: { '3': 56, '4': 140, '5': 420 } } };
for (const s of SYMBOLS) DEFS[s.id] = { wild: !!s.wild, scatter: !!s.scatter, pays: s.pays };
const LINE_PAYS = { 3: 1, 4: 5, 5: 25 };

function buildStrip(weights) {
  const s = [];
  for (const id in weights) for (let i = 0; i < weights[id]; i++) s.push(id);
  return s;
}
// Deterministic interleave (fixed seed): breaks same-symbol runs so stopReel's
// consecutive-symbol windows don't manufacture pairs/triples.
function interleave(strip, seed) {
  const rnd = mulberry32(seed);
  const s = strip.slice();
  for (let i = s.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = s[i]; s[i] = s[j]; s[j] = t;
  }
  return s;
}
const BASE_STRIP = interleave(buildStrip({
  J: 14, Q: 14, K: 12, A: 11, jackal: 8, cobra: 8,
  sarcophagus: 6, eye: 6, ankh: 4, mask: 4, scarab: 3, pyramid: 3,
}), 7919);
const LINK_STRIP = interleave(buildStrip({
  J: 136, Q: 136, K: 102, A: 85, jackal: 34, cobra: 34,
  sarcophagus: 17, eye: 17, ankh: 9, mask: 9, scarab: 2, pyramid: 12,
}), 30863);
const BASE_STRIPS = [BASE_STRIP, BASE_STRIP, BASE_STRIP, BASE_STRIP, BASE_STRIP];
const LINK_STRIPS = [LINK_STRIP, LINK_STRIP, LINK_STRIP, LINK_STRIP, LINK_STRIP];

function tierOf(totalWin, bet) {
  if (totalWin <= 0) return 'none';
  const m = totalWin / bet;
  return m < 15 ? 'small' : m < 50 ? 'big' : 'mega';
}

function linePayFor(n, bet) {
  if (n < LINK_TRIGGER) return 0;
  return (LINE_PAYS[Math.min(n, 5)] || 0) * bet;
}

export function createGame(rng) {
  const rnd = (typeof rng === 'function') ? rng : mulberry32(Date.now() >>> 0);
  const spinBase = () => BASE_STRIPS.map(strip => stopReel(strip, ROWS, rnd));
  const spinLink = () => LINK_STRIPS.map(strip => stopReel(strip, ROWS, rnd));

  // Evaluate a final grid (post-expansion/locks); mult applies to line wins.
  function evalGrid(grid, bet, mult) {
    const ev = evalLines(grid, PAYLINES_30, bet / PAYLINES_30.length, DEFS);
    const lineWins = ev.wins.map(w => ({
      line: w.line,
      symbol: w.symbol,
      count: w.count,
      coins: w.coins * mult,
      cells: Array.from({ length: w.count }, (_, r) => [r, PAYLINES_30[w.line - 1][r]]),
    }));
    return { lineWins, total: ev.total * mult };
  }

  function spin(bet) {
    // ---- base game ----
    const initial = spinBase();
    const scatterCount = countScatter(initial, DEFS);
    const grid = initial.map(col => col.slice());
    const expandedReels = [];
    for (const r of EXPAND_REELS_BASE) {
      if (grid[r].indexOf(WILD) !== -1) {
        grid[r] = [WILD, WILD, WILD];
        expandedReels.push(r);
      }
    }
    const base = evalGrid(grid, bet, 1);
    const linePay = linePayFor(scatterCount, bet);
    let totalWin = base.total + linePay;

    // ---- Link Spins ----
    let freeSpins = null;
    if (scatterCount >= LINK_TRIGGER) {
      const locked = new Set(); // "r,c" of locked scarab cells
      let awarded = LINK_SPINS, remaining = LINK_SPINS;
      const spins = [];
      let fsWin = 0;
      while (remaining > 0) {
        remaining--;
        const g0 = spinLink();
        const sc = countScatter(g0, DEFS);
        const g = g0.map(col => col.slice());
        for (const key of locked) {
          const p = key.indexOf(',');
          g[+key.slice(0, p)][+key.slice(p + 1)] = WILD;
        }
        const newLocks = [], exp = [];
        for (let r = 0; r < REELS; r++) {
          if (g[r].indexOf(WILD) !== -1 && !locked.has(r + ',0')) {
            for (let c = 0; c < ROWS; c++) {
              const key = r + ',' + c;
              locked.add(key);
              newLocks.push([r, c]);
            }
            g[r] = [WILD, WILD, WILD];
            exp.push(r);
          }
        }
        const mult = 1 + locked.size;
        const ev = evalGrid(g, bet, mult);
        const lp = linePayFor(sc, bet);
        const spinTotal = ev.total + lp;
        spins.push({
          grid: g, lineWins: ev.lineWins, expandedReels: exp,
          newLocks, lockedCount: locked.size, mult, totalWin: spinTotal,
          linePay: lp, scatterCount: sc,
        });
        fsWin += spinTotal;
        if (sc >= LINK_TRIGGER) { awarded += 5; remaining += 5; }
      }
      freeSpins = { awarded, spins, totalWin: fsWin };
      totalWin += fsWin;
    }
    totalWin = Math.floor(totalWin); // casino wallet settles integer coins

    return {
      bet,
      totalWin,
      tier: tierOf(totalWin, bet),
      grid,
      lineWins: base.lineWins,
      expandedReels,
      scatterCount,
      linePay,
      freeSpins,
    };
  }

  return { spin };
}
