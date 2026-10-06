// Constellation Keno: pure game logic (shared by the page and the node RTP simulation).
export const N = 40, DRAW = 10, MAX_PICKS = 10;

// PAYS[picks][hits] = total return multiple (stake included). Exact RTP per pick count is 96-98%.
export const PAYS = {
  1:  [0, 3.9],
  2:  [0, 1.5, 6.8],
  3:  [0, 0.5, 2.5, 34],
  4:  [0, 0.5, 1.5, 6, 80],
  5:  [0, 0, 1.5, 3.6, 20, 200],
  6:  [0, 0, 1, 2.3, 10, 50, 500],
  7:  [0, 0, 0.5, 1.8, 6, 25, 150, 700],
  8:  [0, 0, 0.5, 1.4, 3.5, 12, 50, 250, 800],
  9:  [0, 0, 0.4, 1, 2.3, 8, 30, 150, 500, 900],
  10: [0, 0, 0, 1, 2, 5, 18, 80, 300, 600, 1000],
};

// Partial Fisher-Yates over 1..40 using exactly 10 fair floats. Returns the 10 drawn numbers in draw order.
export function drawFrom(floats) {
  const a = Array.from({ length: N }, (_, i) => i + 1);
  for (let i = 0; i < DRAW; i++) {
    const j = i + Math.floor(floats[i] * (N - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, DRAW);
}

export const countHits = (picks, drawn) => { const s = new Set(picks); return drawn.reduce((n, d) => n + s.has(d), 0); };
export const multFor = (k, hits) => (PAYS[k] ? PAYS[k][hits] || 0 : 0);
export const payoutFor = (bet, picks, drawn) => bet * multFor(picks.length, countHits(picks, drawn));

// Exact hypergeometric probability of `h` hits with `k` picks.
const C = (n, r) => { if (r < 0 || r > n) return 0; let x = 1; for (let i = 0; i < r; i++) x = (x * (n - i)) / (i + 1); return x; };
export const probHits = (k, h) => (C(k, h) * C(N - k, DRAW - h)) / C(N, DRAW);
export const exactRtp = k => PAYS[k].reduce((s, m, h) => s + m * probHits(k, h), 0);
