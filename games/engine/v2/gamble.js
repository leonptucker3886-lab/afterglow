/* DOUBLE-UP GAMBLE — shared post-win helper for the v2 line slots.
 * A fair 50/50 red/black coin flip: flip() returns true = win (amount doubles),
 * false = lose (amount forfeited). EV-neutral and RTP-neutral by construction —
 * every gamble round returns exactly the staked amount in expectation.
 * Presentation owns the UI and the caps (max 5 consecutive gambles,
 * max win 1000x bet); this module only flips the coin.
 *
 * SANITY: 100,000 flips (seed 7) -> 50,012 true (50.01%).
 */
import { mulberry32 } from './common.js';

export const META = {
  id: 'gamble',
  name: 'Double-Up',
  tagline: 'Red or black. Double or nothing.',
  volatility: 'n/a',
  targetRTP: 1.0,
  features: ['Fair 50/50 flip', 'UI caps live in the presentation layer'],
};

export function createGamble(rng) {
  const rnd = (typeof rng === 'function') ? rng : mulberry32(Date.now() >>> 0);
  return {
    // true = player wins the gamble (win doubles), false = player loses it.
    flip: () => rnd() < 0.5,
  };
}
