/* LION-LINK — 5x3 video slot, 243 ways (rebuilt on the shared v2 engine).
 * Lion is the PRIDE WILD: lands on reels 2-4 only and EXPANDS to fill its reel.
 * It substitutes for every symbol except Lock and Sun Coin.
 * 3+ Lock symbols anywhere trigger the DATABASE LOCK hold-and-respin:
 *   every Lock and Sun Coin on screen holds, 3 respins; each new Lock/Coin holds
 *   and resets respins to 3. Locks pay 2x bet each; Coins pay their value.
 *   PRIDE COLUMN: a reel with all 3 cells held doubles every coin on that reel.
 *   Fill all 15 cells for the GRAND (500x bet).
 * Ways pay TOTAL-BET multiples x ways / 243, longest run per symbol only.
 * Pure logic, no DOM. Results come only from the rng passed in.
 */
import { mulberry32, stopReel } from './common.js';

const WILD = 'lion', LOCK = 'lock', COIN = 'sun';
const REELS = 5, ROWS = 3, MAX_WAYS = 243;
const WILD_REELS = [1, 2, 3];

export const SYMBOLS = [
  { id: 'lion', name: 'Pride Wild', wild: true },
  { id: 'lock', name: 'Database Lock', scatter: true },
  { id: 'sun', name: 'Sun Coin', scatter: true },
  { id: 'lioness', name: 'Lioness', pays: { '3': 10, '4': 25, '5': 100 } },
  { id: 'elephant', name: 'Elephant', pays: { '3': 8, '4': 20, '5': 60 } },
  { id: 'zebra', name: 'Zebra', pays: { '3': 6, '4': 15, '5': 40 } },
  { id: 'giraffe', name: 'Giraffe', pays: { '3': 5, '4': 12, '5': 30 } },
  { id: 'A', name: 'Ace', pays: { '3': 3, '4': 6, '5': 15 } },
  { id: 'K', name: 'King', pays: { '3': 3, '4': 5, '5': 12 } },
  { id: 'Q', name: 'Queen', pays: { '3': 2, '4': 4, '5': 10 } },
  { id: 'J', name: 'Jack', pays: { '3': 2, '4': 4, '5': 8 } },
];
export const META = { name: 'Lion-Link', tagline: 'Expanding Pride Wilds and the DATABASE LOCK.' };

export const JACKPOTS = { MINI: 10, MINOR: 25, MAJOR: 100 };
export const GRAND = 500;
const COIN_VALUES = [[0.5, 30], [1, 30], [2, 20], [3, 10], [5, 6], ['MINI', 3], ['MINOR', 0.8], ['MAJOR', 0.2]];
export const SCALE = { pay: 13.5, hit: 0.12 }; // sim: ~95% RTP, ~1/300 trigger

function interleave(weights, seed) {
  const s = []; for (const id in weights) for (let i = 0; i < weights[id]; i++) s.push(id);
  const rnd = mulberry32(seed);
  for (let i = s.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = s[i]; s[i] = s[j]; s[j] = t; }
  return s;
}
const BASEW = { J: 14, Q: 14, K: 12, A: 11, giraffe: 8, zebra: 7, elephant: 5, lioness: 4, lock: 2, sun: 4 };
const OUTER = interleave(BASEW, 4241);
const INNER = interleave({ ...BASEW, lion: 3 }, 9157);
const STRIPS = [OUTER, INNER, INNER, INNER, OUTER];

function pickCoin(rnd) {
  let tot = 0; for (const p of COIN_VALUES) tot += p[1];
  let x = rnd() * tot;
  for (const p of COIN_VALUES) { x -= p[1]; if (x < 0) return p[0]; }
  return 1;
}
export const coinPay = (v, bet) => (typeof v === 'string' ? JACKPOTS[v] : v) * bet;

function evalWays(grid, bet) {
  const wins = []; let total = 0;
  for (const s of SYMBOLS) {
    if (!s.pays) continue;
    let run = 0, ways = 1;
    for (let r = 0; r < REELS; r++) {
      const n = grid[r].filter(x => x === s.id || x === WILD).length;
      if (!n) break; run++; ways *= n;
    }
    const m = s.pays[String(run)];
    if (run >= 3 && m) {
      const coins = m * SCALE.pay * bet * ways / MAX_WAYS;
      const cells = [];
      for (let r = 0; r < run; r++) for (let c = 0; c < ROWS; c++)
        if (grid[r][c] === s.id || grid[r][c] === WILD) cells.push([r, c]);
      wins.push({ symbol: s.id, count: run, ways, coins, cells });
      total += coins;
    }
  }
  return { wins, total };
}
function tierOf(win, bet) { if (win <= 0) return 'none'; const m = win / bet; return m < 15 ? 'small' : m < 50 ? 'big' : 'mega'; }

export function createGame(rng) {
  const rnd = typeof rng === 'function' ? rng : mulberry32(Date.now() >>> 0);
  function spin(bet) {
    const grid = STRIPS.map(s => stopReel(s, ROWS, rnd));
    const coins = {};
    for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) if (grid[r][c] === COIN) coins[r + ',' + c] = pickCoin(rnd);
    const expandedReels = WILD_REELS.filter(r => grid[r].includes(WILD));
    const shown = grid.map((col, r) => expandedReels.includes(r) ? [WILD, WILD, WILD] : col.slice());
    const ev = evalWays(shown, bet);
    let totalWin = ev.total;
    const lockCount = grid.flat().filter(x => x === LOCK).length;
    let bonus = null;
    if (lockCount >= 3) {
      const held = {};
      for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) {
        const s = grid[r][c], k = r + ',' + c;
        if (s === LOCK) held[k] = { sym: LOCK };
        if (s === COIN) held[k] = { sym: COIN, value: coins[k] };
      }
      const start = Object.assign({}, held);
      const steps = []; let left = 3;
      while (left > 0 && Object.keys(held).length < REELS * ROWS) {
        left--; const added = [];
        for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) {
          const k = r + ',' + c; if (held[k]) continue;
          if (rnd() < SCALE.hit) { held[k] = rnd() < 0.3 ? { sym: LOCK } : { sym: COIN, value: pickCoin(rnd) }; added.push([r, c, held[k]]); }
        }
        if (added.length) left = 3;
        steps.push({ added, left });
      }
      const prideReels = [];
      for (let r = 0; r < REELS; r++) if (held[r + ',0'] && held[r + ',1'] && held[r + ',2']) prideReels.push(r);
      let bw = 0;
      for (const k in held) {
        const h = held[k], r = +k.split(',')[0];
        bw += h.sym === LOCK ? 2 * bet : coinPay(h.value, bet) * (prideReels.includes(r) ? 2 : 1);
      }
      const grand = Object.keys(held).length === REELS * ROWS;
      if (grand) bw += GRAND * bet;
      bonus = { start, held, steps, prideReels, grand, totalWin: bw };
      totalWin += bw;
    }
    totalWin = Math.floor(totalWin);
    return { bet, totalWin, tier: tierOf(totalWin, bet), grid, shown, coins, expandedReels, lineWins: ev.wins, lockCount, bonus };
  }
  return { spin };
}
