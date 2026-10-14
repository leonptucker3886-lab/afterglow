/* ═══════════════════════════════════════════════════════════════════════════
 * CIVIL WAR — variable-ways slot engine (slots-v2, Afterglow)
 * ───────────────────────────────────────────────────────────────────────────
 * ORIGINAL game. "Ways" cascade mechanics are a genre technique; all symbols,
 * names, art descriptions, tuning and numbers below are original to this game.
 * No real persons are depicted — portraits are stylized generic figures.
 *
 * PAYTABLE — per-way multiples of TOTAL BET, normalized to 117,649 max ways
 * (see calibration note below). A run of length L on the first L reels pays
 * the sum of the 2..L (or 3..L) entries below — the engine awards each
 * qualifying length inside the run.
 *
 *   symbol              2-of       3-of       4-of       5-of        6-of
 *   ──────────────────────────────────────────────────────────────────────
 *   Cannon WILD       938.72    3520.20   14080.80  46936.00  140808.01
 *   Virginian Cmdr    586.70    2933.50   11734.00  35202.00  117340.01
 *   Union General     469.36    2346.80   9387.20   29335.00  93872.01
 *   Redbeard General  352.02    1760.10   7040.40   23468.00  70404.00
 *   War Drum          —         1173.40   4693.60   14080.80  46936.00
 *   Bugle             —         938.72    3520.20   11734.00  35202.00
 *   Kepi Cap          —         704.04    2933.50   9387.20   29335.00
 *   Rifle             —         586.70    2346.80   7040.40   23468.00
 *   Canteen           —         469.36    1760.10   5867.00   17601.00
 *   A (carved wood)   —         352.02    1408.08   4693.60   14080.80
 *   K (carved wood)   —         293.35    1173.40   3520.20   11734.00
 *   Q (carved wood)   —         234.68    938.72    2933.50   9387.20
 *   J (carved wood)   —         234.68    704.04    2346.80   7040.40
 *   Battle Standard LINE — pays nothing; 4+ anywhere on the initial grid
 *     trigger 12 Link Spins. During Link Spins, 4+ add 5 more (cap 60/round).
 *
 * CALIBRATION NOTE — wins are computed as
 *     coins = pay × bet × ways / 117649
 * so the "6-of" column above is the award for a full 117,649-way screen of
 * that symbol. Typical hits land far below the headline: e.g. a 3-of-a-kind
 * with 2 ways pays 2/117649 of the 3-of value. All pays were tuned as one
 * rigid ratio set, then scaled by a single measured factor to land the
 * 95–97% RTP target (uniform scaling cannot change hit/trigger frequency,
 * cascade behavior, or the base/feature RTP split).
 *
 * ROW DISTRIBUTION (per reel, drawn fresh every spin / every Link spin):
 *   base game: rows 2..7 weighted {2:2, 3:4, 4:6, 5:8, 6:5, 7:3}  (mean 4.68)
 *   Link Spins: rows 2..7 weighted {2:1, 3:2, 4:5, 5:8, 6:7, 7:5} (mean 5.18)
 *   ways = product of the six row counts (max 117,649).
 *
 * REEL STRIP (shared by all six reels, 69 stops, deterministically shuffled
 * with layout seed 20261014 — the layout is fixed, the RNG is per-spin):
 *   virginian x2, union x2, redbeard x3, drum x3, bugle x3, kepi x5,
 *   rifle x5, canteen x5, A x8, K x8, Q x10, J x10, cannon(WILD) x3,
 *   standard(LINE) x2.
 *
 * RULES
 * - 6 reels, left-to-right ways. Cannon WILD substitutes for every symbol
 *   except the Battle Standard LINE.
 * - Cascades: winning cells are removed, symbols drop from above, wins are
 *   re-evaluated until no win remains. New symbols drop in as independent
 *   weighted draws from the same strip mix.
 * - Multiplier: base game starts at x1 and gains +1 per cascade step within
 *   the spin. In Link Spins the multiplier does NOT reset between cascades
 *   and carries across the whole round (+1 per cascade step, uncapped).
 * - 4+ Battle Standard LINE symbols anywhere on the initial grid award 12 Link
 *   Spins (retrigger +5, round capped at 60 spins). Each Link spin re-draws
 *   row counts from the richer distribution.
 * - Volatility: HIGH. RTP target 95–97%. No pity, no boosts — transparent math.
 * - Integer-coin settlement: the spin's totalWin is Math.floor'd exactly once
 *   per spin (the wallet credits whole coins). Step/cascade subtotals keep
 *   fractional coins for display. The floor costs <1 coin per spin on average,
 *   so its RTP impact is about 1/bet — negligible at normal coin bet sizes.
 *
 * SIM RESULTS — [filled after tuning; see bottom of file]
 * ════════════════════════════════════════════════════════════════════════════
 */
import { mulberry32, stopReel, evalWays, waysWinCells, removeAndDrop, countScatter } from './common.js';

// ── Tunables ────────────────────────────────────────────────────────────────
export const REELS = 6;
export const MAX_WAYS = 117649;               // 7^6
export const WILD_ID = 'cannon';
export const LINE_ID = 'standard';
export const ROW_WEIGHTS = { 2: 2, 3: 4, 4: 6, 5: 8, 6: 5, 7: 3 };
export const ROW_WEIGHTS_LINK = { 2: 1, 3: 2, 4: 5, 5: 8, 6: 7, 7: 5 };
export const LINES_TO_TRIGGER = 4;
export const LINK_SPINS_AWARDED = 12;
export const LINK_RETRIGGER = 5;
export const LINK_SPIN_CAP = 60;              // safety cap per round
export const CASCADE_CAP = 100;               // safety cap per spin

// ── Symbol metadata (player-facing names use Lines / Link Spins wording) ───
export const SYMBOL_ORDER = [
  'cannon', 'standard',
  'virginian', 'union', 'redbeard',
  'drum', 'bugle', 'kepi', 'rifle', 'canteen',
  'A', 'K', 'Q', 'J'
];

export const SYMBOLS = {
  cannon: {
    name: 'Cannon WILD', kind: 'wild', wild: true,
    art: 'Iron cannon in side profile, muzzle pointing left, on a wooden field carriage with spoked wheels.',
    pays: { 2: 938.72, 3: 3520.2, 4: 14080.8, 5: 46936, 6: 140808.01 },
    paysText: 'Substitutes for every symbol except the Battle Standard LINE. All-cannon runs pay the table above.'
  },
  standard: {
    name: 'Battle Standard LINE', kind: 'line', scatter: true,
    art: 'Two crossed regimental flags on crossed poles, cloth tattered at the edges, gold fringe.',
    paysText: 'Pays nothing. 4+ Battle Standard LINE symbols anywhere on a spin trigger 12 Link Spins.'
  },
  virginian: {
    name: 'Virginian Commander', kind: 'high',
    art: 'Stylized generic bearded commander in a gray coat and slouch hat. Not a depiction of any real person.',
    pays: { 2: 586.7, 3: 2933.5, 4: 11734, 5: 35202, 6: 117340.01 },
    paysText: 'Per-way total-bet multiples: 2× 586.7 · 3× 2933.5 · 4× 11734 · 5× 35202 · 6× 117340.01 (lengths stack within a run).',
  },
  union: {
    name: 'Union General', kind: 'high',
    art: 'Stylized generic stoic general in a blue frock coat and kepi. Not a depiction of any real person.',
    pays: { 2: 469.36, 3: 2346.8, 4: 9387.2, 5: 29335, 6: 93872.01 },
    paysText: 'Per-way total-bet multiples: 2× 469.36 · 3× 2346.8 · 4× 9387.2 · 5× 29335 · 6× 93872.01 (lengths stack within a run).',
  },
  redbeard: {
    name: 'Redbeard General', kind: 'high',
    art: 'Stylized generic fiery red-bearded general in a dark coat. Not a depiction of any real person.',
    pays: { 2: 352.02, 3: 1760.1, 4: 7040.4, 5: 23468, 6: 70404 },
    paysText: 'Per-way total-bet multiples: 2× 352.02 · 3× 1760.1 · 4× 7040.4 · 5× 23468 · 6× 70404 (lengths stack within a run).',
  },
  drum: {
    name: 'War Drum', kind: 'mid',
    art: 'Snare drum with rope tensioning and crossed drumsticks.',
    pays: { 3: 1173.4, 4: 4693.6, 5: 14080.8, 6: 46936 },
    paysText: 'Per-way total-bet multiples: 3× 1173.4 · 4× 4693.6 · 5× 14080.8 · 6× 46936 (lengths stack within a run).',
  },
  bugle: {
    name: 'Bugle', kind: 'mid',
    art: 'Brass bugle with a red cord and tassels.',
    pays: { 3: 938.72, 4: 3520.2, 5: 11734, 6: 35202 },
    paysText: 'Per-way total-bet multiples: 3× 938.72 · 4× 3520.2 · 5× 11734 · 6× 35202 (lengths stack within a run).',
  },
  kepi: {
    name: 'Kepi Cap', kind: 'mid',
    art: 'Blue kepi cap with a brass badge, side view.',
    pays: { 3: 704.04, 4: 2933.5, 5: 9387.2, 6: 29335 },
    paysText: 'Per-way total-bet multiples: 3× 704.04 · 4× 2933.5 · 5× 9387.2 · 6× 29335 (lengths stack within a run).',
  },
  rifle: {
    name: 'Rifle', kind: 'mid',
    art: 'Musket rifle crossed with a powder horn, diagonal.',
    pays: { 3: 586.7, 4: 2346.8, 5: 7040.4, 6: 23468 },
    paysText: 'Per-way total-bet multiples: 3× 586.7 · 4× 2346.8 · 5× 7040.4 · 6× 23468 (lengths stack within a run).',
  },
  canteen: {
    name: 'Canteen', kind: 'mid',
    art: 'Round wooden canteen with a leather strap and tin cup.',
    pays: { 3: 469.36, 4: 1760.1, 5: 5867, 6: 17601 },
    paysText: 'Per-way total-bet multiples: 3× 469.36 · 4× 1760.1 · 5× 5867 · 6× 17601 (lengths stack within a run).',
  },
  A: {
    name: 'A — Carved Wood', kind: 'low',
    art: 'Letter A carved into an oak plank, wood-grain texture.',
    pays: { 3: 352.02, 4: 1408.08, 5: 4693.6, 6: 14080.8 },
    paysText: 'Per-way total-bet multiples: 3× 352.02 · 4× 1408.08 · 5× 4693.6 · 6× 14080.8 (lengths stack within a run).',
  },
  K: {
    name: 'K — Carved Wood', kind: 'low',
    art: 'Letter K carved into an oak plank, wood-grain texture.',
    pays: { 3: 293.35, 4: 1173.4, 5: 3520.2, 6: 11734 },
    paysText: 'Per-way total-bet multiples: 3× 293.35 · 4× 1173.4 · 5× 3520.2 · 6× 11734 (lengths stack within a run).',
  },
  Q: {
    name: 'Q — Carved Wood', kind: 'low',
    art: 'Letter Q carved into an oak plank, wood-grain texture.',
    pays: { 3: 234.68, 4: 938.72, 5: 2933.5, 6: 9387.2 },
    paysText: 'Per-way total-bet multiples: 3× 234.68 · 4× 938.72 · 5× 2933.5 · 6× 9387.2 (lengths stack within a run).',
  },
  J: {
    name: 'J — Carved Wood', kind: 'low',
    art: 'Letter J carved into an oak plank, wood-grain texture.',
    pays: { 3: 234.68, 4: 704.04, 5: 2346.8, 6: 7040.4 },
    paysText: 'Per-way total-bet multiples: 3× 234.68 · 4× 704.04 · 5× 2346.8 · 6× 7040.4 (lengths stack within a run).',
  }
};

export const META = {
  name: 'Civil War',
  tagline: 'Six shifting ranks, cascading cannon fire, and Link Spins where the multiplier never resets.',
  features: [
    'Variable ways — every reel shows 2–7 rows each spin, up to 117,649 ways to win',
    'Cascading wins: winning symbols are removed and fresh ones drop in',
    'Rising multiplier — +1 for every cascade in the base game',
    '12 Link Spins — the multiplier carries across the entire round, uncapped',
    'Cannon WILD substitutes for every symbol except the Battle Standard',
    '4+ Battle Standard LINE symbols trigger 12 Link Spins'
  ],
  volatility: 'high'
};

// ── Reel strip (shared by all six reels; deterministically shuffled) ────────
const STRIP_COUNTS = [
  ['virginian', 2], ['union', 2], ['redbeard', 3],
  ['drum', 3], ['bugle', 3], ['kepi', 5], ['rifle', 5], ['canteen', 5],
  ['A', 8], ['K', 8], ['Q', 10], ['J', 10],
  ['cannon', 3], ['standard', 2]
];

function buildStrip() {
  var strip = [];
  for (var i = 0; i < STRIP_COUNTS.length; i++)
    for (var n = 0; n < STRIP_COUNTS[i][1]; n++) strip.push(STRIP_COUNTS[i][0]);
  var rnd = mulberry32(20261014); // fixed layout seed — the strip layout is not the RNG
  for (var k = strip.length - 1; k > 0; k--) {
    var j = Math.floor(rnd() * (k + 1));
    var t = strip[k]; strip[k] = strip[j]; strip[j] = t;
  }
  return strip;
}
const STRIP = buildStrip();

function drawRowCount(rnd, weights) {
  var keys = [], total = 0;
  for (var k in weights) { keys.push(+k); total += weights[k]; }
  var x = rnd() * total;
  for (var i = 0; i < keys.length; i++) {
    x -= weights[keys[i]];
    if (x < 0) return keys[i];
  }
  return keys[keys.length - 1];
}

function tierOf(x) {
  if (x <= 0) return 'none';
  if (x < 2) return 'small';
  if (x < 10) return 'medium';
  if (x < 40) return 'big';
  if (x < 150) return 'epic';
  return 'legendary';
}

// ── Game factory ────────────────────────────────────────────────────────────
export function createGame(rng) {
  var master = (typeof rng === 'function') ? rng : mulberry32((Math.random() * 4294967296) >>> 0);
  function nextStream() { return mulberry32(Math.floor(master() * 4294967296)); }

  // One initial grid + its full cascade chain. multState = {mult}, mutated.
  function playWindows(bet, rnd, rowWeights, multState, detail) {
    var rows = [], grid = [], r;
    for (r = 0; r < REELS; r++) rows.push(drawRowCount(rnd, rowWeights));
    for (r = 0; r < REELS; r++) grid.push(stopReel(STRIP, rows[r], rnd));
    // Line symbols are counted on the INITIAL grid only — cascades cannot
    // trigger or retrigger Link Spins. ("4+ anywhere" = anywhere on the spin.)
    var initialLines = countScatter(grid, SYMBOLS);
    // Snapshot of the initial grid (before any cascade removal) for presentation,
    // including dead spins whose steps array is empty. removeAndDrop never
    // mutates its input, but we copy defensively in detail mode anyway.
    var initialGrid = detail ? grid.map(function (col) { return col.slice(); }) : null;
    var steps = detail ? [] : null;
    var spinWin = 0, depth = 0;
    for (;;) {
      var res = evalWays(grid, SYMBOLS, bet, MAX_WAYS, WILD_ID);
      var mult = multState.mult;
      var stepWin = res.total * mult;
      var removed = waysWinCells(grid, res.wins, WILD_ID);
      if (detail && res.wins.length > 0) {
        var cells = [];
        removed.forEach(function (key) {
          var p = key.split(',');
          cells.push([+p[0], +p[1]]);
        });
        cells.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
        steps.push({
          grid: grid.map(function (col) { return col.slice(); }),
          rows: rows.slice(),
          wins: res.wins,
          mult: mult,
          stepWin: stepWin,
          removed: cells
        });
      }
      spinWin += stepWin;
      if (removed.size === 0 || depth >= CASCADE_CAP) break;
      depth++;
      grid = removeAndDrop(grid, removed, function () { return STRIP[(rnd() * STRIP.length) | 0]; });
      multState.mult = mult + 1;
    }
    return { steps: steps, rows: rows, grid: initialGrid, totalWin: spinWin, initialLines: initialLines, cascades: depth };
  }

  // The Link round: multiplier never resets, carries across every spin.
  function playLinkRound(bet, rnd, detail) {
    var multState = { mult: 1 };
    var spins = detail ? [] : null;
    var remaining = LINK_SPINS_AWARDED, played = 0, retriggers = 0, totalWin = 0;
    while (remaining > 0 && played < LINK_SPIN_CAP) {
      remaining--; played++;
      var s = playWindows(bet, rnd, ROW_WEIGHTS_LINK, multState, detail);
      totalWin += s.totalWin;
      var retrig = s.initialLines >= LINES_TO_TRIGGER;
      if (retrig) { remaining += LINK_RETRIGGER; retriggers++; }
      if (detail) spins.push({ steps: s.steps, grid: s.grid, totalWin: s.totalWin, lines: s.initialLines, retrigger: retrig });
    }
    return { awarded: played, spins: spins, multEnd: multState.mult, totalWin: totalWin, retriggers: retriggers };
  }

  function spin(bet, detail) {
    if (detail === undefined) detail = true;
    bet = +bet;
    if (!(bet > 0)) throw new Error('civilwar: bet must be a positive number');
    var rnd = nextStream();
    var baseState = { mult: 1 };
    var base = playWindows(bet, rnd, ROW_WEIGHTS, baseState, detail);
    var link = null;
    var totalWin = base.totalWin;
    if (base.initialLines >= LINES_TO_TRIGGER) {
      link = playLinkRound(bet, rnd, detail);
      totalWin += link.totalWin;
    }
    // Integer-coin settlement: the wallet credits whole coins, so the spin's
    // total is floored EXACTLY ONCE here — never per step, per win, or per
    // cascade. Sub-step detail (steps[].stepWin, freeSpins subtotals) keeps
    // fractional coins for display; only this settled total is floored.
    // Note: the floor costs on average <1 coin per spin, so its RTP impact
    // is ~1/bet — negligible at normal coin bet sizes, significant at bet=1.
    totalWin = Math.floor(totalWin);
    return {
      bet: bet,
      rows: detail ? base.rows : null,
      initialGrid: base.grid,   // initial grid before any cascade removal (null when detail=false)
      totalWin: totalWin,
      tier: tierOf(totalWin / bet),
      steps: detail ? base.steps : null,
      scatterCount: base.initialLines, // internal key (schema); = Battle Standard LINE count
      freeSpins: link                // internal key (schema); = the Link Spins round
    };
  }

  return { spin: spin, META: META, SYMBOLS: SYMBOLS };
}

/* SIM RESULTS — final tuning (2026-10-14)
 * ════════════════════════════════════════════════════════════════════════════
 * Method: 1,000,000 base spins × 4 seeds (1, 7, 42, 1234), Link rounds auto-
 * resolved inside spin(), bet = 100 coins, detail = false. The spin's
 * totalWin is Math.floor'd exactly once per spin (integer-coin settlement);
 * all figures below are the FLOORED, honest numbers. 4,000,000 settled
 * totals checked: 0 non-integer totals.
 *
 *   seed   total RTP   base RTP   link RTP   link share   hit freq   trigger
 *   ──────────────────────────────────────────────────────────────────────────
 *   1      0.9525      0.5822     0.3703     38.9%        58.8%      1 / 246.6
 *   7      0.9535      0.5824     0.3712     38.9%        58.8%      1 / 249.4
 *   42     0.9672      0.5853     0.3819     39.5%        58.8%      1 / 242.3
 *   1234   0.9659      0.5843     0.3816     39.5%        58.8%      1 / 246.4
 *   ──────────────────────────────────────────────────────────────────────────
 *   MEAN   0.9598      0.5835     0.3762     39.2%        58.8%      1 / 246.2
 *
 * Link round detail (per trigger): avg award 92.6× bet over ~12.35 spins
 * (12 base + retriggers; 1,154 retriggers observed over 4M spins); highest
 * carried multiplier seen at round end: ×58 (uncapped by design).
 * Max observed single-spin multiple: 1631× bet. Volatility: HIGH, confirmed.
 *
 * Floor / bet-size note: integer settlement costs on average <1 coin per
 * spin, so realized RTP ≈ continuous RTP − ~1/bet. Measured floored RTP by
 * bet size (200k-spin pilot): bet=1 → 0.79, bet=10 → 0.94, bet=100 → 0.960,
 * bet=1000 → 0.971. The continuous (unfloored) math is exactly bet-invariant
 * (verified: identical multiples at bet 1 vs 100 to 1e-17); only the final
 * integer settlement is bet-size dependent. Reference bet for the table
 * above is 100 coins — at normal coin bet sizes the game holds 95–97%.
 *
 * Tuning history: pays designed as one rigid ratio set, then uniformly
 * scaled by measured RTP (scale factor applied twice: ×11846.19 to reach
 * ~0.96 unfloored, then a ×0.99053 micro-nudge to center the floored mean
 * at 0.96). Uniform scaling cannot change hit/trigger frequency, cascade
 * behavior, or the base/feature split — only the absolute level.
 * ════════════════════════════════════════════════════════════════════════════
 */
