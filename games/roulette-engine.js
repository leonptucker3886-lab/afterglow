// Orbit Roulette: pure game logic (shared by the page and the node RTP simulation).
export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const MAX_TOTAL = 1_000_000;
export const colorOf = n => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');

// Every bet spot: key -> { pays (total return multiple, stake included), wins(n) }
const range = (a, b) => n => n >= a && n <= b;
export const BETS = {
  red:   { pays: 2, label: 'Red',   wins: n => REDS.has(n) },
  black: { pays: 2, label: 'Black', wins: n => n > 0 && !REDS.has(n) },
  odd:   { pays: 2, label: 'Odd',   wins: n => n > 0 && n % 2 === 1 },
  even:  { pays: 2, label: 'Even',  wins: n => n > 0 && n % 2 === 0 },
  low:   { pays: 2, label: '1-18',  wins: range(1, 18) },
  high:  { pays: 2, label: '19-36', wins: range(19, 36) },
  d1:    { pays: 3, label: '1st 12', wins: range(1, 12) },
  d2:    { pays: 3, label: '2nd 12', wins: range(13, 24) },
  d3:    { pays: 3, label: '3rd 12', wins: range(25, 36) },
  c1:    { pays: 3, label: '2:1', wins: n => n > 0 && n % 3 === 1 },
  c2:    { pays: 3, label: '2:1', wins: n => n > 0 && n % 3 === 2 },
  c3:    { pays: 3, label: '2:1', wins: n => n > 0 && n % 3 === 0 },
};
for (let i = 0; i <= 36; i++) BETS['n' + i] = { pays: 36, label: String(i), wins: n => n === i };

// Outcome from one fair float in [0,1)
export const spinFrom = f => Math.floor(f * 37);

// bets: { key: stake }. Returns total payout (stake included) for result n.
export function payoutFor(bets, n) {
  let p = 0;
  for (const k in bets) if (bets[k] > 0 && BETS[k].wins(n)) p += bets[k] * BETS[k].pays;
  return p;
}
export const totalOf = bets => Object.values(bets).reduce((a, b) => a + b, 0);
export const winningKeys = n => Object.keys(BETS).filter(k => BETS[k].wins(n));
