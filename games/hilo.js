import { boot, $, h, state, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep } from '/core/ag.js';
import { CAP, MAX_SKIPS, ACH_CHAIN, RANKS, SUITS, SUIT_NAMES, cardOf, isRed, label, pWin, multFor, canCall, wins } from '/games/hilo-engine.js';

boot({ nav: 'games' });
gameHeader($('#panel'), { title: 'Hyperdrive Hi-Lo', rules: `<p>Place a bet and a card warps in face up. Call the next card:</p>
<ul style="padding-left:18px"><li><b>Higher or same</b> wins if the next card is equal or higher.</li><li><b>Lower or same</b> wins if the next card is equal or lower.</li></ul>
<p>Aces are low (A=1 … K=13). The deck is infinite, so every card is independent and suits are cosmetic.</p>
<p>Each call pays <b>0.97 ÷ chance of winning</b>, shown live on the buttons. Multipliers compound along your chain. Cash out any time after your first correct call. One wrong call loses the whole round.</p>
<p>On an Ace, "Higher or same" can't lose, so it's disabled (it would pay only 0.97×). Same for "Lower or same" on a King. Swap a card you don't like with up to <b>3 free skips</b> per round.</p>
<p>Wins are capped at <b>10,000×</b> and cash out automatically when you hit it. Each call returns 97% on average (3% house edge per call).</p>
<p class="faint">Keys: Space launch · ↑ higher · ↓ lower · S skip · C or Enter cash out.</p>` });
const bet = BetControl($('#panel'), { game: 'hilo' });
$('#panel').insertBefore(bet.el, $('#go'));

const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('#stage'), slot = $('#slot'), trail = $('#trail');
let round = null, busy = false, cur = null, mult = 1, chain = 0, skips = MAX_SKIPS, best = 0, cardNode = null, ban = null;

/* ---------- cards ---------- */
function cardEl(c, mini) {
  const r = RANKS[c.r], s = SUITS[c.s] + '\uFE0E', fig = c.r >= 11 || c.r === 1;
  const el = h(`<div class="pcard${isRed(c) ? ' red' : ''}${mini ? ' mini' : ''}" role="img"></div>`);
  el.setAttribute('aria-label', `${r === 'A' ? 'Ace' : r === 'J' ? 'Jack' : r === 'Q' ? 'Queen' : r === 'K' ? 'King' : r} of ${SUIT_NAMES[c.s]}`);
  el.innerHTML = `<span class="cn tl">${r}<i>${s}</i></span>${fig ? `<span class="face">${r}<small>${s}</small></span>` : `<span class="pip">${s}</span>`}<span class="cn br">${r}<i>${s}</i></span>`;
  return el;
}
function showCard(c, anim = true) {
  if (cardNode) { const old = cardNode; old.classList.remove('in'); old.classList.add('out'); setTimeout(() => old.remove(), 340); }
  cardNode = c ? cardEl(c) : h('<div class="pcard back" role="img" aria-label="Card back"></div>');
  if (anim && !reduced()) cardNode.classList.add('in');
  slot.appendChild(cardNode);
  if (!c) slot.appendChild(h('<span class="hl-hint">Press Launch to engage</span>'));
  else slot.querySelector('.hl-hint')?.remove();
}
function addTrail(c, kind, text) {
  const t = h(`<div class="tc ${kind}"></div>`);
  t.appendChild(cardEl(c, true));
  t.appendChild(h(`<span class="call"></span>`)).textContent = text;
  trail.appendChild(t);
  while (trail.children.length > 14) trail.firstChild.remove();
}
function banner(text, kind) { ban?.remove(); ban = slot.appendChild(h(`<div class="hl-ban ${kind}"></div>`)); ban.textContent = text; }
function flash(color) { const f = $('#flash'); f.style.setProperty('--fc', color); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

/* ---------- warp starfield ---------- */
const cv = $('#warp'), ctx = cv.getContext('2d');
let W = 0, H = 0, D = 1, stars = [], speed = 0.25, target = 0.25, kick = 0, tint = [34, 240, 255], tintTo = tint.slice(), lastT = 0, rafOn = false;
const TINTS = [[34, 240, 255], [139, 92, 255], [255, 61, 200], [255, 216, 77], [184, 255, 59]];
function resize() {
  const r = stage.getBoundingClientRect(); D = Math.min(devicePixelRatio || 1, 2);
  W = r.width; H = r.height; cv.width = Math.round(W * D); cv.height = Math.round(H * D); ctx.setTransform(D, 0, 0, D, 0, 0);
  if (!stars.length) for (let i = 0; i < 220; i++) stars.push(newStar(Math.random()));
  if (reduced()) drawStars(0);
}
const newStar = z => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: z || 1 });
function drawStars(dz) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.5, f = Math.max(W, H) * 0.42, [r, g, b] = tint.map(Math.round);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.55);
  glow.addColorStop(0, `rgba(${r},${g},${b},${0.05 + Math.min(0.2, speed * 0.02)})`); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  for (const s of stars) {
    const x = cx + (s.x / s.z) * f, y = cy + (s.y / s.z) * f;
    const z0 = Math.min(1, s.z + dz * 5 + 0.002), x0 = cx + (s.x / z0) * f, y0 = cy + (s.y / z0) * f;
    const a = Math.min(1, (1 - s.z) * 1.4);
    ctx.strokeStyle = `rgba(${Math.round(r + (255 - r) * (1 - s.z) * 0.6)},${Math.round(g + (255 - g) * (1 - s.z) * 0.6)},${Math.round(b + (255 - b) * (1 - s.z) * 0.6)},${a})`;
    ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.4);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
  }
}
function frame(t) {
  const dt = Math.min(50, t - (lastT || t)); lastT = t;
  if (reduced()) { rafOn = false; drawStars(0); return; }
  speed += (target + kick - speed) * Math.min(1, dt * 0.004); kick *= Math.pow(0.5, dt / 300);
  tint = tint.map((v, i) => v + (tintTo[i] - v) * Math.min(1, dt * 0.004));
  const dz = speed * dt * 0.00018;
  const cx = W / 2, f = Math.max(W, H) * 0.42;
  for (const s of stars) {
    s.z -= dz;
    const x = cx + (s.x / s.z) * f, y = H / 2 + (s.y / s.z) * f;
    if (s.z <= 0.02 || x < -40 || x > W + 40 || y < -40 || y > H + 40) Object.assign(s, newStar(1));
  }
  drawStars(dz);
  requestAnimationFrame(frame);
}
function startWarp() { if (!rafOn && !reduced()) { rafOn = true; lastT = 0; requestAnimationFrame(frame); } }
function setWarp() {
  target = round ? 0.6 + Math.min(chain, 14) * 0.75 : 0.25;
  const c = round ? TINTS[Math.min(TINTS.length - 1, Math.floor(chain / 2))] : TINTS[0];
  tintTo = c.slice();
  stage.style.setProperty('--tint', `rgb(${c.join(',')})`);
  if (reduced()) drawStars(0);
}
new ResizeObserver(resize).observe(stage);

/* ---------- state paint ---------- */
const potential = () => (round ? Math.floor(round.bet * mult) : 0);
function paint() {
  const live = !!round && !!cur;
  $('#mult').textContent = fmtX(mult); $('#s-mult').textContent = fmtX(mult);
  $('#pay').textContent = fmtFull(live ? potential() : 0); $('#s-pay').textContent = fmtFull(live && chain ? potential() : 0);
  $('#chain').textContent = chain; $('#s-chain').textContent = chain;
  $('#skips').textContent = skips; $('#s-skip').textContent = skips; $('#s-best').textContent = best;
  [...$('#pips').children].forEach((p, i) => p.classList.toggle('on', i < skips));
  for (const d of ['hi', 'lo']) {
    const b = $('#' + d), m = $('.m', b), p = $('.p', b);
    if (!live) { m.textContent = '-'; p.innerHTML = '&nbsp;'; b.disabled = true; b.classList.remove('sure'); continue; }
    const ok = canCall(d, cur.r), pw = pWin(d, cur.r);
    b.classList.toggle('sure', !ok);
    m.textContent = ok ? fmtX(multFor(d, cur.r)) : 'Sure thing';
    p.textContent = ok ? `${(pw * 100).toFixed(1)}% · ${fmtX(Math.min(CAP, mult * multFor(d, cur.r)))} total` : 'Always wins: disabled';
    b.disabled = busy || !ok;
  }
  $('#skip').innerHTML = `Skip · ${skips}<kbd>S</kbd>`;
  $('#skip').disabled = !live || busy || skips <= 0;
  for (const go of [$('#go'), $('#go2')]) {
    if (round) { go.textContent = chain ? `Cash out ${fmtFull(potential())}` : 'Make a call'; go.className = (go.id === 'go' ? 'btn big ' : 'btn ') + 'lime'; go.disabled = !chain || busy; }
    else { go.textContent = go.id === 'go' ? 'Bet' : `Launch · ${fmtFull(bet.value)}`; go.className = (go.id === 'go' ? 'btn big ' : 'btn ') + 'pri'; go.disabled = busy; }
  }
  bet.disable(!!round || busy);
}

/* ---------- flow ---------- */
async function draw() { return cardOf(await round.float()); }

async function start() {
  if (busy || round) return;
  busy = true; paint();
  const r = await startRound('hilo', bet.value);
  if (!r) { busy = false; paint(); return; }
  sfx('bet'); buzz(10);
  $('#mult').classList.remove('lost');
  round = r; mult = 1; chain = 0; skips = MAX_SKIPS; ban?.remove(); ban = null;
  slot.classList.remove('won', 'lost');
  trail.replaceChildren();
  cur = await draw();
  setWarp(); kick = 4;
  showCard(cur); sfx('card');
  busy = false; paint();
}

async function call(d) {
  if (!round || busy || !cur || !canCall(d, cur.r)) return;
  busy = true; paint();
  const prev = cur, m = multFor(d, prev.r);
  const next = await draw();
  sfx('tap');
  showCard(next); sfx('card');
  await sleep(320);
  const arrow = d === 'hi' ? '↑' : '↓';
  if (wins(d, prev, next)) {
    chain++; mult = Math.min(CAP, mult * m); cur = next; best = Math.max(best, chain);
    addTrail(prev, 'ok', `${arrow} ${fmtX(m)}`);
    sfx(chain >= 5 ? 'rise' : 'gem'); buzz(12);
    slot.classList.remove('won'); void slot.offsetWidth; slot.classList.add('won'); setTimeout(() => slot.classList.remove('won'), 500);
    flash(chain >= ACH_CHAIN ? '#ffd84d66' : '#b8ff3b44');
    const b = $('#mult'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    const rc = cardNode.getBoundingClientRect();
    burst(rc.left + rc.width / 2, rc.top + rc.height / 2, { count: 10 + chain * 3, colors: ['#22f0ff', '#b8ff3b', '#ff3dc8', '#ffd84d'], speed: 5 + chain * 0.4, gravity: 0.08 });
    if (chain === ACH_CHAIN) unlock('hilo');
    setWarp(); kick = 3 + chain * 0.4;
    if (mult >= CAP) { busy = false; banner('MAX WIN 10,000×', 'win'); return cashOut(true); }
    busy = false; paint();
  } else {
    addTrail(prev, 'bad', `${arrow} ✕`);
    slot.classList.add('lost'); banner('WARP FAILURE', 'bust');
    sfx('boom'); buzz([60, 40, 90]); flash('#ff4d6d66');
    stage.classList.add('shake'); setTimeout(() => stage.classList.remove('shake'), 400);
    tintTo = [255, 77, 109]; stage.style.setProperty('--tint', '#ff4d6d'); target = 0.05; kick = 0;
    const lostChain = chain;
    round.settle(0, { mult: 0, detail: `${lostChain} correct · ${d === 'hi' ? 'higher' : 'lower'} on ${label(prev)} · drew ${label(next)} · bust` });
    pushRecent($('#recent'), '0.00×');
    mult = 0; $('#mult').classList.add('lost'); end(1100);
  }
}

async function skip() {
  if (!round || busy || !cur || skips <= 0) return;
  busy = true; skips--; paint();
  const prev = cur;
  cur = await draw();
  addTrail(prev, 'skip', 'skip');
  showCard(cur); sfx('card'); buzz(6); kick = 1.5;
  await sleep(200);
  busy = false; paint();
}

function cashOut(auto = false) {
  if (!round || busy || !chain) return;
  busy = true;
  const m = mult, pay = potential();
  sfx('cash'); buzz([20, 30, 20]);
  if (!auto) banner(`+${fmtFull(pay)}`, 'win');
  addTrail(cur, 'ok', 'cash');
  const rc = cardNode.getBoundingClientRect();
  burst(rc.left + rc.width / 2, rc.top + rc.height / 2, { count: 40, colors: ['#b8ff3b', '#ffd84d', '#22f0ff'], speed: 8, gravity: 0.15 });
  round.settle(round.bet * m, { mult: m, detail: `${chain} correct · ${MAX_SKIPS - skips} skips · ${auto ? 'max win' : 'cashed out'}` });
  pushRecent($('#recent'), fmtX(m), m >= 10 ? 'b' : 'w');
  end(900);
}

async function end(ms) {
  round = null; cur = null; paint();
  $('#mult').textContent = fmtX(Math.max(0, mult));
  await sleep(ms);
  busy = false; target = 0.25; tintTo = TINTS[0].slice(); stage.style.setProperty('--tint', `rgb(${TINTS[0].join(',')})`);
  paint();
}

/* ---------- input ---------- */
$('#hi').onclick = () => call('hi');
$('#lo').onclick = () => call('lo');
$('#skip').onclick = () => skip();
const goClick = () => (round ? cashOut() : start());
$('#go').onclick = goClick; $('#go2').onclick = goClick;
addEventListener('keydown', e => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest?.('input,textarea,select') || document.querySelector('.scrim')) return;
  const k = e.key;
  if (k === 'ArrowUp') { e.preventDefault(); call('hi'); }
  else if (k === 'ArrowDown') { e.preventDefault(); call('lo'); }
  else if (k === 's' || k === 'S') skip();
  else if (k === 'c' || k === 'C' || k === 'Enter') { e.preventDefault(); cashOut(); }
  else if (k === ' ') { e.preventDefault(); if (!round) start(); }
});

showCard(null, false);
setWarp(); resize(); startWarp();
paint();
// keep the Launch label in sync with bet edits
$('input', bet.el).addEventListener('blur', () => setTimeout(paint));
bet.el.addEventListener('click', () => setTimeout(paint));
