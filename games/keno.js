import { boot, $, $$, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, state } from '/core/ag.js';
import { N, MAX_PICKS, PAYS, drawFrom, multFor } from '/games/keno-engine.js';

boot({ nav: 'games' });
const SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l2.2 9.8L24 12l-9.8 2.2L12 24l-2.2-9.8L0 12l9.8-2.2z" fill="#fff6c8" opacity=".85" style="filter:drop-shadow(0 0 4px #ffd84d)"/></svg>';
const SPEED = { normal: 430, fast: 120 };
const SKEY = 'afterglow:keno-speed';

gameHeader($('#panel'), { title: 'Constellation Keno', rules: `<p>Tap 1 to 10 stars on the 40-star sky, set your bet and hit <b>Draw</b>. Ten stars are drawn one at a time; every star you picked that gets drawn is a <b>hit</b>, and your hits link up into a constellation.</p><p>Your payout is <b>bet × the paytable multiplier</b> for your number of picks and hits. The live paytable on the board always shows the table for your current pick count. Pick 10 and hit all 10 to win <b>1,000×</b>.</p><p>Every pick count returns between 96% and 98% on average (exact hypergeometric odds). Use <b>Draw again</b> to replay the same stars, or press Space / Enter.</p>` });
const bet = BetControl($('#bet'), { game: 'keno', onChange: () => paint() });

let picks = new Set(), busy = false, shown = null, lastKey = '', edges = [], hitList = [];
let speed = localStorage.getItem(SKEY) === 'fast' ? 'fast' : 'normal';
const board = $('#board'), lines = $('#lines'), tape = $('#tape'), ptab = $('#ptab'), res = $('#res');
for (let i = 1; i <= N; i++) board.insertAdjacentHTML('beforeend', `<button class="st" data-n="${i}" aria-label="Star ${i}" aria-pressed="false"><span class="orb"><i>${SPARK}</i><span>${i}</span></span></button>`);
const stars = $$('.st', board);
const starOf = n => stars[n - 1];
for (let i = 0; i < 10; i++) tape.insertAdjacentHTML('beforeend', '<span></span>');
const balls = $$('span', tape);

/* ---------- paytable ---------- */
function groups(k) {
  const t = PAYS[k], out = []; let z = 0;
  while (z <= k && t[z] === 0) z++;
  if (z > 0) out.push({ lo: 0, hi: z - 1, m: 0 });
  for (let h = z; h <= k; h++) out.push({ lo: h, hi: h, m: t[h] });
  return out;
}
function paintTable() {
  const k = picks.size;
  if (!k) { ptab.innerHTML = '<div class="hint">Tap 1–10 stars to see their paytable</div>'; return; }
  ptab.innerHTML = groups(k).map(g => `<div class="pr${g.m ? '' : ' zero'}${g.hi === k && g.m ? ' top' : ''}" data-lo="${g.lo}" data-hi="${g.hi}"><small>${g.lo === g.hi ? g.lo : g.lo + '–' + g.hi} hit${g.hi === 1 && g.lo === 1 ? '' : 's'}</small><b>${g.m ? fmtMult(g.m) : '0×'}</b></div>`).join('');
}
const fmtMult = m => (Number.isInteger(m) ? m : m.toFixed(1)) + '×';
function markRow(hits, cls) {
  $$('.pr', ptab).forEach(r => { r.classList.remove('live', 'hit', 'miss'); if (hits >= +r.dataset.lo && hits <= +r.dataset.hi) r.classList.add(cls); });
}

/* ---------- board state ---------- */
const keyOf = () => [...picks].sort((a, b) => a - b).join(',');
function clearResult() {
  if (!shown) return;
  shown = null; edges = []; hitList = []; lines.innerHTML = '';
  stars.forEach(s => s.classList.remove('dr', 'hit', 'mute'));
  balls.forEach(b => { b.className = ''; b.textContent = ''; });
  res.className = 'res'; res.textContent = '';
}
function paint() {
  const k = picks.size;
  stars.forEach(s => { const on = picks.has(+s.dataset.n); s.classList.toggle('pk', on); s.setAttribute('aria-pressed', on); s.disabled = busy; });
  $('#pc').textContent = `${k}/${MAX_PICKS}`;
  $('#phint').textContent = k ? (k === MAX_PICKS ? 'max stars' : 'tap to toggle') : 'tap 1 to 10';
  $('#top').textContent = k ? `${fmtX(PAYS[k][k])} · ${fmtFull(bet.value * PAYS[k][k])}` : '-';
  const go = $('#go');
  go.disabled = busy || !k;
  go.textContent = busy ? 'Drawing…' : !k ? 'Pick your stars' : shown && lastKey === keyOf() ? 'Draw again' : 'Draw';
  $('#rand').disabled = busy; $('#clear').disabled = busy || !k;
  $$('#speed button').forEach(b => b.classList.toggle('on', b.dataset.s === speed));
  bet.disable(busy);
}
function setPicks(next) { clearResult(); picks = next; paintTable(); paint(); }

board.onclick = e => {
  const s = e.target.closest('.st'); if (!s || busy) return;
  const n = +s.dataset.n, next = new Set(picks);
  if (next.has(n)) { next.delete(n); sfx('tap'); }
  else if (next.size >= MAX_PICKS) { sfx('lose'); buzz(25); flashMax(); return; }
  else { next.add(n); sfx('chip'); buzz(6); }
  setPicks(next);
};
function flashMax() { const p = $('#pc'); p.parentElement.classList.remove('shake'); void p.offsetWidth; p.parentElement.classList.add('shake'); $('#phint').textContent = '10 stars max'; }

// Random pick is cosmetic only (it chooses the player's stars, not the outcome).
$('#rand').onclick = () => {
  if (busy) return;
  const want = picks.size || 5, pool = Array.from({ length: N }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  sfx('spin'); buzz(10);
  setPicks(new Set(pool.slice(0, want)));
  stars.forEach(s => { if (picks.has(+s.dataset.n)) { const o = $('.orb', s); o.style.animation = 'none'; void o.offsetWidth; o.style.animation = 'pop .3s'; } });
};
$('#clear').onclick = () => { if (busy || !picks.size) return; sfx('tap'); setPicks(new Set()); };
$('#speed').onclick = e => { const b = e.target.closest('button'); if (!b || busy) return; sfx('tap'); speed = b.dataset.s; localStorage.setItem(SKEY, speed); paint(); };

/* ---------- constellation lines ---------- */
function center(n) { const b = board.getBoundingClientRect(), r = starOf(n).getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; }
function lineEl([a, b], animate) {
  const [x1, y1] = center(a), [x2, y2] = center(b), len = Math.hypot(x2 - x1, y2 - y1);
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v.toFixed(1)));
  l.style.strokeDasharray = len; l.style.setProperty('--len', len);
  if (!animate) l.style.animation = 'none';
  lines.appendChild(l);
}
function linkHit(n) {
  if (hitList.length) {
    // connect to the nearest star already in the constellation
    const [x, y] = [(n - 1) % 8, Math.floor((n - 1) / 8)];
    let best = hitList[0], bd = Infinity;
    for (const m of hitList) { const d = Math.hypot((m - 1) % 8 - x, Math.floor((m - 1) / 8) - y); if (d < bd) { bd = d; best = m; } }
    edges.push([best, n]); lineEl([best, n], true);
  }
  hitList.push(n);
}
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { lines.innerHTML = ''; edges.forEach(e => lineEl(e, false)); }, 80); });

/* ---------- the draw ---------- */
async function draw() {
  if (busy || !picks.size) return;
  const k = picks.size, chosen = new Set(picks), key = keyOf();
  busy = true; paint();
  const round = await startRound('keno', bet.value);
  if (!round) { busy = false; paint(); return; }
  sfx('bet'); buzz(8);
  { const b = board.getBoundingClientRect(); if (b.top < 58 || b.bottom > innerHeight - 70) board.scrollIntoView({ block: 'center', behavior: state.settings.reduced ? 'auto' : 'smooth' }); }
  shown = true; clearResult(); // force-reset the previous draw's visuals
  shown = true; lastKey = key;
  const drawn = drawFrom(await round.floats(10));
  stars.forEach(s => s.classList.toggle('mute', true));
  markRow(0, 'live');
  let hits = 0;
  for (let i = 0; i < drawn.length; i++) {
    await sleep(SPEED[speed]);
    const n = drawn[i], s = starOf(n), hit = chosen.has(n);
    s.classList.remove('mute'); s.classList.add(hit ? 'hit' : 'dr');
    balls[i].textContent = n; balls[i].className = 'on' + (hit ? ' h' : '');
    if (hit) {
      hits++; linkHit(n);
      sfx(hits >= 5 ? 'rise' : 'gem'); buzz(hits >= 5 ? [12, 30, 12] : 12);
      const r = s.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, { count: 10 + hits * 3, colors: ['#ffd84d', '#ff3dc8', '#fff'], speed: 4 + hits * 0.4, gravity: 0.08 });
      markRow(hits, 'live');
    } else sfx(speed === 'fast' ? 'tap' : 'tick');
  }
  await sleep(speed === 'fast' ? 120 : 260);
  const mult = multFor(k, hits), payout = round.bet * mult;
  round.settle(payout, { mult, detail: `${k} picks · ${hits} hits · drew ${drawn.join(' ')}` });
  if (hits >= 6) unlock('keno');
  markRow(hits, mult > 0 ? 'hit' : 'miss');
  stars.forEach(s => { if (!s.classList.contains('hit') && !s.classList.contains('dr')) s.classList.add('mute'); });
  if (mult > 0) {
    res.className = 'res w'; res.innerHTML = `${fmtX(mult)} · +${fmtFull(Math.floor(payout))}<small>${hits}/${k} hits</small>`;
    if (mult < 10) { const b = res.getBoundingClientRect(); burst(b.left + b.width / 2, b.top + b.height / 2, { count: 26, colors: ['#b8ff3b', '#22f0ff', '#ffd84d'], speed: 6 }); }
    if (mult < 1) sfx('cash');
  } else {
    res.className = 'res l'; res.innerHTML = `No win<small>${hits}/${k} hits</small>`; sfx('lose'); buzz(20);
  }
  $('#last').textContent = `${hits}/${k} · ${fmtX(mult)}`;
  pushRecent($('#recent'), `${hits}/${k} · ${mult ? fmtMult(mult) : '0×'}`, mult >= 10 ? 'b' : mult >= 1 ? 'w' : '');
  busy = false; paint();
}
$('#go').onclick = draw;

/* ---------- keyboard: Space / Enter draws ---------- */
document.addEventListener('click', e => { if (e.detail > 0) e.target.closest?.('.game button')?.blur(); }, true);
addEventListener('keydown', e => {
  if (e.key !== ' ' && e.key !== 'Enter') return;
  if (e.repeat || $('.scrim') || e.target.closest?.('input,textarea,select,a')) return;
  if (e.target.closest?.('button') && e.target !== document.body) return; // keyboard-focused buttons keep their own action
  e.preventDefault(); draw();
});

if (state.settings.reduced) document.body.classList.add('reduced');
paintTable(); paint();
