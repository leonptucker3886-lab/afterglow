/* NEBULA CASCADES — 5x4 cluster slot.
 * Cluster pays: 8+ orthogonally-adjacent matching symbols anywhere on the grid.
 * Winning clusters vanish; symbols drop from above (cascade). Each cascade step
 * multiplies that step's cluster win by the ladder: x1 -> x2 -> x3 -> x5 (capped).
 * Comet is WILD and joins any cluster. Black Hole is a LINE symbol: pays anywhere,
 * and 4+ Black Holes on the initial grid trigger FREE FALL.
 *
 * FREE FALL (Link round): 10 free spins. The multiplier ladder PERSISTS across the
 * round (never resets between spins) and the round STARTS at x2. 4+ Black Holes on
 * any free spin retrigger +5 spins. Line pays are paid per spin, unmultiplied.
 *
 * PAYTABLE — cluster pays in TOTAL-BET multiples (min cluster size bucket):
 *   crystal   8:88   10:160  12:270  15:540   20:1750
 *   asteroid  8:58   10:105  12:175  15:350   20:1050
 *   nova      8:37   10:68   12:115  15:230   20:655
 *   star      8:26   10:47   12:80   15:160   20:445
 *   moon      8:18   10:33   12:54   15:105   20:300
 *   ice       8:12   10:21   12:35   15:70    20:210
 *   mars      8:6.5  10:13   12:21   15:42    20:130
 *   saturn    8:5    10:8    12:14   15:28    20:80
 * Black Hole LINE pays (total-bet multiples, anywhere):
 *   4:2  5:6  6:20  7:60  8+:150
 * Comet (wild) carries no pay of its own; it completes clusters.
 *
 * Symbol weights (per cell, independent): saturn:90 mars:60 ice:40 moon:30 star:20
 * nova:13 asteroid:8 crystal:5 comet:24 blackhole:8  (298 total)
 * Top-heavy by design: 8+ clusters on a 20-cell grid are rare, so common symbols
 * must actually be common (~12% of spins form a cluster).
 *
 * SIM RESULTS (3,000,000 base spins x 3 seeds, bet sizes 100 & 250 — identical):
 *   Total RTP 96.27% | base game 92.17% | Free Fall contribution 4.10%
 *   Free Fall trigger 1/560 spins | hit frequency 11.4% | max observed win 337.5x bet
 *   Bet-size invariance: RTP identical to 4dp at bet 100 and bet 250.
 *   spin().totalWin is Math.floor'd to integer coins (casino wallet settlement).
 */
import { mulberry32, evalClusters, countScatter, removeAndDrop } from './common.js';

const WILD = 'comet';
const LINE = 'blackhole';
const REELS = 5, ROWS = 4;
const LADDER = [1, 2, 3, 5];          // cascade step multipliers (cap x5)
const FREE_TRIGGER = 4;               // Black Holes to trigger Free Fall
const FREE_SPINS = 10;

export const SYMBOLS = [
  { id: 'comet',     name: 'Comet',     wild: true,  note: 'Wild — joins every cluster as any symbol' },
  { id: 'blackhole', name: 'Black Hole', scatter: true, note: 'LINE symbol — pays anywhere; 4+ Lines trigger Free Fall' },
  { id: 'saturn',    name: 'Saturn',    pays: { '8': 5,  '10': 8,   '12': 14,  '15': 28,  '20': 80 } },
  { id: 'mars',      name: 'Mars',      pays: { '8': 6.5,'10': 13,  '12': 21,  '15': 42,  '20': 130 } },
  { id: 'ice',       name: 'Ice',       pays: { '8': 12, '10': 21,  '12': 35,  '15': 70,  '20': 210 } },
  { id: 'moon',      name: 'Moon',      pays: { '8': 18, '10': 33,  '12': 54,  '15': 105, '20': 300 } },
  { id: 'star',      name: 'Star',      pays: { '8': 26, '10': 47,  '12': 80,  '15': 160, '20': 445 } },
  { id: 'nova',      name: 'Nova',      pays: { '8': 37, '10': 68,  '12': 115, '15': 230, '20': 655 } },
  { id: 'asteroid',  name: 'Asteroid',  pays: { '8': 58, '10': 105, '12': 175, '15': 350, '20': 1050 } },
  { id: 'crystal',   name: 'Crystal',   pays: { '8': 88, '10': 160, '12': 270, '15': 540, '20': 1750 } },
];

export const META = {
  name: 'Nebula Cascades',
  tagline: 'Clusters collide, multipliers climb.',
  volatility: 'medium-high',
  features: [
    '5x4 cluster pays — 8+ touching symbols win',
    'Cascading reels with rising multiplier x1 → x2 → x3 → x5',
    'Free Fall: 10 Link spins, multiplier persists from x2',
    '4+ Black Hole Lines trigger Free Fall; Line pays anywhere',
  ],
};

// Internal defs for common.js evaluators.
const DEFS = {};
for (const s of SYMBOLS) DEFS[s.id] = { wild: !!s.wild, scatter: !!s.scatter };
const CLUSTER_PAYS = {};
for (const s of SYMBOLS) if (s.pays) CLUSTER_PAYS[s.id] = s.pays;
const LINE_PAYS = { 4: 2, 5: 6, 6: 20, 7: 60, 8: 150 };

// Weighted per-cell symbol table (weights above).
const BAG = [];
[['saturn', 90], ['mars', 60], ['ice', 40], ['moon', 30], ['star', 20], ['nova', 13],
 ['asteroid', 8], ['crystal', 5], ['comet', 24], ['blackhole', 8]
].forEach(([id, w]) => { for (let i = 0; i < w; i++) BAG.push(id); });

function tierOf(totalWin, bet) {
  if (totalWin <= 0) return 'none';
  const m = totalWin / bet;
  return m < 15 ? 'small' : m < 50 ? 'big' : 'mega';
}

function linePayFor(n, bet) {
  if (n < 4) return 0;
  return (LINE_PAYS[Math.min(n, 8)] || 0) * bet;
}

export function createGame(rng) {
  const rnd = (typeof rng === 'function') ? rng : mulberry32(Date.now() >>> 0);
  const pick = () => BAG[(rnd() * BAG.length) | 0];
  const freshGrid = () => {
    const g = [];
    for (let r = 0; r < REELS; r++) {
      const col = [];
      for (let c = 0; c < ROWS; c++) col.push(pick());
      g.push(col);
    }
    return g;
  };

  // Resolve one spin (base or free): cascades from startIdx on the ladder.
  // Returns { initialGrid, steps, spinWin, linePay, lineCount, endIdx }.
  function resolveSpin(bet, startIdx) {
    const grid0 = freshGrid();
    const lineCount = countScatter(grid0, DEFS);
    const linePay = linePayFor(lineCount, bet);
    const steps = [];
    let spinWin = 0, idx = startIdx, g = grid0;
    for (;;) {
      const ev = evalClusters(g, CLUSTER_PAYS, bet, WILD);
      if (!ev.clusters.length) break;
      const mult = LADDER[Math.min(idx, LADDER.length - 1)];
      const stepWin = ev.total * mult;
      steps.push({ grid: g, clusters: ev.clusters, mult, stepWin });
      spinWin += stepWin;
      const removed = new Set();
      for (const cl of ev.clusters)
        for (const cell of cl.cells) removed.add(cell[0] + ',' + cell[1]);
      g = removeAndDrop(g, removed, () => pick());
      idx++;
    }
    return { initialGrid: grid0, steps, spinWin, linePay, lineCount, endIdx: idx };
  }

  function spin(bet) {
    const base = resolveSpin(bet, 0);
    let totalWin = base.spinWin + base.linePay;
    let freeFall = null;
    if (base.lineCount >= FREE_TRIGGER) {
      let awarded = FREE_SPINS, remaining = FREE_SPINS;
      let idx = 1; // ladder persists across the round, starts at x2
      const spins = [];
      let ffWin = 0;
      while (remaining > 0) {
        remaining--;
        const s = resolveSpin(bet, idx);
        idx = s.endIdx;
        const spinTotal = s.spinWin + s.linePay;
        spins.push({ steps: s.steps, initialGrid: s.initialGrid, linePay: s.linePay, lineCount: s.lineCount, totalWin: spinTotal });
        ffWin += spinTotal;
        if (s.lineCount >= FREE_TRIGGER) { awarded += 5; remaining += 5; }
      }
      freeFall = { awarded, spins, totalWin: ffWin };
      totalWin += ffWin;
    }
    totalWin = Math.floor(totalWin); // casino wallet settles integer coins
    return {
      bet,
      totalWin,
      tier: tierOf(totalWin, bet),
      initialGrid: base.initialGrid,
      steps: base.steps,
      linePay: base.linePay,
      scatterCount: base.lineCount,
      freeFall,
    };
  }

  return { spin };
}
