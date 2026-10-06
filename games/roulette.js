import { boot, $, $$, h, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, unlock, state, lastBet, setLastBet, toast } from '/core/ag.js';
import { WHEEL, BETS, MAX_TOTAL, colorOf, spinFrom, payoutFor, totalOf, winningKeys } from '/games/roulette-engine.js';

boot({ nav: 'games' });
gameHeader($('#panel'), { title: 'Orbit Roulette', rules: `<p>European single-zero roulette. Pick a chip, tap the table to stack it, then hit <b>Spin</b>.</p>
  <p><b>Straight up</b> (one number, 0 to 36) returns 36×.<br><b>Dozens</b> and <b>columns</b> (2:1) return 3×.<br><b>Red / black, odd / even, 1-18 / 19-36</b> return 2×.</p>
  <p>Zero loses every outside bet (no la partage). Max total stake per spin is 1,000,000. Returns include your stake. RTP 97.3% (house edge 2.7%).</p>
  <p>Your chips stay on the table after a spin. Press Spin again to replay the layout, or Clear to start over. Rebet restores your last spin's layout.</p>` });

const CHIPS = [10, 100, 500, 1000, 10000, 100000];
const chipLbl = v => (v >= 1000 ? v / 1000 + 'K' : String(v));
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLS = { red: 'r', black: 'k', green: 'z' };

let chip = CHIPS.includes(lastBet('roulette', 100)) ? lastBet('roulette', 100) : 100;
let bets = {}, undo = [], lastLayout = null, spinning = false, session = [];
let quick = localStorage.getItem('afterglow:rlt-quick') === '1';

/* ---------- chip tray ---------- */
const tray = $('#tray');
CHIPS.forEach(v => tray.appendChild(h(`<button class="chip" data-v="${v}" role="radio" aria-label="${fmtFull(v)} chip">${chipLbl(v)}</button>`)));
tray.onclick = e => {
  const b = e.target.closest('button'); if (!b || spinning) return;
  chip = +b.dataset.v; setLastBet('roulette', chip); sfx('tap'); buzz(6); paintTray();
};
function paintTray() { $$('button', tray).forEach(b => { const on = +b.dataset.v === chip; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.disabled = spinning; }); }

/* ---------- table ---------- */
const table = $('#table');
const spots = {};
function addSpot(k, cls, inner, v, hz, aria) {
  const [vr, vc, vrs = 1, vcs = 1] = v, [hr, hc, hrs = 1, hcs = 1] = hz;
  const b = h(`<button class="spot ${cls}" data-k="${k}" aria-label="${aria}" style="--vr:${vr};--vc:${vc};--vrs:${vrs};--vcs:${vcs};--hr:${hr};--hc:${hc};--hrs:${hrs};--hcs:${hcs}"><span class="lbl">${inner}</span><span class="stk"></span></button>`);
  table.appendChild(b); spots[k] = b;
}
addSpot('n0', 'green', '0', [1, 3, 1, 3], [1, 1, 3, 1], 'Straight up 0');
for (let n = 1; n <= 36; n++) {
  const i = n - 1;
  addSpot('n' + n, colorOf(n), n, [Math.floor(i / 3) + 2, 3 + (i % 3)], [3 - (i % 3), Math.floor(i / 3) + 2], `Straight up ${n} ${colorOf(n)}`);
}
['c1', 'c2', 'c3'].forEach((k, i) => addSpot(k, 'out col', '2:1', [14, 3 + i], [3 - i, 14], `Column ${i + 1}, pays 3×`));
['d1', 'd2', 'd3'].forEach((k, i) => addSpot(k, 'out', BETS[k].label, [2 + i * 4, 2, 4], [4, 2 + i * 4, 1, 4], `${BETS[k].label} dozen, pays 3×`));
[['low', '1-18'], ['even', 'Even'], ['red', '<i class="dia r"></i>'], ['black', '<i class="dia k"></i>'], ['odd', 'Odd'], ['high', '19-36']].forEach(([k, lbl], i) =>
  addSpot(k, 'out', lbl, [2 + i * 2, 1, 2], [5, 2 + i * 2, 1, 2], `${BETS[k].label}, pays 2×`));
$$('[data-k=red] .lbl,[data-k=black] .lbl', table).forEach(e => (e.style.writingMode = 'horizontal-tb', e.style.transform = 'none'));

table.addEventListener('click', e => { const s = e.target.closest('.spot'); if (s) place(s.dataset.k, s); });

function snapshot() { undo.push({ ...bets }); if (undo.length > 200) undo.shift(); }
function place(k, el) {
  if (spinning) return;
  const tot = totalOf(bets) + chip;
  if (tot > MAX_TOTAL) { toast('Max total stake is 1,000,000 Glow.', 'r'); buzz(30); return; }
  if (tot > state.coins) { toast(`Not enough Glow for another ${fmtFull(chip)} chip.`, 'r'); buzz(30); return; }
  unWon(); snapshot();
  bets[k] = (bets[k] || 0) + chip;
  sfx('chip'); buzz(8);
  render();
  }

$('#undo').onclick = () => { if (spinning || !undo.length) return; unWon(); bets = undo.pop(); sfx('tap'); render(); };
$('#clear').onclick = () => { if (spinning || !totalOf(bets)) return; unWon(); snapshot(); bets = {}; sfx('tap'); render(); };
$('#dbl').onclick = () => {
  if (spinning) return; const t = totalOf(bets); if (!t) return;
  if (t * 2 > MAX_TOTAL) return toast('Doubling would pass the 1,000,000 max stake.', 'r');
  if (t * 2 > state.coins) return toast('Not enough Glow to double.', 'r');
  unWon(); snapshot(); for (const k in bets) bets[k] *= 2; sfx('chip'); setTimeout(() => sfx('chip'), 70); render();
};
$('#rebet').onclick = () => {
  if (spinning || !lastLayout) return; const t = totalOf(lastLayout);
  if (t > state.coins) return toast('Not enough Glow for the last layout.', 'r');
  unWon(); snapshot(); bets = { ...lastLayout }; sfx('chip'); render();
};
$$('.qs').forEach(q => { q.checked = quick; q.onchange = () => { quick = q.checked; localStorage.setItem('afterglow:rlt-quick', quick ? '1' : '0'); $$('.qs').forEach(x => (x.checked = quick)); sfx('tap'); }; });

function stackHTML(amt) {
  const list = []; let left = amt;
  for (let i = CHIPS.length - 1; i >= 0 && list.length < 40; i--) while (left >= CHIPS[i] && list.length < 40) { list.push(CHIPS[i]); left -= CHIPS[i]; }
  const show = list.slice(0, 4), lbl = amt >= 1e6 ? +(amt / 1e6).toFixed(2) + 'M' : amt >= 1000 ? +(amt / 1000).toFixed(2) + 'K' : String(amt);
  return show.map((v, i) => `<span class="chip" data-v="${v}" style="transform:translateY(${-i * 3}px)${i === show.length - 1 && lbl.length >= 5 ? ';font-size:7.5px' : ''}">${i === show.length - 1 ? lbl : ''}</span>`).join('');
}
const same = (a, b) => { const ka = Object.keys(a).filter(k => a[k]), kb = Object.keys(b).filter(k => b[k]); return ka.length === kb.length && ka.every(k => a[k] === b[k]); };

function render() {
  for (const k in spots) {
    const amt = bets[k] || 0, el = spots[k], stk = $('.stk', el);
    if (+el.dataset.amt !== amt) { el.dataset.amt = amt; stk.innerHTML = amt ? stackHTML(amt) : ''; el.classList.toggle('has', amt > 0); }
    el.disabled = spinning;
  }
  const t = totalOf(bets), n = Object.values(bets).filter(Boolean).length;
  $('#total').textContent = fmtFull(t);
  $('#nbets').textContent = n;
  $('#undo').disabled = spinning || !undo.length;
  $('#clear').disabled = spinning || !t;
  $('#dbl').disabled = spinning || !t || t * 2 > MAX_TOTAL;
  $('#rebet').disabled = spinning || !lastLayout || same(bets, lastLayout);
  const sp = $('#spin'); sp.disabled = spinning || !t; sp.textContent = spinning ? 'Spinning…' : 'Spin';
  paintTray();
}
function unWon() { table.classList.remove('won'); $$('.spot', table).forEach(s => s.classList.remove('hit', 'lost')); }

/* ---------- wheel (canvas) ---------- */
const cv = $('#wheel'), ctx = cv.getContext('2d'), STEP = Math.PI * 2 / 37;
let S = 0, wheelImg = null, rimImg = null;
let wAng = 0, ballRel = 0, ballR = 0.6, wVel = 0.12, anim = null;
const PCOL = { red: ['#c01f98', '#7a0f60'], black: ['#14152c', '#0a0b18'], green: ['#4f9a00', '#2a5200'] };

function build() {
  const d = Math.min(devicePixelRatio || 1, 2), css = cv.clientWidth || 260;
  S = Math.round(css * d); cv.width = cv.height = S;
  const R = S / 2;
  // rotating part
  wheelImg = document.createElement('canvas'); wheelImg.width = wheelImg.height = S;
  const g = wheelImg.getContext('2d'); g.translate(R, R);
  for (let i = 0; i < 37; i++) {
    const n = WHEEL[i], c = colorOf(n), a0 = i * STEP - STEP / 2 - Math.PI / 2, a1 = a0 + STEP;
    // number ring
    g.beginPath(); g.arc(0, 0, R * 0.84, a0, a1); g.arc(0, 0, R * 0.68, a1, a0, true); g.closePath();
    g.fillStyle = PCOL[c][0]; g.fill();
    // pocket ring
    g.beginPath(); g.arc(0, 0, R * 0.68, a0, a1); g.arc(0, 0, R * 0.53, a1, a0, true); g.closePath();
    g.fillStyle = PCOL[c][1]; g.fill();
    // frets
    g.strokeStyle = c === 'black' ? '#22f0ff' : '#ffffff66'; g.lineWidth = Math.max(1, R * 0.008);
    g.beginPath(); g.moveTo(Math.cos(a0) * R * 0.53, Math.sin(a0) * R * 0.53); g.lineTo(Math.cos(a0) * R * 0.84, Math.sin(a0) * R * 0.84);
    g.strokeStyle = '#d8dcff88'; g.stroke();
    // label
    g.save(); g.rotate(i * STEP); g.fillStyle = c === 'black' ? '#c9fbff' : '#fff';
    g.font = `800 ${Math.round(R * 0.088)}px ui-monospace,Menlo,monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (c === 'green') { g.shadowColor = '#b8ff3b'; g.shadowBlur = R * 0.05; }
    g.fillText(String(n), 0, -R * 0.76); g.restore();
  }
  g.lineWidth = Math.max(1.5, R * 0.012);
  g.strokeStyle = '#22f0ff'; g.shadowColor = '#22f0ff'; g.shadowBlur = R * 0.04;
  [0.84, 0.68, 0.53].forEach(r => { g.beginPath(); g.arc(0, 0, R * r, 0, Math.PI * 2); g.stroke(); });
  g.shadowBlur = 0;
  // cone
  const cg = g.createRadialGradient(0, 0, R * 0.05, 0, 0, R * 0.53); cg.addColorStop(0, '#2a2350'); cg.addColorStop(0.6, '#15122c'); cg.addColorStop(1, '#0a0918');
  g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R * 0.525, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 4; i++) {
    g.save(); g.rotate(i * Math.PI / 2); g.strokeStyle = '#ffd84d'; g.shadowColor = '#ffd84d'; g.shadowBlur = R * 0.03; g.lineWidth = R * 0.022; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -R * 0.08); g.lineTo(0, -R * 0.36); g.stroke();
    g.fillStyle = '#ffd84d'; g.beginPath(); g.arc(0, -R * 0.38, R * 0.03, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.fillStyle = '#ffd84d'; g.shadowColor = '#ffd84d'; g.shadowBlur = R * 0.05; g.beginPath(); g.arc(0, 0, R * 0.08, 0, Math.PI * 2); g.fill();
  // static rim
  rimImg = document.createElement('canvas'); rimImg.width = rimImg.height = S;
  const q = rimImg.getContext('2d'); q.translate(R, R);
  const rg = q.createRadialGradient(0, 0, R * 0.84, 0, 0, R);
  rg.addColorStop(0, '#07070f'); rg.addColorStop(0.55, '#121230'); rg.addColorStop(1, '#0a0a1a');
  q.fillStyle = rg; q.beginPath(); q.arc(0, 0, R * 0.985, 0, Math.PI * 2); q.arc(0, 0, R * 0.84, 0, Math.PI * 2, true); q.fill('evenodd');
  q.lineWidth = Math.max(2, R * 0.02); q.strokeStyle = '#ff3dc8'; q.shadowColor = '#ff3dc8'; q.shadowBlur = R * 0.06;
  q.beginPath(); q.arc(0, 0, R * 0.965, 0, Math.PI * 2); q.stroke();
  q.lineWidth = Math.max(1, R * 0.008); q.strokeStyle = '#8b5cff'; q.shadowColor = '#8b5cff';
  q.beginPath(); q.arc(0, 0, R * 0.9, 0, Math.PI * 2); q.stroke();
  // diamond deflectors
  q.shadowBlur = R * 0.03; q.shadowColor = '#22f0ff'; q.fillStyle = '#9ff8ff';
  for (let i = 0; i < 8; i++) { q.save(); q.rotate(i * Math.PI / 4 + Math.PI / 8); q.translate(0, -R * 0.925); q.rotate(Math.PI / 4); q.fillRect(-R * 0.018, -R * 0.018, R * 0.036, R * 0.036); q.restore(); }
  draw();
}

function draw() {
  if (!S) return;
  const R = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.save(); ctx.translate(R, R); ctx.rotate(wAng); ctx.drawImage(wheelImg, -R, -R); ctx.restore();
  ctx.drawImage(rimImg, 0, 0);
  const a = wAng + ballRel - Math.PI / 2, br = R * ballR;
  const x = R + Math.cos(a) * br, y = R + Math.sin(a) * br, rr = R * 0.045;
  const bg = ctx.createRadialGradient(x - rr * 0.35, y - rr * 0.35, rr * 0.1, x, y, rr);
  bg.addColorStop(0, '#fff'); bg.addColorStop(0.7, '#dfe6ff'); bg.addColorStop(1, '#8c93b8');
  ctx.save(); ctx.shadowColor = '#ffffff'; ctx.shadowBlur = R * 0.06; ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

let lastT = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
  if (anim) anim(t);
  else if (!reduced()) { wAng += wVel * dt; }
  draw();
  requestAnimationFrame(loop);
}

const easeOutBounce = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };

// Spin the wheel clockwise, ball counter-clockwise, and land the ball in the pocket for n.
function spinTo(n) {
  const dur = reduced() ? 700 : quick ? 1700 : 4600, turns = reduced() ? 1 : quick ? 3 : 6;
  const idx = WHEEL.indexOf(n), target = idx * STEP;
  const rel0 = ballRel;
  let d = ((target - rel0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); // [0, 2pi)
  d = d - 2 * Math.PI * (turns + 1); // always counter-clockwise relative to the wheel
  const w0 = wAng, wTurn = (reduced() ? 0.6 : quick ? 2.2 : 4.2) * Math.PI;
  return new Promise(res => {
    const t0 = performance.now(); let lastPocket = -1, lastTick = 0, lastWhoosh = 0;
    anim = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      ballRel = rel0 + d * e;
      wAng = w0 + wTurn * (1 - Math.pow(1 - k, 2));
      const drop = 0.58;
      ballR = k < drop ? 0.875 : 0.605 + 0.27 * (1 - easeOutBounce(Math.min(1, (k - drop) / (1 - drop) * 1.25)));
      if (k < 0.45 && now - lastWhoosh > 150) { sfx('spin'); lastWhoosh = now; }
      const p = Math.floor((ballRel - target) / STEP);
      if (p !== lastPocket) { if (k > 0.45 && now - lastTick > 55) { sfx('tick'); lastTick = now; } lastPocket = p; }
      if (k >= 1) {
        ballRel = ((target % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); ballR = 0.605;
        wAng = wAng % (2 * Math.PI); anim = null; res();
      }
    };
  });
}

/* ---------- stats / history ---------- */
const hub = $('#hub'), resline = $('#resline');
function pushHist(n) { pushRecent($('#recent'), String(n), COLS[colorOf(n)]); }
function paintStats() {
  const s = session.slice(0, 50), N = s.length || 1;
  const c = { red: 0, black: 0, green: 0 }; s.forEach(n => c[colorOf(n)]++);
  const pct = x => Math.round((x / N) * 100);
  $('#br').style.width = (s.length ? c.red / N * 100 : 0) + '%';
  $('#bz').style.width = (s.length ? c.green / N * 100 : 0) + '%';
  $('#bk').style.width = (s.length ? c.black / N * 100 : 0) + '%';
  $('#lr').textContent = `Red ${pct(c.red)}%`; $('#lz').textContent = `Zero ${pct(c.green)}%`; $('#lk').textContent = `Black ${pct(c.black)}%`;
  $('#hcn').textContent = `last ${s.length} spin${s.length === 1 ? '' : 's'}`;
  const freq = Array(37).fill(0); s.forEach(n => freq[n]++);
  const nums = [...Array(37).keys()];
  const em = n => `<em class="${COLS[colorOf(n)]}">${n}</em>`;
  if (s.length < 5) { $('#hot').innerHTML = '<span>Hot and cold numbers appear after 5 spins.</span>'; return; }
  const hot = nums.filter(n => freq[n]).sort((a, b) => freq[b] - freq[a] || a - b).slice(0, 3);
  const cold = nums.slice().sort((a, b) => freq[a] - freq[b] || a - b).slice(0, 3);
  $('#hot').innerHTML = `<span>Hot ${hot.map(em).join('')}</span><span>Cold ${cold.map(em).join('')}</span>`;
}
// prefill strip with previous roulette results
state.history.filter(x => x.game === 'roulette').slice(0, 14).reverse().forEach(x => { const n = parseInt(x.detail, 10); if (n >= 0 && n <= 36) pushHist(n); });

/* ---------- spin ---------- */
$('#spin').onclick = async () => {
  if (spinning) return;
  const placed = { ...bets }, total = totalOf(placed);
  if (!total) return toast('Tap the table to place chips first.');
  spinning = true; render();
  const round = await startRound('roulette', total);
  if (!round) { spinning = false; render(); return; }
  lastLayout = placed;
  const n = spinFrom(await round.float());
  const payout = payoutFor(placed, n), count = Object.values(placed).filter(Boolean).length, col = colorOf(n);
  unWon(); sfx('bet'); buzz(12);
  hub.className = 'hub'; resline.className = 'resline'; resline.innerHTML = '<small>No more bets</small>';
  if (innerWidth < 900) { const st = $('.stage').getBoundingClientRect(); if (st.top < 50 || st.top > 140) scrollTo({ top: scrollY + st.top - 66, behavior: reduced() ? 'auto' : 'smooth' }); }
  await spinTo(n);
  sfx('stop'); buzz(20);
  $('#hubn').textContent = n; hub.className = `hub show ${col}`;
  session.unshift(n); pushHist(n); paintStats();
  // highlight
  table.classList.add('won');
  winningKeys(n).forEach(k => spots[k].classList.add('hit'));
  for (const k in placed) if (placed[k] && !BETS[k].wins(n)) spots[k].classList.add('lost');
  round.settle(payout, { detail: `${n} ${col} · ${count} bet${count === 1 ? '' : 's'}` });
  if (n === 0 && placed.n0 > 0) unlock('rlt');
  if (payout > 0) {
    resline.className = 'resline w';
    resline.innerHTML = `<small>${n} ${col}</small>Won ${fmtFull(payout)}${payout > total ? ` · +${fmtFull(payout - total)}` : ''}`;
    if (payout <= total) sfx('stop');
    const r = cv.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: payout > total * 5 ? 80 : 36, colors: col === 'red' ? ['#ff3dc8', '#ffd84d', '#fff'] : col === 'green' ? ['#b8ff3b', '#22f0ff', '#fff'] : ['#22f0ff', '#ffd84d', '#fff'], speed: 7, gravity: 0.18 });
    buzz([20, 30, 20]);
    $('#lastwin').textContent = fmtFull(payout);
  } else {
    resline.className = 'resline l';
    resline.innerHTML = `<small>${n} ${col}</small>No win · -${fmtFull(total)}`;
    sfx('lose'); buzz(40);
  }
  spinning = false; render();
};

addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.closest('input,button,a')) { e.preventDefault(); $('#spin').click(); } });
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 120); });
build(); paintStats(); render();
requestAnimationFrame(loop);
