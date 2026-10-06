// Free Glow: daily wheel (with streak), Orbit Drop every 3h, refuel when nearly broke.
import { state, save, credit, unlock } from './store.js';

const day = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
export const WHEEL = [1000, 5000, 1500, 2500, 25000, 2000, 10000, 1200];
const WEIGHTS = [22, 8, 20, 14, 1, 18, 3, 14];
export const DROP_MS = 3 * 3600e3, REFUEL_MS = 10 * 60e3, REFUEL_UNDER = 1000, REFUEL_AMT = 5000;

export const dailyReady = () => day(state.daily.last) !== day(Date.now());
export function nextStreak() {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return day(state.daily.last) === day(y.getTime()) ? state.daily.streak + 1 : 1;
}
export const streakMult = s => +(1 + 0.15 * (Math.min(s, 7) - 1)).toFixed(2);
export function msToMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); return m - n; }

export function spinDaily() {
  if (!dailyReady()) return null;
  const tot = WEIGHTS.reduce((a, b) => a + b); let x = (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * tot, i = 0;
  while ((x -= WEIGHTS[i]) >= 0) i++;
  const streak = nextStreak(), mult = streakMult(streak), amount = Math.round(WHEEL[i] * mult);
  state.daily = { last: Date.now(), streak }; save();
  return { index: i, base: WHEEL[i], amount, streak, mult, pay: () => { credit(amount, 'daily'); if (streak >= 7) unlock('streak7'); } };
}

export const dropAmount = () => 500 + 100 * state.level;
export const dropIn = () => Math.max(0, state.drop.last + DROP_MS - Date.now());
export const dropReady = () => dropIn() === 0;
export function claimDrop() { if (!dropReady()) return 0; state.drop.last = Date.now(); save(); return credit(dropAmount(), 'drop'); }

export const refuelIn = () => Math.max(0, state.refuel.last + REFUEL_MS - Date.now());
export const refuelReady = () => state.coins < REFUEL_UNDER && refuelIn() === 0;
export function claimRefuel() { if (!refuelReady()) return 0; state.refuel.last = Date.now(); save(); return credit(REFUEL_AMT, 'refuel'); }

export const clock = ms => { const s = Math.ceil(ms / 1000), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60; return (hh ? hh + ':' : '') + String(mm).padStart(hh ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0'); };
