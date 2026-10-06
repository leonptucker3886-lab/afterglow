// Hyperdrive Hi-Lo: pure game logic (shared by the browser game and the node simulation).
// Infinite deck: every card is independent and comes from one fair float.
export const EDGE = 0.97, CAP = 10000, MAX_SKIPS = 3, ACH_CHAIN = 8;
export const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♣', '♦'];
export const SUIT_NAMES = ['spades', 'hearts', 'clubs', 'diamonds'];

// rank = floor(f*13)+1 (A=1 … K=13). floor(floor(52f)/4) === floor(13f), so the suit is the
// cosmetic low part of the same float.
export function cardOf(f) {
  const i = Math.min(51, Math.max(0, Math.floor(f * 52)));
  return { r: (i >> 2) + 1, s: i & 3 };
}
export const isRed = c => c.s === 1 || c.s === 3;
export const label = c => RANKS[c.r] + SUITS[c.s];

// 'hi' = Higher or Same (next >= cur), 'lo' = Lower or Same (next <= cur)
export const pWin = (dir, r) => (dir === 'hi' ? (14 - r) / 13 : r / 13);
export const multFor = (dir, r) => EDGE / pWin(dir, r);
// A sure thing (P = 1, mult 0.97×) is pointless, so it's disabled: Higher on A, Lower on K.
export const canCall = (dir, r) => pWin(dir, r) < 1;
export const wins = (dir, cur, next) => (dir === 'hi' ? next.r >= cur.r : next.r <= cur.r);
