// Neon 21: pure blackjack logic, shared by the page (games/blackjack.js) and the node RTP simulation.
// Rules: 6 decks shuffled every hand, dealer stands on all 17s, blackjack pays 3:2, dealer peeks with A/10 up,
// no insurance, double on any first two cards, split once (2 hands), split aces get one card each,
// double after split allowed, 21 after a split is not a blackjack.
export const DECKS = 6, SHOE = 52 * DECKS;
export const freshShoe = () => [...Array(SHOE).keys()];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♣', '♦'];
export const rankOf = c => c % 13;                       // 0 = A, 9..12 = 10 J Q K
export const suitOf = c => Math.floor(c / 13) % 4;
export const isRed = c => suitOf(c) % 2 === 1;           // ♥ ♦
export const val = c => { const r = c % 13; return r === 0 ? 11 : r >= 9 ? 10 : r + 1; };

export function score(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { const v = val(c); t += v; if (v === 11) aces++; }
  while (t > 21 && aces) { t -= 10; aces--; }
  return { t, soft: aces > 0 };
}
// "7 / 17" for soft hands, "17" otherwise.
export function label(cards) { const { t, soft } = score(cards); return soft && t < 21 ? `${t - 10} / ${t}` : String(t); }

const mkHand = (cards, bet, split = false, aces = false) => ({ cards, bet, split, splitAces: aces, doubled: false, done: false });

export class Game {
  constructor(shoe, bet) { Object.assign(this, { shoe, i: 0, bet, dealer: [], hands: [], active: 0, phase: 'idle', dealerBJ: false, playerBJ: false }); }
  draw() { return this.shoe[this.i++]; }
  // Deal order: player, dealer (up), player, dealer (hole).
  deal() {
    const p = [], d = [];
    p.push(this.draw()); d.push(this.draw()); p.push(this.draw()); d.push(this.draw());
    this.dealer = d; this.hands = [mkHand(p, this.bet)]; this.active = 0;
    this.peeks = val(d[0]) >= 10;                        // Ace or 10-value showing
    this.dealerBJ = score(d).t === 21;                   // only possible when peeking
    this.playerBJ = score(p).t === 21;
    if (this.dealerBJ || this.playerBJ) { this.hands[0].done = true; this.phase = 'over'; }
    else this.phase = 'play';
    return { p, d };
  }
  get hand() { return this.hands[this.active]; }
  get playing() { return this.phase === 'play' && this.hand && !this.hand.done; }
  canHit() { return this.playing && this.hand.cards.length >= 2; }
  canStand() { return this.canHit(); }
  canDouble() { const h = this.hand; return this.canHit() && h.cards.length === 2 && !h.splitAces; }
  canSplit() { const h = this.hand; return this.canHit() && this.hands.length === 1 && h.cards.length === 2 && val(h.cards[0]) === val(h.cards[1]); }
  needsCard() { return this.phase === 'play' && this.hand && !this.hand.done && this.hand.cards.length === 1; }

  hit() { const h = this.hand, c = this.draw(); h.cards.push(c); if (score(h.cards).t >= 21) h.done = true; return c; }
  stand() { this.hand.done = true; }
  double() { const h = this.hand; h.bet *= 2; h.doubled = true; const c = this.hit(); h.done = true; return c; }
  split() {
    const [a, b] = this.hand.cards, aces = rankOf(a) === 0;
    this.hands = [mkHand([a], this.bet, true, aces), mkHand([b], this.bet, true, aces)];
    this.active = 0;
  }
  // Second card for a freshly split hand. Split aces stop at two cards.
  fill() { const h = this.hand, c = this.draw(); h.cards.push(c); if (h.splitAces || score(h.cards).t >= 21) h.done = true; return c; }
  // Move past finished hands. Returns true while a player hand still needs input/cards.
  next() {
    while (this.active < this.hands.length && this.hands[this.active].done) this.active++;
    if (this.active < this.hands.length) return true;
    this.active = this.hands.length - 1; this.phase = 'dealer';
    return false;
  }
  anyLive() { return this.hands.some(h => score(h.cards).t <= 21); }
  dealerMustDraw() { return this.phase === 'dealer' && this.anyLive() && score(this.dealer).t < 17; }
  dealerHit() { const c = this.draw(); this.dealer.push(c); return c; }

  // Per-hand results and the TOTAL payout (stake included).
  results() {
    const d = score(this.dealer).t, out = [];
    if (this.dealerBJ || this.playerBJ) {
      const h = this.hands[0];
      const r = this.dealerBJ && this.playerBJ ? ['push', h.bet] : this.dealerBJ ? ['lose', 0] : ['bj', h.bet * 2.5];
      out.push({ res: r[0], pay: r[1], bet: h.bet, t: score(h.cards).t });
    } else {
      for (const h of this.hands) {
        const t = score(h.cards).t;
        const r = t > 21 ? ['bust', 0] : d > 21 || t > d ? ['win', h.bet * 2] : t === d ? ['push', h.bet] : ['lose', 0];
        out.push({ res: r[0], pay: r[1], bet: h.bet, t });
      }
    }
    this.phase = 'over';
    return { hands: out, dealer: d, payout: out.reduce((a, x) => a + x.pay, 0), staked: out.reduce((a, x) => a + x.bet, 0) };
  }
}

// Basic strategy for 6 decks, S17, DAS, no surrender, dealer peeks. Returns 'H' | 'S' | 'D' | 'P'.
export function basic(cards, up, { dbl = true, split = true } = {}) {
  const u = val(up), { t, soft } = score(cards);
  const D = alt => (dbl ? 'D' : alt);
  if (split && cards.length === 2 && val(cards[0]) === val(cards[1])) {
    const v = val(cards[0]);
    if (v === 11 || v === 8) return 'P';
    if (v === 9 && u !== 7 && u <= 9) return 'P';
    if ((v === 7 || v === 2 || v === 3) && u <= 7) return 'P';
    if (v === 6 && u <= 6) return 'P';
    if (v === 4 && (u === 5 || u === 6)) return 'P';
  }
  if (soft) {
    if (t >= 19) return 'S';
    if (t === 18) return u >= 3 && u <= 6 ? D('S') : u <= 8 ? 'S' : 'H';
    if (t === 17) return u >= 3 && u <= 6 ? D('H') : 'H';
    if (t === 15 || t === 16) return u >= 4 && u <= 6 ? D('H') : 'H';
    if (t === 13 || t === 14) return u >= 5 && u <= 6 ? D('H') : 'H';
    return 'H';
  }
  if (t >= 17) return 'S';
  if (t >= 13) return u <= 6 ? 'S' : 'H';
  if (t === 12) return u >= 4 && u <= 6 ? 'S' : 'H';
  if (t === 11) return u <= 10 ? D('H') : 'H';
  if (t === 10) return u <= 9 ? D('H') : 'H';
  if (t === 9) return u >= 3 && u <= 6 ? D('H') : 'H';
  return 'H';
}

// Auto-play one full hand with a strategy (used by the simulation).
export function autoPlay(shoe, bet, strat = basic) {
  const g = new Game(shoe, bet);
  g.deal();
  while (g.phase === 'play') {
    if (g.needsCard()) g.fill();
    if (!g.next()) break;
    if (g.needsCard()) continue;
    const a = strat(g.hand.cards, g.dealer[0], { dbl: g.canDouble(), split: g.canSplit() });
    if (a === 'P' && g.canSplit()) g.split();
    else if (a === 'D' && g.canDouble()) g.double();
    else if (a === 'S') g.stand();
    else g.hit();
  }
  while (g.dealerMustDraw()) g.dealerHit();
  return g.results();
}
