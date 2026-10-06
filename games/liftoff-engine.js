// Liftoff: pure crash-game math, shared by the browser game and the node RTP simulation.
// All multipliers are handled as integer hundredths ("c") so payouts never suffer float drift.
export const K = 0.00012;            // growth rate per ms: m(t) = e^(K·t)
export const MAX_C = 1_000_000;      // 10,000.00× cap
export const MIN_AUTO_C = 101;       // auto cash-out must be at least 1.01×

// Fair float f in [0,1) -> crash point in hundredths. P(crash >= x) = 0.99 / x.
export const crashC = f => Math.min(MAX_C, Math.max(100, Math.floor(99 / (1 - f))));
export const multAt = t => Math.exp(K * Math.max(0, t));      // live multiplier at t ms
export const timeFor = m => Math.log(Math.max(1, m)) / K;      // ms needed to reach multiplier m
export const floorC = m => Math.floor(m * 100 + 1e-9);         // multiplier -> hundredths, floored
export const payoutFor = (bet, c) => Math.floor((bet * c) / 100);

// Parses the auto cash-out field. Returns hundredths or 0 (off).
export function parseAuto(v) {
  const n = parseFloat(String(v).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_C, Math.max(MIN_AUTO_C, Math.floor(n * 100 + 1e-9)));
}

// Resolves a player action at elapsed time t (ms) for a round with crash cC and auto aC (0 = off).
// Returns the cash-out multiplier in hundredths, or 0 for a loss.
export function resolveCash(t, cC, aC) {
  const crashT = timeFor(cC / 100);
  if (aC && aC <= cC && t >= timeFor(aC / 100)) return aC;   // auto fired first, exact payout
  if (t >= crashT) return 0;                                  // too late: crashed
  return Math.min(cC, Math.max(100, floorC(multAt(t))));
}
