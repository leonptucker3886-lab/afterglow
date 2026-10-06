// Velvet Baccarat: pure Punto Banco logic (infinite-deck approximation of an 8-deck shoe).
// Shared by the game page and the node simulation.
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♣', '♦'];
export const PAY = { P: 2, B: 1.95, T: 9 }; // total returned per unit staked (stake included)

// A float in [0,1) -> card. Rank = floor(f*13). Suit is cosmetic only (derived from the same float).
export const card = f => ({ r: Math.floor(f * 13), s: Math.floor(f * 52) % 4 });
export const val = c => (c.r < 9 ? c.r + 1 : 0);
export const total = cards => cards.reduce((a, c) => a + val(c), 0) % 10;
export const isRed = c => c.s === 1 || c.s === 3;

// Banker's third-card tableau when the Player drew a third card worth v.
export function bankerDraws(bt, v) {
  if (v === null) return bt <= 5;
  if (bt <= 2) return true;
  if (bt === 3) return v !== 8;
  if (bt === 4) return v >= 2 && v <= 7;
  if (bt === 5) return v >= 4 && v <= 7;
  if (bt === 6) return v === 6 || v === 7;
  return false;
}

// Plays one coup from 6 floats. Deal order: P, B, P, B, then third cards from the remaining floats in order.
// Returns { p, b, pt, bt, natural, win: 'P'|'B'|'T', order } where order lists the deal sequence [['P',i],...].
export function play(fl) {
  let k = 0; const next = () => card(fl[k++]);
  const p = [next()], b = [next()]; p.push(next()); b.push(next());
  const order = [['P', 0], ['B', 0], ['P', 1], ['B', 1]];
  let pt = total(p), bt = total(b);
  const natural = pt >= 8 || bt >= 8;
  if (!natural) {
    let v = null;
    if (pt <= 5) { const c = next(); p.push(c); v = val(c); order.push(['P', 2]); pt = total(p); }
    if (bankerDraws(bt, v)) { b.push(next()); order.push(['B', 2]); bt = total(b); }
  }
  return { p, b, pt, bt, natural, win: pt > bt ? 'P' : bt > pt ? 'B' : 'T', order };
}

// Total payout for a bet map {P,B,T} given the winner. Ties push Player/Banker bets.
export function payout(bets, win) {
  const P = bets.P || 0, B = bets.B || 0, T = bets.T || 0;
  if (win === 'T') return T * PAY.T + P + B;
  if (win === 'P') return P * PAY.P;
  return B * PAY.B;
}
