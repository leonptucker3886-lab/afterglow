import { boot, $, $$, state, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmt, fmtFull, fmtX, unlock, sleep, toast } from '/core/ag.js';
import { K, crashC, multAt, timeFor, floorC, payoutFor, parseAuto, resolveCash } from '/games/liftoff-engine.js';

boot({ nav: 'games' });

gameHeader($('#panel'), { title: 'Liftoff', rules: `<p>Set your bet and hit <b>Launch</b>. The rocket's multiplier climbs from 1.00× until it crashes at a random point.</p><p>Hit <b>Cash out</b> before the crash to win your bet × the live multiplier. If it crashes first, the bet is lost.</p><p><b>Auto cash-out</b> banks you at exactly that multiplier if the rocket reaches it. <b>Auto-launch</b> runs a set number of rounds and needs an auto cash-out.</p><p>Crash point = ⌊99 / (1 − f)⌋ / 100 (capped at 10,000×) from your fair-play float f, so P(crash ≥ x) = 0.99 / x. 99% RTP for any strategy.</p><p>Press <b>Space</b> to launch or cash out.</p>` });
const bet = BetControl($('#panel'), { game: 'liftoff' });
$('#panel').insertBefore(bet.el, $('#panel .field'));

const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => !!state.settings.reduced || reducedMQ.matches;

const go = $('#go'), mx = $('#mx'), sub = $('#sub'), sky = $('#sky'), cv = $('#cv'), ctx = cv.getContext('2d');
const autoInp = $('#auto'), autoBtn = $('#autobtn');

/* ---------- round state ---------- */
// phase: idle | arming | countdown | flight | crashed
let phase = 'idle', round = null, cC = 100, crashT = 0, t0 = 0, aC = 0, cash = null, crashAt = null, cdText = '';
let autoRun = null, autoRounds = 10;
let nextTick = 1.5, nextRise = 2;
const sess = { rounds: 0, best: 0, net: 0 };

const autoC = () => parseAuto(autoInp.value);

function setAuto(v) {
  const c = parseAuto(v);
  autoInp.value = c ? (c / 100).toFixed(2) : '';
  paintAuto();
}
function paintAuto() {
  const c = autoC();
  $('#autohint').textContent = c ? `pays ${fmtFull(payoutFor(bet.value, c))}` : 'off';
  $$('#autochips button').forEach(b => b.classList.toggle('on', c === Math.round(+b.dataset.a * 100)));
}
autoInp.addEventListener('blur', () => setAuto(autoInp.value));
autoInp.addEventListener('keydown', e => e.key === 'Enter' && autoInp.blur());
autoInp.addEventListener('input', paintAuto);
$('#autoclr').onclick = () => { sfx('tap'); setAuto(''); };
$('#autochips').onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); setAuto(b.dataset.a); };
$('#bet').remove();
bet.el.addEventListener('click', () => setTimeout(paintAuto));
bet.el.querySelector('input').addEventListener('blur', () => setTimeout(paintAuto));

$('#rseg').onclick = e => { const b = e.target.closest('button'); if (!b || autoRun) return; sfx('tap'); autoRounds = +b.dataset.n; $$('#rseg button').forEach(x => x.classList.toggle('on', x === b)); };

/* ---------- flow ---------- */
async function launch() {
  if (phase !== 'idle') return;
  phase = 'arming'; paint();
  const r = await startRound('liftoff', bet.value);
  if (!r) { phase = 'idle'; if (autoRun) stopAuto(); paint(); return; }
  const f = await r.float();
  round = r; cC = crashC(f); crashT = timeFor(cC / 100); aC = autoC(); cash = null; crashAt = null;
  nextTick = 1.5; nextRise = 2; flame.length = 0; boom.length = 0; ring = null;
  sfx('bet'); buzz(12);
  if (!reduced()) {
    phase = 'countdown';
    for (const s of ['T-3', 'T-2', 'T-1']) { cdText = s; paint(); sfx('tick'); await sleep(500); }
  }
  t0 = performance.now(); phase = 'flight'; cdText = '';
  sfx('rise'); buzz(20);
  paint(); step();
}

function cashOut() {
  if (phase !== 'flight' || cash) return;
  const t = performance.now() - t0;
  const c = resolveCash(t, cC, aC);
  if (!c) return step(); // already past the crash time: the crash resolves it as a loss
  doCash(c, c === aC && t >= timeFor(aC / 100) ? 'auto' : 'manual');
}

function doCash(c, how) {
  const m = c / 100, payout = payoutFor(round.bet, c);
  cash = { c, t: timeFor(m), payout, how };
  sess.rounds++; sess.net += payout - round.bet; sess.best = Math.max(sess.best, m);
  round.settle(payout, { mult: m, detail: `${how} cash-out @ ${m.toFixed(2)}×` });
  if (m >= 10) unlock('liftoff');
  sfx('cash'); buzz([15, 30, 25]);
  const p = toScreen(cash.t, m), r = cv.getBoundingClientRect();
  burst(r.left + p.x, r.top + p.y, { count: 26, colors: ['#b8ff3b', '#39ff88', '#ffffff'], speed: 6, gravity: 0.12 });
  paint();
}

async function doCrash() {
  if (phase !== 'flight') return;
  phase = 'crashed';
  const m = cC / 100;
  crashAt = { t: crashT, m };
  if (!cash) {
    sess.rounds++; sess.net -= round.bet;
    round.settle(0, { mult: 0, detail: `crashed @ ${m.toFixed(2)}×${aC ? ` · auto ${(aC / 100).toFixed(2)}×` : ''}` });
  }
  pushRecent($('#recent'), m.toFixed(2) + '×', m >= 10 ? 'b' : m >= 2 ? 'w' : '');
  sfx('boom'); buzz(cash ? 30 : [60, 40, 90]);
  explode();
  if (!reduced()) { sky.classList.remove('shake'); void sky.offsetWidth; sky.classList.add('shake'); setTimeout(() => sky.classList.remove('shake'), 460); }
  round = null; phase = 'idle';
  paint();
  if (autoRun) {
    if (autoRun.left !== Infinity && --autoRun.left <= 0) { stopAuto(); toast('Auto-launch finished.', 'l'); return; }
    paint();
    await sleep(1600);
    if (!autoRun || phase !== 'idle') return;
    if (state.coins < bet.value) { stopAuto(); toast("Auto-launch stopped: your balance can't cover the bet.", 'r'); return; }
    launch();
  }
}

// Logic tick: driven by rAF and a timer so a background tab still resolves rounds on time.
function step() {
  if (phase !== 'flight') return;
  const t = performance.now() - t0;
  if (!cash && aC && aC <= cC && t >= timeFor(aC / 100)) doCash(aC, 'auto');
  if (t >= crashT) return doCrash();
  const m = multAt(t);
  if (m >= nextTick) { if (!cash && !document.hidden) sfx('tick'); nextTick = m < 5 ? Math.floor(m * 2 + 1) / 2 : m < 20 ? Math.floor(m) + 1 : Math.floor(m / 5) * 5 + 5; }
  if (m >= nextRise) { if (!cash && !document.hidden) { sfx('rise'); buzz(8); } nextRise = [2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, Infinity].find(x => x > m); }
}
setInterval(step, 100);
document.addEventListener('visibilitychange', step);

function startAuto() {
  if (!autoC()) { toast('Set an auto cash-out (for example 2.00×) to use auto-launch.', 'r'); buzz(30); autoInp.focus(); return; }
  setAuto(autoInp.value);
  autoRun = { left: autoRounds || Infinity };
  sfx('tap'); paint();
  if (phase === 'idle') launch();
}
function stopAuto() { autoRun = null; paint(); }
autoBtn.onclick = () => (autoRun ? (sfx('tap'), stopAuto()) : startAuto());

function primary() {
  if (phase === 'idle' && !autoRun) return launch();
  if (phase === 'flight' && !cash) return cashOut();
  if (phase === 'flight' && cash) { t0 = performance.now() - crashT; step(); } // skip ahead (already settled)
}
go.onclick = primary;
addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat || document.querySelector('.scrim')) return;
  if (e.target.closest?.('input,textarea,select')) return;
  e.preventDefault(); primary();
});
addEventListener('keyup', e => { if (e.code === 'Space' && !e.target.closest?.('input,textarea,select')) e.preventDefault(); });

// Leaving mid-round: resolve deterministically (auto cash-out if it would hit, otherwise a loss) and persist now.
addEventListener('pagehide', () => {
  if (!round || round.done) return;
  const won = aC && aC <= cC;
  round.settle(won ? payoutFor(round.bet, aC) : 0, { mult: won ? aC / 100 : 0, detail: 'left mid-flight' });
  try { localStorage.setItem('afterglow:v1', JSON.stringify(state)); } catch (e) {}
});

/* ---------- panel paint ---------- */
let lastGo = '';
function paint() {
  let label, cls, dis = false;
  if (phase === 'arming' || phase === 'countdown') { label = phase === 'countdown' ? cdText + ' · LAUNCHING' : 'LAUNCHING…'; cls = 'btn big pink'; dis = true; }
  else if (phase === 'flight' && !cash) { label = `CASH OUT ${fmtFull(payoutFor(round.bet, floorC(multAt(performance.now() - t0))))}`; cls = 'btn big lime cash'; }
  else if (phase === 'flight' && cash) { label = `CASHED +${fmtFull(cash.payout)} · SKIP ▸`; cls = 'btn big ghost'; }
  else if (autoRun) { label = `AUTO · ${autoRun.left === Infinity ? '∞' : autoRun.left} LEFT`; cls = 'btn big pri'; dis = true; }
  else { label = 'LAUNCH'; cls = 'btn big pri'; }
  const key = label + cls + dis;
  if (key !== lastGo) { lastGo = key; go.textContent = label; go.className = cls; go.disabled = dis; }
  const busy = phase !== 'idle' || !!autoRun;
  bet.disable(busy);
  autoInp.disabled = busy; $('#autoclr').disabled = busy; $$('#autochips button').forEach(b => (b.disabled = busy));
  $$('#rseg button').forEach(b => (b.disabled = !!autoRun));
  autoBtn.textContent = autoRun ? 'Stop' : 'Start';
  autoBtn.className = autoRun ? 'btn pink' : 'btn';
  $('#srounds').textContent = sess.rounds;
  $('#sbest').textContent = sess.best ? sess.best.toFixed(2) + '×' : '-';
  const n = $('#net'); n.textContent = (sess.net > 0 ? '+' : '') + fmtFull(sess.net); n.className = sess.net > 0 ? 'pos' : sess.net < 0 ? 'neg' : '';
  paintReadout();
}

const LIME = [184, 255, 59], MAG = [255, 61, 200];
const multColor = m => { const k = Math.min(1, Math.max(0, Math.log(m) / Math.log(20))); return `rgb(${LIME.map((a, i) => Math.round(a + (MAG[i] - a) * k)).join(',')})`; };
let lastMx = '', lastSub = '';
function setReadout(text, cls, color, s, scls) {
  if (text + cls + color !== lastMx) { lastMx = text + cls + color; mx.textContent = text; mx.className = 'mx mono ' + cls; mx.style.color = color || ''; }
  if (s + scls !== lastSub) { lastSub = s + scls; sub.textContent = s; sub.className = 'sub ' + scls; }
}
function paintReadout() {
  if (phase === 'countdown') return setReadout(cdText, 'cd', '', 'Ignition sequence', '');
  if (phase === 'arming') return setReadout('1.00×', 'idle', '', 'Fuelling…', '');
  if (phase === 'flight') {
    const m = Math.max(1, floorC(multAt(performance.now() - t0)) / 100);
    return setReadout(m.toFixed(2) + '×', '', multColor(m), cash ? `Cashed out +${fmtFull(cash.payout)} @ ${(cash.c / 100).toFixed(2)}×` : 'Cash out before it crashes', cash ? 'good' : '');
  }
  if (crashAt) return setReadout(crashAt.m.toFixed(2) + '×', 'dead', '', `Crashed @ ${crashAt.m.toFixed(2)}×`, 'bad');
  setReadout('1.00×', 'idle', '', 'Set your bet and launch', '');
}

/* ---------- canvas ---------- */
let W = 0, H = 0, DPR = 1;
function resize() {
  const r = sky.getBoundingClientRect();
  DPR = Math.min(devicePixelRatio || 1, 2); W = Math.max(1, r.width); H = Math.max(1, r.height);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
new ResizeObserver(resize).observe(sky); resize();

const stars = [[0.15, 0.7, 70], [0.4, 1.2, 40], [1, 1.9, 18]].flatMap(([sp, sz, n]) => Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), sp, sz, tw: Math.random() * 6.28 })));
const flame = [], boom = [];
let ring = null, speed = 0.1, view = { t: 9000, m: 2 }, lastFrame = performance.now();

const PAD = () => ({ L: 46, R: W - 22, T: 22, B: H - 30 });
function toScreen(t, m) {
  const p = PAD();
  return { x: p.L + (t / view.t) * (p.R - p.L), y: p.B - ((m - 1) / (view.m - 1)) * (p.B - p.T) };
}
function curT() {
  if (phase === 'flight') return Math.min(performance.now() - t0, crashT);
  if (crashAt) return crashAt.t;
  return 0;
}

function frame(now) {
  const dt = Math.min(64, now - lastFrame); lastFrame = now;
  step();
  const red = reduced();
  const t = curT(), m = multAt(t), flying = phase === 'flight';
  // auto-scaling axes keep the tip around 80% of the plot
  if (flying || crashAt) setView(t, m);
  else view = { t: 9000, m: 2 };
  const target = flying ? 0.6 + Math.log(m) * 1.1 : phase === 'countdown' ? 0.25 : 0.08;
  speed += (target - speed) * Math.min(1, dt / 400);

  ctx.clearRect(0, 0, W, H);
  // starfield (parallax layers drift down-left as the rocket climbs)
  for (const s of stars) {
    if (!red) { s.x -= s.sp * speed * dt * 0.00006; s.y += s.sp * speed * dt * 0.00004; s.x = (s.x + 1) % 1; s.y = s.y % 1; }
    const a = 0.35 + 0.35 * Math.sin(s.tw + now * 0.002 * s.sp);
    ctx.fillStyle = s.sp === 1 ? `rgba(200,250,255,${a + 0.2})` : `rgba(160,162,194,${a})`;
    ctx.fillRect(s.x * W, s.y * H, s.sz, s.sz);
  }
  drawAxes();
  const live = flying || crashAt;
  if (live) drawCurve(t, crashAt && !flying);
  if (cash && live) drawChip();
  // rocket
  const tip = toScreen(t, m);
  let ang;
  if (live) { const p0 = toScreen(Math.max(0, t - 220), multAt(Math.max(0, t - 220))); ang = t > 1 ? Math.atan2(tip.y - p0.y, tip.x - p0.x) : -0.3; }
  else ang = -Math.PI / 2 + 0.55;
  if (!crashAt || flying) {
    const pos = live ? tip : { x: PAD().L + 26, y: PAD().B - 22 };
    const ignite = flying || phase === 'countdown';
    if (ignite && !red) emitFlame(pos, ang, dt, flying ? 1 : 0.4);
    drawParticles(flame, dt, true);
    drawRocket(pos.x, pos.y, ang, ignite, now);
  } else drawParticles(flame, dt, true);
  drawParticles(boom, dt, false);
  if (ring) { ring.life -= dt / 700; if (ring.life <= 0) ring = null; else { ctx.strokeStyle = `rgba(255,77,109,${ring.life})`; ctx.lineWidth = 3 * ring.life + 1; ctx.beginPath(); ctx.arc(ring.x, ring.y, (1 - ring.life) * 90 + 8, 0, 6.283); ctx.stroke(); } }
  if (flying) paint();
  requestAnimationFrame(frame);
}

function setView(t, m) { view = { t: Math.max(9000, t / 0.8), m: Math.max(2, 1 + (m - 1) / 0.78) }; }
function niceY() {
  const p = PAD(), c = [1, 1.2, 1.5, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000], out = [];
  let lastY = Infinity;
  for (const v of c) { if (v > view.m) break; const y = toScreen(0, v).y; if (lastY - y >= 30 || !out.length) { out.push([v, y]); lastY = y; } }
  return out;
}
function drawAxes() {
  const p = PAD();
  ctx.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; ctx.textBaseline = 'middle';
  ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
  for (const [v, y] of niceY()) {
    ctx.strokeStyle = v === 1 ? 'rgba(50,50,90,.9)' : 'rgba(50,50,90,.55)';
    ctx.beginPath(); ctx.moveTo(p.L, y); ctx.lineTo(p.R, y); ctx.stroke();
    ctx.fillStyle = '#6b6d90'; ctx.textAlign = 'right'; ctx.fillText((v >= 1000 ? v / 1000 + 'K' : v) + '×', p.L - 8, y);
  }
  ctx.setLineDash([]);
  const secs = view.t / 1000, stp = [2, 5, 10, 15, 30, 60].find(s => secs / s <= 6) || 60;
  ctx.textAlign = 'center'; ctx.fillStyle = '#6b6d90';
  for (let s = 0; s <= secs; s += stp) { const x = toScreen(s * 1000, 1).x; ctx.fillText(s + 's', x, p.B + 16); }
  ctx.strokeStyle = 'rgba(50,50,90,.9)'; ctx.beginPath(); ctx.moveTo(p.L, p.T); ctx.lineTo(p.L, p.B); ctx.lineTo(p.R, p.B); ctx.stroke();
}
function drawCurve(t, dead) {
  const p = PAD(), N = 90, pts = [];
  for (let i = 0; i <= N; i++) { const ti = (t * i) / N; pts.push(toScreen(ti, multAt(ti))); }
  const top = pts[pts.length - 1].y, col = dead ? '255,77,109' : '34,240,255';
  const g = ctx.createLinearGradient(0, top, 0, p.B);
  g.addColorStop(0, `rgba(${col},.32)`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.beginPath(); ctx.moveTo(pts[0].x, p.B); pts.forEach(q => ctx.lineTo(q.x, q.y)); ctx.lineTo(pts[pts.length - 1].x, p.B); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.lineWidth = 4; ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = `rgb(${col})`;
  ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = 18; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 0; ctx.stroke();
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawChip() {
  const p = PAD(), m = cash.c / 100, q = toScreen(cash.t, m);
  ctx.save();
  ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(184,255,59,.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x, p.B); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#b8ff3b'; ctx.shadowColor = '#b8ff3b'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, 6.283); ctx.fill();
  const l1 = `CASHED OUT +${fmt(cash.payout)}`, l2 = `${m.toFixed(2)}× · ${cash.how}`;
  ctx.font = '800 12px ui-monospace,Menlo,Consolas,monospace';
  const w = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width) + 20, h = 40;
  let x = q.x - w / 2, y = q.y - h - 14;
  x = Math.max(p.L + 4, Math.min(p.R - w, x)); if (y < p.T) y = q.y + 14;
  ctx.shadowBlur = 16; ctx.fillStyle = 'rgba(14,30,6,.92)'; rr(x, y, w, h, 10); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#b8ff3b'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b8ff3b'; ctx.fillText(l1, x + 10, y + 14);
  ctx.font = '700 11px ui-monospace,Menlo,Consolas,monospace'; ctx.fillStyle = '#d6f5a8'; ctx.fillText(l2, x + 10, y + 29);
  ctx.restore();
}
function drawRocket(x, y, ang, lit, now) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const s = W < 500 ? 0.9 : 1.1; ctx.scale(s, s);
  if (lit) { // engine glow
    const fl = 0.8 + 0.2 * Math.sin(now * 0.05);
    const g = ctx.createRadialGradient(-20, 0, 0, -20, 0, 18 * fl);
    g.addColorStop(0, 'rgba(255,246,192,.95)'); g.addColorStop(0.4, 'rgba(255,170,60,.6)'); g.addColorStop(1, 'rgba(255,61,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-20, 0, 18 * fl, 0, 6.283); ctx.fill();
  }
  ctx.shadowColor = '#22f0ff'; ctx.shadowBlur = 12;
  // fins
  ctx.fillStyle = '#8b5cff';
  ctx.beginPath(); ctx.moveTo(-4, -6.5); ctx.lineTo(-17, -15); ctx.lineTo(-15, -5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4, 6.5); ctx.lineTo(-17, 15); ctx.lineTo(-15, 5); ctx.closePath(); ctx.fill();
  // body
  const bg = ctx.createLinearGradient(0, -8, 0, 8); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.55, '#d9dcf2'); bg.addColorStop(1, '#8a8fb8');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(20, 0); ctx.bezierCurveTo(14, -8, 0, -8.5, -14, -6.5); ctx.lineTo(-15, 6.5); ctx.bezierCurveTo(0, 8.5, 14, 8, 20, 0); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // nose cone
  ctx.save(); ctx.clip(); ctx.fillStyle = '#ff3dc8'; ctx.fillRect(10, -10, 12, 20); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(10, -10, 12, 4); ctx.restore();
  // stripe + window
  ctx.fillStyle = '#22f0ff'; ctx.fillRect(-9, -7, 2.4, 14);
  ctx.beginPath(); ctx.arc(2, 0, 3.8, 0, 6.283); ctx.fillStyle = '#0b0b18'; ctx.fill();
  ctx.beginPath(); ctx.arc(2, 0, 2.6, 0, 6.283); ctx.fillStyle = '#22f0ff'; ctx.fill();
  ctx.beginPath(); ctx.arc(1.2, -0.9, 0.9, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill();
  // centre fin + nozzle
  ctx.fillStyle = '#6a3fe0'; ctx.fillRect(-15, -1, 9, 2);
  ctx.fillStyle = '#4a4e70'; ctx.fillRect(-18, -4, 3.5, 8);
  ctx.restore();
}
function emitFlame(pos, ang, dt, power) {
  const n = Math.round((dt / 16) * 3 * power), cx = Math.cos(ang), sy = Math.sin(ang), s = W < 500 ? 0.9 : 1.1;
  const tx = pos.x - cx * 19 * s, ty = pos.y - sy * 19 * s;
  for (let i = 0; i < n; i++) {
    const sp = 0.08 + Math.random() * 0.14, j = (Math.random() - 0.5) * 0.6;
    flame.push({ x: tx, y: ty, vx: -Math.cos(ang + j) * sp, vy: -Math.sin(ang + j) * sp + 0.01, life: 1, dec: 1 / (300 + Math.random() * 350), size: 3 + Math.random() * 4 * power });
  }
  if (flame.length > 260) flame.splice(0, flame.length - 260);
}
const FLAME = [[255, 246, 192], [255, 216, 77], [255, 138, 61], [255, 61, 200]];
function drawParticles(arr, dt, isFlame) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = arr.length - 1; i >= 0; i--) {
    const q = arr[i];
    q.life -= q.dec * dt; if (q.life <= 0) { arr.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (!isFlame) { q.vx *= 0.985; q.vy = q.vy * 0.985 + 0.0004 * dt; }
    let c;
    if (isFlame) { const k = (1 - q.life) * 3, a = Math.min(2, Math.floor(k)), f = k - a; c = FLAME[a].map((v, j) => Math.round(v + (FLAME[a + 1][j] - v) * f)); }
    else c = q.c;
    ctx.fillStyle = `rgba(${c.join(',')},${(isFlame ? 0.75 : 1) * q.life})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.5, q.size * (isFlame ? 0.4 + q.life * 0.6 : q.life)), 0, 6.283); ctx.fill();
  }
  ctx.restore();
}
function explode() {
  setView(crashT, cC / 100); // axes freeze at the crash point (also covers a skip-ahead jump)
  const q = toScreen(crashT, cC / 100), cols = [[255, 61, 200], [255, 77, 109], [255, 216, 77], [255, 255, 255], [255, 138, 61]];
  ring = { x: q.x, y: q.y, life: 1 };
  const n = reduced() ? 0 : 90;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, sp = 0.05 + Math.random() * 0.35;
    boom.push({ x: q.x, y: q.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, dec: 1 / (500 + Math.random() * 700), size: 1.5 + Math.random() * 3.5, c: cols[i % cols.length] });
  }
}

requestAnimationFrame(frame);
paint(); paintAuto();
