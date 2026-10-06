// Synth Poker engine: Jacks or Better (9/6 full pay). Pure logic, shared with node sims/tests.
// Card c in 0..51: rank = c % 13 (0 = '2' … 12 = 'A'), suit = floor(c / 13).
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUITS = ['♠', '♥', '♣', '♦'];
export const SUIT_NAMES = ['spades', 'hearts', 'clubs', 'diamonds'];
export const rankOf = c => c % 13;
export const suitOf = c => Math.floor(c / 13);
export const isRed = c => suitOf(c) === 1 || suitOf(c) === 3;
export const cardName = c => `${RANKS[rankOf(c)]} of ${SUIT_NAMES[suitOf(c)]}`;

// Paytable, highest first. Payout = bet × pay (stake included).
export const PAYTABLE = [
  { key: 'royal', name: 'Royal Flush', pay: 800 },
  { key: 'sf', name: 'Straight Flush', pay: 50 },
  { key: 'quads', name: 'Four of a Kind', pay: 25 },
  { key: 'fh', name: 'Full House', pay: 9 },
  { key: 'flush', name: 'Flush', pay: 6 },
  { key: 'straight', name: 'Straight', pay: 4 },
  { key: 'trips', name: 'Three of a Kind', pay: 3 },
  { key: 'twopair', name: 'Two Pair', pay: 2 },
  { key: 'jacks', name: 'Jacks or Better', pay: 1 },
];
const BY = Object.fromEntries(PAYTABLE.map(p => [p.key, p]));
const NONE = { key: 'none', name: 'No win', pay: 0 };

// Partial Fisher-Yates: the first n cards of a uniformly shuffled 52-card deck from n floats.
export function drawDeck(floats, n = floats.length) {
  const d = [...Array(52).keys()];
  for (let i = 0; i < n; i++) { const j = i + Math.floor(floats[i] * (52 - i)); [d[i], d[j]] = [d[j], d[i]]; }
  return d.slice(0, n);
}

// Evaluate 5 cards -> { key, name, pay, mask } where mask[i] marks cards that make the hand.
export function evaluate(hand) {
  const rs = hand.map(rankOf), ss = hand.map(suitOf);
  const cnt = new Array(13).fill(0); rs.forEach(r => cnt[r]++);
  const flush = ss.every(s => s === ss[0]);
  const uniq = [...new Set(rs)].sort((a, b) => a - b);
  let straight = false, high = -1;
  if (uniq.length === 5) {
    if (uniq[4] - uniq[0] === 4) { straight = true; high = uniq[4]; }
    else if (uniq.join() === '0,1,2,3,12') { straight = true; high = 3; } // A-2-3-4-5
  }
  const all = [true, true, true, true, true];
  const of = k => rs.map(r => cnt[r] === k);
  const res = (key, mask) => ({ ...BY[key], mask });
  if (straight && flush) return res(high === 12 ? 'royal' : 'sf', all);
  const counts = cnt.filter(Boolean).sort((a, b) => b - a);
  if (counts[0] === 4) return res('quads', of(4));
  if (counts[0] === 3 && counts[1] === 2) return res('fh', all);
  if (flush) return res('flush', all);
  if (straight) return res('straight', all);
  if (counts[0] === 3) return res('trips', of(3));
  if (counts[0] === 2 && counts[1] === 2) return res('twopair', of(2));
  if (counts[0] === 2) {
    const pr = cnt.findIndex(x => x === 2);
    if (pr >= 9) return res('jacks', of(2));
    return { ...NONE, mask: [false, false, false, false, false], lowPair: pr };
  }
  return { ...NONE, mask: [false, false, false, false, false] };
}

// Simple hint strategy -> hold mask.
// 1) any paying hand (hold the cards that make it), 2) 4 to a flush, 3) a low pair, 4) high cards (J, Q, K, A).
export function hint(hand) {
  const e = evaluate(hand);
  if (e.pay > 0) return e.mask.slice();
  const ss = hand.map(suitOf), sc = [0, 0, 0, 0]; ss.forEach(s => sc[s]++);
  const fs = sc.findIndex(x => x === 4);
  if (fs >= 0) return ss.map(s => s === fs);
  if (e.lowPair !== undefined) return hand.map(c => rankOf(c) === e.lowPair);
  return hand.map(c => rankOf(c) >= 9);
}

// Replace non-held cards with the next cards of the deck (deck[5..]).
export function draw(deck, held) {
  let k = 5;
  return deck.slice(0, 5).map((c, i) => (held[i] ? c : deck[k++]));
}
