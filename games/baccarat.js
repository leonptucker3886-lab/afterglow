import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmt, fmtFull, fmtX, unlock, sleep, toast, state } from '/core/ag.js';
import { play, payout, total, RANKS, SUITS, isRed, PAY } from '/games/baccarat-engine.js';

boot({ nav: 'games' });
gameHeader($('#panel'), { title: 'Velvet Baccarat', rules: `<p>Punto Banco. Bet on the <b>Player</b> hand, the <b>Banker</b> hand, the <b>Tie</b>, or any mix. Pick a chip value, tap the betting areas to stack chips, then deal.</p>
<ul style="padding-left:18px"><li>Cards: A = 1, 2 to 9 face value, 10 J Q K = 0. A hand's total is the last digit of its sum.</li>
<li>Two cards each. An 8 or 9 is a <b>natural</b> and ends the coup.</li>
<li>Player draws a third card on 0 to 5 and stands on 6 or 7.</li>
<li>If Player stood, Banker draws on 0 to 5. Otherwise Banker follows the standard tableau: 0 to 2 draws; 3 draws unless Player's third card is 8; 4 draws on 2 to 7; 5 draws on 4 to 7; 6 draws on 6 or 7; 7 stands.</li></ul>
<p>Payouts: Player 1:1, Banker 0.95:1 (5% commission), Tie 8:1. On a tie, Player and Banker bets are returned.</p>
<p>8-deck shoe dealt as an infinite deck. Return to player: Banker 98.94%, Player 98.77%, Tie 85.88%.</p>
<p>Keys: <b>Space</b> or <b>Enter</b> deals (repeats your last bets if the table is empty).</p>` });
const bet = BetControl($('#panel'), { game: 'baccarat', label: 'Chip value' });

const RM = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const RK = 'afterglow:bacc-road', ROAD_MAX = 84;
const NAME = { P: 'Player', B: 'Banker', T: 'Tie' };
let bets = { P: 0, B: 0, T: 0 }, chips = { P: [], B: [], T: [] }, last = null, round = null, busy = false, dirty = false;
let road = [];
try { road = (JSON.parse(localStorage.getItem(RK)) || []).filter(x => 'PBT'.includes(x)).slice(-ROAD_MAX); } catch (e) {}
const sess = { coups: 0, net: 0 };
const stake = () => bets.P + bets.B + bets.T;
const spots = $$('.spot');

/* ---------- bead road ---------- */
function paintRoad(fresh) {
  const el = $('#road'), cols = Math.max(1, Math.floor((el.clientWidth + 3) / (parseFloat(getComputedStyle(el).getPropertyValue('--bd')) + (innerWidth >= 900 ? 4 : 3))));
  // keep columns aligned: drop whole columns from the front
  const drop = Math.max(0, Math.ceil((road.length - cols * 6) / 6) * 6), vis = road.slice(drop);
  el.innerHTML = '';
  for (let i = 0; i < cols * 6; i++) {
    const r = vis[i], d = document.createElement('i');
    if (r) { d.className = r + (fresh && i === vis.length - 1 ? ' new' : ''); d.textContent = r; }
    el.appendChild(d);
  }
  const c = { P: 0, B: 0, T: 0 }; road.forEach(r => c[r]++);
  const [p, b, t] = $$('#rstat span');
  p.textContent = `P ${c.P}`; b.textContent = `B ${c.B}`; t.textContent = `T ${c.T}`;
}
addEventListener('resize', () => paintRoad());

/* ---------- cards ---------- */
function faceHTML(c) {
  const r = RANKS[c.r], s = SUITS[c.s], fig = c.r >= 10;
  return `<span class="cn tl">${r}<i>${s}</i></span>${fig ? `<span class="face">${r}<small>${s}</small></span>` : `<span class="pip">${s}</span>`}<span class="cn br">${r}<i>${s}</i></span>`;
}
function cardEl(third) { return h(`<div class="pc down${third ? ' third' : ''}" role="img" aria-label="Face-down card"><div class="in"><div class="fc"></div><div class="bk"></div></div></div>`); }
async function place(host, third) {
  const el = cardEl(third); host.appendChild(el); sfx('card');
  if (!RM()) {
    const s = $('#shoe').getBoundingClientRect(), r = el.getBoundingClientRect();
    const dx = s.left + s.width / 2 - (r.left + r.width / 2), dy = s.top + s.height / 2 - (r.top + r.height / 2);
    el.animate([{ transform: `translate(${dx}px,${dy}px) rotate(-30deg) scale(.4)`, opacity: 0.2 }, { transform: third ? 'rotate(90deg)' : 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.9,.25,1)' });
  }
  await sleep(260);
  return el;
}
function reveal(el, c) {
  el.classList.toggle('red', isRed(c)); $('.fc', el).innerHTML = faceHTML(c);
  el.setAttribute('aria-label', `${RANKS[c.r]} of ${['spades', 'hearts', 'clubs', 'diamonds'][c.s]}`);
  el.classList.remove('down'); sfx('reveal');
}
function setTot(side, cards, nat) {
  const t = $('#t' + side); t.textContent = total(cards); t.classList.add('on'); t.classList.toggle('nat', !!nat);
  if (!RM()) t.animate([{ transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
}
async function clearTable() {
  const all = $$('#tbl .pc');
  if (all.length && !RM()) {
    all.forEach((e, i) => e.animate([{ opacity: 1 }, { transform: 'translateY(-30px) scale(.85)', opacity: 0 }], { duration: 220, delay: i * 18, easing: 'ease-in', fill: 'forwards' }));
    await sleep(220 + all.length * 18);
  }
  $('#cP').innerHTML = ''; $('#cB').innerHTML = '';
  for (const s of 'PB') { const t = $('#t' + s); t.textContent = '-'; t.className = 'tot'; $('#side' + s).className = 'side ' + s; }
  spots.forEach(s => s.classList.remove('win', 'lose', 'push'));
}

/* ---------- chips & bets ---------- */
const chipColor = v => (v >= 100000 ? 4 : v >= 10000 ? 3 : v >= 1000 ? 2 : v >= 100 ? 1 : 0);
function paintSpot(k, fresh) {
  const sp = $(`.spot[data-k=${k}]`), st = $('.stack', sp), list = chips[k].slice(-6);
  st.innerHTML = list.map((v, i) => `<i class="chip c${chipColor(v)}${fresh && i === list.length - 1 ? ' drop' : ''}" style="bottom:${i * 4}px"></i>`).join('');
  const shown = dirty && last ? last[k] : bets[k];
  $('.amt', sp).textContent = shown ? fmtFull(shown) : '';
  sp.classList.toggle('has', bets[k] > 0);
  sp.setAttribute('aria-label', `Bet on ${NAME[k]}${bets[k] ? `, ${fmtFull(bets[k])} staked` : ''}`);
}
function setBets(b) {
  bets = { P: b.P || 0, B: b.B || 0, T: b.T || 0 };
  for (const k of 'PBT') { chips[k] = bets[k] ? splitChips(bets[k]) : []; paintSpot(k); }
}
function splitChips(n) { const out = []; for (const v of [100000, 10000, 1000, 100, 10]) while (n >= v && out.length < 6) { out.push(v); n -= v; } return out.length ? out : [n]; }
function addChip(k) {
  if (round || busy) return;
  const v = bet.value;
  if (stake() + v > state.coins) { toast(`Not enough Glow for another ${fmtFull(v)} chip.`, 'r'); buzz(30); return; }
  if (dirty) clearSpotsFx();
  bets[k] += v; chips[k].push(v); sfx('chip'); buzz(8); paintSpot(k, true); paint();
}
// after a coup the previous chips stay on the felt (display only) until the next bet action
function clearSpotsFx() { if (!dirty) return; dirty = false; spots.forEach(s => s.classList.remove('win', 'lose', 'push')); for (const k of 'PBT') { chips[k] = []; paintSpot(k); } }

/* ---------- ui state ---------- */
function msg(t) { $('#msg').textContent = t; }
function paint() {
  const live = !!round || busy, s = stake();
  $('#deal').disabled = live;
  $('#deal').innerHTML = s ? `Deal ${fmtFull(s)} <kbd>Space</kbd>` : (last ? `Deal · rebet ${fmtFull(sum(last))} <kbd>Space</kbd>` : 'Deal <kbd>Space</kbd>');
  $('#rebet').disabled = live || !last;
  $('#rebet').textContent = last ? `Rebet ${fmt(sum(last))}` : 'Rebet';
  $('#clear').disabled = live || (!s && !dirty);
  spots.forEach(b => (b.disabled = live));
  bet.disable(live);
  $('#sStake').textContent = fmtFull(s);
  $('#sCoups').textContent = sess.coups;
  const n = $('#sNet'); n.textContent = (sess.net > 0 ? '+' : '') + fmtFull(sess.net); n.style.color = sess.net > 0 ? 'var(--l)' : sess.net < 0 ? 'var(--r)' : '';
}
const sum = b => b.P + b.B + b.T;

/* ---------- the coup ---------- */
async function deal() {
  if (round || busy) return;
  if (!stake()) {
    if (!last) { msg('Tap Player, Banker or Tie to place chips'); sfx('tap'); buzz(20); $('#spots').classList.add('shake'); setTimeout(() => $('#spots').classList.remove('shake'), 400); return; }
    clearSpotsFx(); setBets(last);
  }
  const b = { ...bets }, tot = sum(b);
  busy = true; paint();
  const r = await startRound('baccarat', tot);
  if (!r) { busy = false; paint(); return; }
  round = r; last = b; dirty = false; sfx('bet');
  await clearTable();
  msg('No more bets');
  const fl = await r.floats(6);
  const g = play(fl);
  const host = { P: $('#cP'), B: $('#cB') }, els = { P: [], B: [] };
  // initial four cards face down, alternating
  for (const [side, i] of g.order.slice(0, 4)) els[side][i] = await place(host[side], false);
  await sleep(160);
  // squeeze: Player cards, then Banker cards
  for (const side of 'PB') {
    reveal(els[side][0], g[side.toLowerCase()][0]); await sleep(200);
    reveal(els[side][1], g[side.toLowerCase()][1]); await sleep(380);
    const two = g[side.toLowerCase()].slice(0, 2);
    setTot(side, two, total(two) >= 8);
  }
  if (g.natural) { msg('Natural!'); sfx('rise'); buzz([15, 30, 15]); await sleep(500); }
  // third cards
  for (const [side, i] of g.order.slice(4)) {
    msg(`${NAME[side]} draws`);
    await sleep(260);
    els[side][i] = await place(host[side], true);
    await sleep(120);
    reveal(els[side][i], g[side.toLowerCase()][i]); await sleep(420);
    setTot(side, g[side.toLowerCase()], false);
  }
  if (!g.natural && g.order.length === 4) { msg('Both stand'); await sleep(300); }
  await finish(g, b, tot);
}

async function finish(g, b, tot) {
  const w = g.win, pay = Math.floor(payout(b, w)), mult = tot ? pay / tot : 0;
  // table feedback
  if (w === 'T') { $('#sideP').classList.add('won'); $('#sideB').classList.add('won'); }
  else { $('#side' + w).classList.add('won'); $('#side' + (w === 'P' ? 'B' : 'P')).classList.add('lost'); }
  spots.forEach(sp => {
    const k = sp.dataset.k; if (!b[k]) return;
    sp.classList.add(k === w ? 'win' : (w === 'T' && k !== 'T') ? 'push' : 'lose');
  });
  for (const k of 'PBT') if (b[k] && k === w) {
    const rr = $(`.spot[data-k=${k}]`).getBoundingClientRect();
    burst(rr.left + rr.width / 2, rr.top + rr.height / 2, { count: k === 'T' ? 70 : 34, colors: k === 'P' ? ['#22f0ff', '#ffffff', '#8b5cff'] : k === 'B' ? ['#ff3dc8', '#ffd84d', '#ffffff'] : ['#b8ff3b', '#ffd84d', '#22f0ff', '#ff3dc8'], speed: k === 'T' ? 9 : 6, gravity: 0.18 });
  }
  if (pay > tot) buzz([20, 30, 40]);
  else if (pay === tot) sfx('tick');
  else { sfx('lose'); buzz(40); }

  const parts = [...'PBT'].filter(k => b[k]).map(k => `${k}${fmt(b[k])}`).join(' ');
  round.settle(pay, { mult, detail: `${parts} · P${g.pt} B${g.bt} · ${NAME[w]}${g.natural ? ' natural' : ''}` });
  if (w === 'T' && b.T > 0) unlock('bacc');
  sess.coups++; sess.net += pay - tot;
  pushRecent($('#recent'), pay > tot ? `+${fmt(pay - tot)}` : pay === tot ? 'push' : fmtX(mult), pay > tot ? (w === 'T' ? 'b' : 'w') : '');
  road.push(w); road = road.slice(-ROAD_MAX);
  try { localStorage.setItem(RK, JSON.stringify(road)); } catch (e) {}
  paintRoad(true);
  const sub = pay > tot ? `You win ${fmtFull(pay)}` : pay === tot ? `Push · ${fmtFull(pay)} returned` : pay > 0 ? `${fmtFull(pay)} of ${fmtFull(tot)} returned` : 'No luck this coup';
  const m = $('#msg'); m.innerHTML = '';
  m.append(h(`<div class="ban ${w}">${w === 'T' ? 'TIE' : NAME[w].toUpperCase() + ' WINS'}<small>${g.pt} – ${g.bt}${g.natural ? ' · natural' : ''}</small></div>`), h(`<span class="sub"></span>`));
  m.lastChild.textContent = sub;
  bets = { P: 0, B: 0, T: 0 };
  dirty = true;
  round = null; busy = false; paint();
}

/* ---------- input ---------- */
$('#spots').onclick = e => { const s = e.target.closest('.spot'); if (s && !s.disabled) addChip(s.dataset.k); };
$('#deal').onclick = () => deal();
$('#rebet').onclick = () => {
  if (round || busy || !last) return;
  if (sum(last) > state.coins) { toast(`Not enough Glow to rebet ${fmtFull(sum(last))}.`, 'r'); buzz(30); return; }
  clearSpotsFx(); setBets(last); sfx('chip'); paint();
};
$('#clear').onclick = () => { if (round || busy) return; sfx('tap'); clearSpotsFx(); setBets({}); paint(); };
// mouse/touch taps shouldn't leave focus on buttons, so Space/Enter always deals afterwards
$('main.game').addEventListener('pointerup', e => { const b = e.target.closest('button'); if (b) b.blur(); });
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || $('.scrim')) return;
  if (e.target.closest?.('input,textarea,select,button,a')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); deal(); }
});

msg('Pick a chip value, tap a bet, then deal');
paintRoad(); paint();
