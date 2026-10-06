// Round lifecycle: debit -> fair stream -> settle (credit, stats, XP, history, achievements).
import { state, save, emit, debit, credit, addXp, unlock } from './store.js';
import { stream } from './fair.js';
import { GAMES } from './games.js';

export class Round {
  constructor(game, bet, s) {
    Object.assign(this, { game, bet, total: bet, s, done: false, started: Date.now() });
  }
  get nonce() { return this.s.nonce; }
  floats(n) { return this.s.floats(n); }
  float() { return this.s.float(); }
  // Extra stake mid-round (double down, split, insurance). Returns false if unaffordable.
  addBet(n) {
    if (this.done || !debit(n, 'bet')) return false;
    this.total += n; state.stats.wagered += n; gameStat(this.game).wagered += n; save();
    return true;
  }
  settle(payout = 0, { mult, detail = '', quiet = false } = {}) {
    if (this.done) return null;
    this.done = true;
    payout = Math.max(0, Math.floor(payout));
    const m = mult ?? (this.total ? payout / this.total : 0);
    if (payout) credit(payout, 'win');
    const st = state.stats, g = gameStat(this.game);
    st.rounds++; g.rounds++;
    st.won += payout; g.won += payout;
    if (payout > this.total) { st.wins++; g.wins++; }
    if (payout - this.total > st.biggestWin) st.biggestWin = payout - this.total;
    if (payout > 0 && m > st.biggestMult) st.biggestMult = m;
    if (m > (g.best || 0)) g.best = m;
    state.history.unshift({ t: Date.now(), game: this.game, bet: this.total, payout, mult: +m.toFixed(4), nonce: this.s.nonce, hash: this.s.hash, client: this.s.client, detail: String(detail).slice(0, 120) });
    state.history.length = Math.min(state.history.length, 150);
    save();
    addXp(Math.max(1, this.total / 10));
    unlock('first');
    if (payout > this.total) unlock('win1');
    if (payout > 0 && m >= 10) unlock('x10');
    if (payout > 0 && m >= 100) unlock('x100');
    if (payout > 0 && m >= 1000) unlock('x1000');
    if (st.rounds >= 100) unlock('r100');
    if (st.rounds >= 1000) unlock('r1000');
    if (st.wagered >= 1e6) unlock('w1m');
    if (GAMES.filter(x => x.live).every(x => state.stats.byGame[x.id]?.rounds)) unlock('all');
    const res = { game: this.game, bet: this.total, payout, profit: payout - this.total, mult: m, quiet };
    emit('round', res);
    return res;
  }
}

function gameStat(id) { return (state.stats.byGame[id] ||= { rounds: 0, wagered: 0, won: 0, wins: 0, best: 0 }); }

// Starts a round. Returns null (and emits 'broke') if the bet can't be covered.
export async function startRound(game, bet) {
  bet = Math.floor(bet);
  if (!(bet > 0) || !debit(bet, 'bet')) { emit('broke', { game, bet }); return null; }
  state.stats.wagered += bet; gameStat(game).wagered += bet; save();
  return new Round(game, bet, await stream());
}
