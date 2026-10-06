// Persistent player state: wallet, XP/levels, stats, achievements, settings.
const KEY = 'afterglow:v1';
export const START_COINS = 10000;

const fresh = () => ({
  v: 1, created: Date.now(), name: 'Player', ageOk: false,
  coins: START_COINS, xp: 0, level: 1,
  daily: { last: 0, streak: 0 }, drop: { last: 0 }, refuel: { last: 0 },
  stats: { wagered: 0, won: 0, rounds: 0, wins: 0, biggestWin: 0, biggestMult: 0, byGame: {} },
  ach: {}, bets: {},
  settings: { sound: true, haptics: true, reduced: false, reminder: 60 },
  history: [],
});

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) {
      const f = fresh();
      return { ...f, ...s, stats: { ...f.stats, ...s.stats }, settings: { ...f.settings, ...s.settings }, daily: { ...f.daily, ...s.daily }, drop: { ...f.drop, ...s.drop }, refuel: { ...f.refuel, ...s.refuel } };
    }
  } catch (e) {}
  return fresh();
}

export const state = load();
const subs = {};
export const on = (ev, fn) => ((subs[ev] ||= []).push(fn), () => (subs[ev] = subs[ev].filter(f => f !== fn)));
export const emit = (ev, d) => (subs[ev] || []).forEach(f => f(d));

let t;
export function save() {
  clearTimeout(t);
  t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 50);
  emit('change', state);
}
addEventListener('pagehide', () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} });
addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  try { Object.assign(state, JSON.parse(e.newValue)); emit('change', state); emit('coins', { delta: 0 }); } catch (err) {}
});

export function resetAll() { localStorage.removeItem(KEY); Object.assign(state, fresh(), { ageOk: true }); save(); emit('coins', { delta: 0 }); }

/* ---------- wallet ---------- */
export const canAfford = n => Number.isFinite(n) && n > 0 && state.coins >= n;
export function debit(n, why = 'bet') {
  n = Math.floor(n);
  if (!canAfford(n)) return false;
  state.coins -= n; save(); emit('coins', { delta: -n, why });
  return true;
}
export function credit(n, why = 'win') {
  n = Math.floor(n);
  if (!(n > 0)) return 0;
  state.coins += n; save(); emit('coins', { delta: n, why });
  return n;
}

/* ---------- levels ---------- */
export const TIERS = [
  [1, 'Spark', '#a0a2c2'], [5, 'Glow', '#22f0ff'], [10, 'Neon', '#b8ff3b'], [20, 'Plasma', '#ff3dc8'],
  [35, 'Nova', '#ffd84d'], [50, 'Supernova', '#ff8a3d'], [75, 'Quasar', '#8b5cff'],
];
export const tierOf = lvl => TIERS.reduce((a, t) => (lvl >= t[0] ? t : a), TIERS[0]);
export const xpFor = lvl => Math.round(250 * Math.pow(lvl, 1.45));
export const levelReward = lvl => 1000 + lvl * 500;

export function addXp(n) {
  state.xp += Math.max(0, Math.round(n));
  let leveled = 0;
  while (state.xp >= xpFor(state.level)) {
    state.xp -= xpFor(state.level); state.level++; leveled++;
    const r = levelReward(state.level);
    state.coins += r; emit('coins', { delta: r, why: 'level' });
    emit('level', { level: state.level, reward: r, tier: tierOf(state.level) });
  }
  [5, 10, 25, 50].forEach(l => state.level >= l && unlock('lvl' + l));
  save();
  return leveled;
}

/* ---------- achievements ---------- */
export const ACH = {
  first:   ['First light', 'Play your first round', 500],
  win1:    ['Lit up', 'Win your first round', 500],
  x10:     ['Bright idea', 'Land a 10× win', 2000],
  x100:    ['Supernova', 'Land a 100× win', 10000],
  x1000:   ['Event horizon', 'Land a 1,000× win', 50000],
  all:     ['Grand tour', 'Play every live game', 5000],
  r100:    ['Night owl', 'Play 100 rounds', 3000],
  r1000:   ['Afterhours', 'Play 1,000 rounds', 20000],
  w1m:     ['High roller', 'Wager 1,000,000 Glow total', 25000],
  streak7: ['Seven nights', 'Claim the daily wheel 7 days in a row', 10000],
  lvl5:    ['Glow tier', 'Reach level 5', 0],
  lvl10:   ['Neon tier', 'Reach level 10', 0],
  lvl25:   ['Plasma tier', 'Reach level 25', 0],
  lvl50:   ['Supernova tier', 'Reach level 50', 0],
  bj:      ['Natural', 'Get a blackjack', 1500],
  mines:   ['Minesweeper', 'Clear 10 safe tiles in one Mines round', 3000],
  liftoff: ['Escape velocity', 'Cash out above 10× on Liftoff', 3000],
  fs:      ['Wormhole', 'Trigger free spins on Nebula Nights', 2000],
  rlt:     ['Zero hero', 'Win a straight-up bet on 0 in Roulette', 3000],
  plinko:  ['Edge case', 'Hit an edge slot in Plinko', 3000],
  pig:     ['Punt that pig', 'Trigger free spins on Sun N Fun', 2000],
};
export function unlock(id) {
  if (state.ach[id] || !ACH[id]) return false;
  state.ach[id] = Date.now();
  const r = ACH[id][2];
  if (r) { state.coins += r; emit('coins', { delta: r, why: 'achievement' }); }
  save(); emit('achievement', { id, name: ACH[id][0], desc: ACH[id][1], reward: r });
  return true;
}

/* ---------- per-game remembered bet ---------- */
export const lastBet = (game, d = 100) => state.bets[game] ?? d;
export const setLastBet = (game, n) => { state.bets[game] = n; save(); };

export const fmt = n => {
  n = Math.floor(n); const a = Math.abs(n);
  if (a < 1e4) return n.toLocaleString('en-US');
  if (a < 1e6) return +(n / 1e3).toFixed(a < 1e5 ? 2 : 1) + 'K';
  if (a < 1e9) return +(n / 1e6).toFixed(2) + 'M';
  return +(n / 1e9).toFixed(2) + 'B';
};
export const fmtFull = n => Math.floor(n).toLocaleString('en-US');
export const fmtX = m => (m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2)) + '×';
