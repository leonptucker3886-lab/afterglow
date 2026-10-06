import { boot, $, $$, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, state } from '/core/ag.js';
import { TABLES, ROWS_MIN, ROWS_MAX, resolve, payoutFor } from '/games/plinko-engine.js';

boot({ nav: 'games' });
gameHeader($('#panel'), { title: 'Starfall Plinko', rules: `<p>Pick a risk level and 8 to 16 rows, set your bet, then hit <b>Drop</b> (or press Space). Each star bounces left or right at every row and lands in a bucket that pays its multiplier.</p><p>The edge buckets are the hottest: up to <b>1,000×</b> on 16 rows, High risk. The centre is cold. Drop as many stars as you like at once (up to 20 in flight) or use Auto-drop.</p><p>Every drop is its own round. Each row's bounce comes from one fair float (below 0.5 goes left, otherwise right), so the landing slot is the number of right bounces. Every table returns about 99% (RTP 98.5–99.5%).</p>` });
const bet = BetControl($('#panel'), { game: 'plinko' });
$('#bet').replaceWith(bet.el);

const MAX_FLY = 20;
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => state.settings.reduced || reducedMQ.matches;

let risk = 'medium', rows = 12;
let balls = [], pending = 0, auto = null, autoN = 25;
let topM = 0, sDrops = 0, sNet = 0;

/* ---------------- canvas + layout ---------------- */
const board = $('#board'), cv = $('#cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1, L = null, bg = null, starSprite = null, pegSprite = null, flashSprite = null;
const flashes = new Map();     // "r:j" -> time of hit
const bucketHit = [];          // slot -> {t, m}
let floats = [], sparks = [], stars = [], shooters = [];

const COL = [[0, [139, 92, 255]], [0.38, [34, 240, 255]], [0.72, [255, 216, 77]], [1, [255, 61, 200]]];
function colAt(d) {
  for (let i = 1; i < COL.length; i++) if (d <= COL[i][0]) {
    const [a, ca] = COL[i - 1], [b, cb] = COL[i], k = (d - a) / (b - a);
    return ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
  }
  return COL[COL.length - 1][1];
}
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const shortX = m => (m >= 1000 ? m / 1000 + 'K' : String(m));

function layout() {
  const n = rows, padX = 10, top = 34;
  const bucketGap = 6;
  let s = Math.min((W - padX * 2) / (n + 2), 70);
  let bucketH = Math.max(24, Math.min(40, s * 0.95));
  const avail = H - top - bucketH - 14;
  let rowH = Math.min(s * 1.4, avail / (n - 1 + 0.85));
  if (rowH < s * 0.8) { s = Math.min(s, rowH / 0.8); bucketH = Math.max(24, Math.min(40, s * 0.95)); }
  const used = (n - 1) * rowH + rowH * 0.85 + bucketH;
  const y0 = top + Math.max(0, (H - top - 14 - used) / 2);
  const cx = W / 2, pegR = Math.max(2, Math.min(5, s * 0.11)), ballR = Math.max(4.5, Math.min(13, s * 0.3));
  const by = y0 + (n - 1) * rowH + rowH * 0.85;
  L = { n, s, rowH, y0, cx, pegR, ballR, by, bucketH, bucketGap };
  L.pegX = (r, j) => cx + (j - (r + 2) / 2) * s;
  L.pegY = r => y0 + r * rowH;
  L.slotX = k => cx + (k - n / 2) * s;
  L.table = TABLES[risk][n];
  bucketHit.length = 0;
  prerender();
}

function sprite(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr); draw(g, size / 2); return c;
}
function starPath(g, x, y, R, r, p = 5) {
  g.beginPath();
  for (let i = 0; i < p * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / p, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}
function prerender() {
  const { ballR, pegR } = L;
  starSprite = sprite(ballR * 5, (g, c) => {
    const gl = g.createRadialGradient(c, c, 0, c, c, c);
    gl.addColorStop(0, 'rgba(255,220,245,.75)'); gl.addColorStop(0.35, 'rgba(255,61,200,.32)'); gl.addColorStop(1, 'rgba(255,61,200,0)');
    g.fillStyle = gl; g.fillRect(0, 0, c * 2, c * 2);
    starPath(g, c, c, ballR * 1.15, ballR * 0.52);
    const f = g.createRadialGradient(c, c - ballR * 0.2, 0, c, c, ballR * 1.15);
    f.addColorStop(0, '#fff'); f.addColorStop(0.55, '#ffe3f6'); f.addColorStop(1, '#ff7ad9');
    g.fillStyle = f; g.fill();
  });
  pegSprite = sprite(pegR * 7, (g, c) => {
    const gl = g.createRadialGradient(c, c, 0, c, c, c);
    gl.addColorStop(0, 'rgba(160,170,255,.35)'); gl.addColorStop(1, 'rgba(139,92,255,0)');
    g.fillStyle = gl; g.fillRect(0, 0, c * 2, c * 2);
    g.beginPath(); g.arc(c, c, pegR, 0, 7); g.fillStyle = '#c9cbff'; g.fill();
  });
  flashSprite = sprite(pegR * 12, (g, c) => {
    const gl = g.createRadialGradient(c, c, 0, c, c, c);
    gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(0.18, 'rgba(120,250,255,.9)'); gl.addColorStop(0.45, 'rgba(34,240,255,.35)'); gl.addColorStop(1, 'rgba(34,240,255,0)');
    g.fillStyle = gl; g.fillRect(0, 0, c * 2, c * 2);
  });
  // static starfield + peg layer
  bg = document.createElement('canvas'); bg.width = W * dpr; bg.height = H * dpr;
  const g = bg.getContext('2d'); g.scale(dpr, dpr);
  const neb = g.createRadialGradient(W * 0.5, L.y0 + (L.by - L.y0) * 0.45, 10, W * 0.5, L.y0 + (L.by - L.y0) * 0.45, Math.max(W, H) * 0.6);
  neb.addColorStop(0, 'rgba(139,92,255,.10)'); neb.addColorStop(0.6, 'rgba(255,61,200,.04)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = neb; g.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 2600; i++) { g.globalAlpha = 0.15 + Math.random() * 0.35; g.fillStyle = Math.random() < 0.15 ? '#ffd6f3' : '#c8d6ff'; g.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  g.globalAlpha = 1;
  for (let r = 0; r < L.n; r++) for (let j = 0; j < r + 3; j++) { const x = L.pegX(r, j), y = L.pegY(r), ps = pegSprite.width / dpr; g.drawImage(pegSprite, x - ps / 2, y - ps / 2, ps, ps); }
  // dispenser
  const dy = L.y0 - L.rowH * 0.9;
  const dg = g.createLinearGradient(L.cx - 30, 0, L.cx + 30, 0); dg.addColorStop(0, 'rgba(255,61,200,0)'); dg.addColorStop(0.5, 'rgba(255,61,200,.7)'); dg.addColorStop(1, 'rgba(255,61,200,0)');
  g.fillStyle = dg; g.fillRect(L.cx - 34, Math.max(4, dy - 6), 68, 2);
  // twinkling stars (animated)
  stars = Array.from({ length: Math.round(W * H / 9000) }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.6, s: 0.6 + Math.random() * 1.2 }));
}

function resize() {
  const r = board.getBoundingClientRect();
  W = Math.max(200, r.width); H = Math.max(240, r.height); dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  layout();
  for (const b of balls) b.path = buildPath(b);   // re-fit in-flight balls (rows locked, so same board)
}
new ResizeObserver(resize).observe(board);

/* ---------------- ball paths ---------------- */
// Each segment: from (x0,y0) to (x1,y1) over d ms with an upward kick k (projectile: y = y0 + A t + B t^2).
function buildPath(b) {
  const { n, s, rowH, ballR, pegR } = L, contact = pegR + ballR * 0.9;
  const hop = reduced() ? 32 : Math.max(120, Math.min(210, 2500 / (n + 1.5)));
  const segs = []; let rights = 0;
  let px = L.cx + b.jit[0] * s * 0.12, py = L.y0 - rowH * 0.9;
  for (let r = 0; r < n; r++) {
    const x = L.pegX(r, rights + 1) + b.jit[r + 1] * s * 0.07, y = L.pegY(r) - contact;
    segs.push({ x0: px, y0: py, x1: x, y1: y, d: r ? hop : hop * 1.6, k: r ? (0.85 + Math.abs(b.jit[r]) * 0.5) : 0, peg: [r, rights + 1] });
    px = x; py = y; rights += b.dirs[r];
  }
  segs.push({ x0: px, y0: py, x1: L.slotX(b.slot), y1: L.by + L.bucketH * 0.35, d: hop * 1.25, k: 0.7, land: true });
  let t = 0; for (const g of segs) { g.t = t; t += g.d; }
  return { segs, total: t };
}

/* ---------------- drop / round lifecycle ---------------- */
function inFlight() { return balls.length + pending; }

async function drop() {
  if (inFlight() >= MAX_FLY) { buzz(8); return false; }
  pending++; lock();
  const amount = bet.value, n = rows, rk = risk;
  const r = await startRound('plinko', amount);
  if (!r) { pending--; lock(); return false; }
  const fl = await r.floats(n);
  const res = resolve(fl, n, rk);
  pending--;
  sfx('bet'); buzz(6);
  const b = { r, n, risk: rk, bet: amount, ...res, born: performance.now(), done: false, trail: [], pegIdx: -1, rot: Math.random() * 6.28,
    jit: Array.from({ length: n + 2 }, () => (Math.random() - 0.5) * 2) };
  b.path = buildPath(b);
  balls.push(b); lock(); kick();
  return true;
}

function land(b) {
  if (b.done) return; b.done = true;
  const { mult, slot, n, risk: rk, bet: amount } = b;
  const payout = payoutFor(amount, mult);
  const bigOverlay = mult >= 10 && !auto && !document.querySelector('.bigwin');
  b.r.settle(payout, { mult, detail: `${n} rows · ${rk} risk · slot ${slot}/${n} · ${fmtX(mult)}`, quiet: !bigOverlay });
  if (b.edge) unlock('plinko');
  // stage feedback
  bucketHit[slot] = { t: performance.now(), m: mult };
  const x = L.slotX(slot), y = L.by;
  const c = colAt(Math.abs(slot - n / 2) / (n / 2));
  const stack = floats.filter(f => f.slot === slot && performance.now() - f.t < 700).length;
  floats.push({ x, y: y - 6 - stack * 14, slot, t: performance.now(), txt: (mult > 1 ? '+' : '') + fmtX(mult), c, big: mult >= 10, small: mult < 1 });
  if (!reduced()) for (let i = 0; i < (mult >= 10 ? 26 : mult > 1 ? 10 : 4); i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 1.2 + Math.random() * (mult >= 10 ? 4 : 2.2);
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: Math.random() < 0.5 ? rgb(c) : '#fff' });
  }
  if (mult >= 10) {
    const rr = cv.getBoundingClientRect();
    burst(rr.left + x, rr.top + y, { count: mult >= 100 ? 90 : 40, colors: ['#ffd84d', '#ff3dc8', '#fff', '#22f0ff'], speed: mult >= 100 ? 12 : 8, angle: -Math.PI / 2, spread: 2.4, gravity: 0.22 });
    if (!bigOverlay) sfx('big');
    buzz([20, 30, 40]);
  } else if (mult > 1) { landSfx('gem'); buzz(8); }
  else landSfx('tick');
  // UI
  pushRecent($('#recent'), fmtX(mult), mult >= 10 ? 'b' : mult > 1 ? 'w' : '');
  const net = payout - amount;
  sDrops++; sNet += net; if (mult > topM) topM = mult;
  const last = $('#last'), row = document.createElement('div');
  row.className = mult >= 10 ? 'b' : mult > 1 ? 'w' : 'l';
  row.textContent = `${n}${rk[0].toUpperCase()} ${fmtX(mult)} ${net >= 0 ? '+' : '−'}${fmtFull(Math.abs(net))}`;
  last.querySelector('small').after(row);
  while (last.children.length > 6) last.lastChild.remove();
  stats();
}

let lastPeg = 0, lastLand = 0;
function pegSfx() { const t = performance.now(); if (t - lastPeg > 55) { lastPeg = t; sfx('peg'); } }
function landSfx(n) { const t = performance.now(); if (t - lastLand > 70) { lastLand = t; sfx(n); } }

/* ---------------- frame loop ---------------- */
let raf = 0;
function kick() { if (!raf) raf = requestAnimationFrame(frame); }
const ease = t => 1 - Math.pow(1 - t, 3);

function frame(now) {
  raf = 0;
  if (!L) return kick();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(bg, 0, 0, W, H);
  const red = reduced();
  // twinkle + shooting stars
  for (const s of stars) { const a = red ? 0.5 : 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(now / 1000 * s.sp + s.p)); ctx.globalAlpha = a; ctx.fillStyle = '#e8ecff'; ctx.fillRect(s.x, s.y, s.s, s.s); }
  ctx.globalAlpha = 1;
  if (!red && Math.random() < 0.004 && shooters.length < 2) shooters.push({ x: Math.random() * W * 0.8, y: Math.random() * H * 0.35, t: now, vx: 5 + Math.random() * 3, vy: 2 + Math.random() * 1.5 });
  shooters = shooters.filter(s => now - s.t < 700);
  for (const s of shooters) {
    const k = (now - s.t) / 700, x = s.x + s.vx * k * 60, y = s.y + s.vy * k * 60;
    const gr = ctx.createLinearGradient(x - s.vx * 8, y - s.vy * 8, x, y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,230,250,${0.7 * (1 - k)})`);
    ctx.strokeStyle = gr; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - s.vx * 8, y - s.vy * 8); ctx.lineTo(x, y); ctx.stroke();
  }
  // idle star at the dispenser
  const dy = Math.max(10, L.y0 - L.rowH * 0.9), ss = starSprite.width / dpr;
  ctx.globalAlpha = (balls.length ? 0.45 : 0.85) + 0.15 * Math.sin(now / 300);
  ctx.save(); ctx.translate(L.cx, dy); ctx.rotate(red ? 0 : now / 1400); ctx.drawImage(starSprite, -ss / 2, -ss / 2, ss, ss); ctx.restore();
  ctx.globalAlpha = 1;

  // peg flashes
  const fs = flashSprite.width / dpr;
  for (const [key, t] of flashes) {
    const k = (now - t) / 380; if (k >= 1) { flashes.delete(key); continue; }
    const [r, j] = key.split(':').map(Number);
    ctx.globalAlpha = 1 - k; const sz = fs * (0.7 + 0.5 * (1 - k));
    ctx.drawImage(flashSprite, L.pegX(r, j) - sz / 2, L.pegY(r) - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;

  drawBuckets(now);

  // balls
  for (const b of balls) {
    const el = now - b.born, P = b.path;
    let i = 0; while (i < P.segs.length - 1 && el >= P.segs[i].t + P.segs[i].d) i++;
    // fire peg hits we crossed (contact = end of segment i-1 = start of segment i)
    for (let q = b.pegIdx + 1; q < P.segs.length; q++) {
      const g = P.segs[q]; if (el < g.t + g.d) break;
      b.pegIdx = q;
      if (g.peg) { const [r, j] = g.peg; flashes.set(r + ':' + j, now); pegSfx(); b.hitAt = now; }
    }
    const g = P.segs[i], t = Math.min(1, Math.max(0, (el - g.t) / g.d));
    const D = g.y1 - g.y0, kk = g.k * Math.max(L.rowH * 0.9, 1), A = -kk, B = D + kk;
    let x, y;
    if (!g.k) { x = g.x0 + (g.x1 - g.x0) * t; y = g.y0 + D * t * t; }
    else { x = g.x0 + (g.x1 - g.x0) * (g.land ? ease(t) * 0.6 + t * 0.4 : t); y = g.y0 + A * t + B * t * t; }
    b.x = x; b.y = y; b.rot += red ? 0 : 0.08 + (b.dirs[Math.max(0, i - 1)] ? 0.06 : -0.12);
    if (!red) { b.trail.push({ x, y }); if (b.trail.length > 12) b.trail.shift(); if (Math.random() < 0.35) sparks.push({ x: x + (Math.random() - 0.5) * L.ballR, y: y + (Math.random() - 0.5) * L.ballR, vx: (Math.random() - 0.5) * 0.4, vy: -0.2 + Math.random() * 0.3, life: 0.8, c: Math.random() < 0.5 ? '#ffd0f0' : '#ffffff', tiny: true }); }
    if (el >= P.total) land(b);
  }
  // trails
  for (const b of balls) {
    const tr = b.trail;
    for (let i = 0; i < tr.length; i++) { const k = (i + 1) / tr.length; ctx.globalAlpha = k * 0.35; ctx.fillStyle = i % 2 ? '#ff3dc8' : '#ffd0f0'; ctx.beginPath(); ctx.arc(tr[i].x, tr[i].y, L.ballR * (0.25 + 0.55 * k), 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // sparks
  for (const p of sparks) { p.x += p.vx; p.y += p.vy; p.vy += p.tiny ? 0.01 : 0.09; p.life -= p.tiny ? 0.035 : 0.022; }
  sparks = sparks.filter(p => p.life > 0);
  if (sparks.length > 500) sparks.splice(0, sparks.length - 500);
  for (const p of sparks) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; const z = p.tiny ? 1.4 : 2.2; ctx.fillRect(p.x - z / 2, p.y - z * 1.5, z, z * 3); ctx.fillRect(p.x - z * 1.5, p.y - z / 2, z * 3, z); }
  ctx.globalAlpha = 1;
  // star balls (squash on contact)
  for (const b of balls) {
    if (b.done) continue;
    const sq = b.hitAt && !red ? Math.max(0, 1 - (now - b.hitAt) / 110) : 0;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(1 + 0.22 * sq, 1 - 0.24 * sq); ctx.rotate(b.rot);
    ctx.drawImage(starSprite, -ss / 2, -ss / 2, ss, ss); ctx.restore();
  }
  balls = balls.filter(b => !b.done);
  // floating labels
  for (const f of floats) {
    const k = (now - f.t) / (red ? 600 : 1300); f.k = k; if (k >= 1) continue;
    const fsz = Math.round(Math.max(13, Math.min(22, L.s * 0.55)) * (f.big ? 1.35 : f.small ? 0.72 : 1));
    ctx.font = `900 ${fsz}px ui-monospace,"SF Mono",Menlo,Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const x = Math.max(fsz * 1.6, Math.min(W - fsz * 1.6, f.x));
    ctx.globalAlpha = (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25) * (f.small ? 0.6 : 1);
    ctx.shadowColor = rgb(f.c); ctx.shadowBlur = 12; ctx.fillStyle = f.big ? '#fff' : rgb(f.c);
    ctx.fillText(f.txt, x, f.y - (red ? 10 : ease(Math.min(1, k * 1.4)) * L.rowH * 2.2));
    ctx.shadowBlur = 0;
  }
  floats = floats.filter(f => f.k === undefined || f.k < 1);
  ctx.globalAlpha = 1;
  if (fly.textContent != balls.length + pending) { fly.textContent = balls.length + pending; lock(); }
  kick();
}

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawBuckets(now) {
  const { n, s, by, bucketH, table } = L, w = s - Math.max(2, s * 0.1);
  const fsz = Math.max(8.5, Math.min(15, s * 0.36));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let k = 0; k <= n; k++) {
    const d = Math.abs(k - n / 2) / (n / 2), c = colAt(d), hit = bucketHit[k];
    const hk = hit ? Math.max(0, 1 - (now - hit.t) / 650) : 0;
    const bounce = hk ? Math.sin((1 - hk) * Math.PI * 3) * hk * Math.min(8, s * 0.22) : 0;
    const x = L.slotX(k) - w / 2, y = by + Math.abs(bounce);
    if (hk) { ctx.globalAlpha = hk * 0.8; ctx.fillStyle = rgb(c, 0.5); ctx.shadowColor = rgb(c); ctx.shadowBlur = 22; rr(ctx, x - 2, y - 2, w + 4, bucketH + 4, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; }
    const gr = ctx.createLinearGradient(0, y, 0, y + bucketH);
    gr.addColorStop(0, rgb(c.map(v => Math.min(255, v + 25)))); gr.addColorStop(1, rgb(c.map(v => v * 0.68)));
    ctx.fillStyle = gr; rr(ctx, x, y, w, bucketH, Math.min(7, w * 0.28)); ctx.fill();
    ctx.strokeStyle = rgb(c.map(v => Math.min(255, v + 60)), 0.7 + 0.3 * hk); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#0a0414';
    const txt = shortX(table[k]);
    let f = fsz; ctx.font = `900 ${f}px ui-monospace,"SF Mono",Menlo,Consolas,monospace`;
    const tw = ctx.measureText(txt).width; if (tw > w - 2) { f = f * (w - 2) / tw; ctx.font = `900 ${f}px ui-monospace,"SF Mono",Menlo,Consolas,monospace`; }
    ctx.fillText(txt, x + w / 2, y + bucketH / 2 + 0.5);
  }
}

/* ---------------- controls ---------------- */
const fly = $('#fly');
function lock() {
  const busy = inFlight() > 0 || !!auto;
  $$('#risk button').forEach(b => (b.disabled = busy));
  $('#rows').disabled = $('#rminus').disabled = $('#rplus').disabled = busy;
  $('#rminus').disabled ||= rows <= ROWS_MIN; $('#rplus').disabled ||= rows >= ROWS_MAX;
  bet.disable(!!auto);
  $$('#autoN button').forEach(b => (b.disabled = !!auto));
  $('#drop').disabled = !!auto;
}
function stats() {
  $('#topm').textContent = topM ? fmtX(topM) : '-';
  $('#sdrops').textContent = fmtFull(sDrops);
  const s = $('#snet'); s.textContent = (sNet > 0 ? '+' : sNet < 0 ? '−' : '') + fmtFull(Math.abs(sNet)); s.style.color = sNet > 0 ? 'var(--l)' : sNet < 0 ? 'var(--r)' : '';
}
function setRows(n) {
  n = Math.max(ROWS_MIN, Math.min(ROWS_MAX, n));
  if (inFlight() || auto || n === rows) return;
  rows = n; $('#rows').value = n; $('#rv').textContent = n; sfx('tick'); layout(); lock();
}
$('#rows').addEventListener('input', e => setRows(+e.target.value));
$('#rminus').onclick = () => setRows(rows - 1);
$('#rplus').onclick = () => setRows(rows + 1);
$('#risk').onclick = e => {
  const b = e.target.closest('button'); if (!b || b.disabled || inFlight() || auto) return;
  sfx('tap'); risk = b.dataset.r; $$('#risk button').forEach(x => x.classList.toggle('on', x === b)); layout();
};
$('#drop').onclick = () => drop();
addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat || auto) return;
  if (e.target.closest?.('input,textarea,select,button,a,.modal,.scrim')) return;
  e.preventDefault(); drop();
});

$('#autoN').onclick = e => {
  const b = e.target.closest('button'); if (!b || auto) return;
  sfx('tap'); autoN = +b.dataset.n; $$('#autoN button').forEach(x => x.classList.toggle('on', x === b)); $('#auto').textContent = `Auto ${autoN}`;
};
$('#auto').onclick = () => (auto ? stopAuto() : runAuto());
async function runAuto() {
  const me = auto = { left: autoN };
  const btn = $('#auto'); btn.className = 'btn pink'; sfx('tap'); lock();
  while (auto === me && me.left > 0) {
    btn.textContent = `Stop · ${me.left}`;
    if (inFlight() >= MAX_FLY) { await sleep(120); continue; }
    if (!(await drop())) break;
    me.left--;
    if (me.left > 0) await new Promise(r => setTimeout(r, 250));
  }
  if (auto === me) stopAuto();
}
function stopAuto() { auto = null; const btn = $('#auto'); btn.className = 'btn lime'; btn.textContent = `Auto ${autoN}`; lock(); }

// Outcomes are fixed at drop time, so if the page is closed mid-flight, settle what's still falling.
addEventListener('pagehide', () => { for (const b of balls) land(b); });

stats(); lock(); kick();
