// Heads or Tails: pure game logic, shared by the page and the node RTP simulation.
export const PAY = 1.96;      // a correct call multiplies the stake (or current chain winnings) by 1.96
export const MAX_FLIPS = 10;  // chain cap per round: 1.96^10 ≈ 836.7×

export const sideOf = f => (f < 0.5 ? 'H' : 'T');          // heads if float < 0.5
export const multAt = k => (k > 0 ? Math.pow(PAY, k) : 1);  // chain multiplier after k correct calls
export const LADDER = Array.from({ length: MAX_FLIPS }, (_, i) => multAt(i + 1));
// Total returned (stake included) when cashing out after k wins; settle() floors it.
export const payoutFor = (bet, k) => Math.floor(bet * multAt(k));
