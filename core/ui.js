// UI kit + app shell.
import { state, on, fmt, fmtFull, fmtX, xpFor, tierOf, levelReward, lastBet, setLastBet, save } from './store.js';
import { sfx, buzz } from './audio.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = ms => new Promise(r => setTimeout(r, state.settings.reduced ? Math.min(ms, 60) : ms));

export const COIN = `<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ff6ff"/><stop offset="1" stop-color="#ff3dc8"/></linearGradient></defs><path d="M12 1.5l9.1 5.25v10.5L12 22.5l-9.1-5.25V6.75z" fill="#0b0b18" stroke="url(#cg)" stroke-width="2"/><path d="M12 6.5l4.8 2.75v5.5L12 17.5l-4.8-2.75v-5.5z" fill="url(#cg)" opacity=".9"/></svg>`;
export const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22f0ff"/><stop offset="1" stop-color="#ff3dc8"/></linearGradient></defs><circle cx="16" cy="16" r="7" fill="url(#lg)"/><ellipse cx="16" cy="16" rx="14.5" ry="5.5" fill="none" stroke="url(#lg)" stroke-width="2" transform="rotate(-25 16 16)"/></svg>`;
const I = {
  lobby: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  games: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  rewards: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12M12 9C9 9 7 7.5 7.5 5.5S11 4 12 9c1-5 4-5.5 4.5-3.5S15 9 12 9z"/>',
  fair: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
};
export const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* ---------- toasts / modals ---------- */
let toasts;
export function toast(msg, kind = '', ms = 3200) {
  toasts ||= document.body.appendChild(h('<div class="toasts" role="status" aria-live="polite"></div>'));
  const t = toasts.appendChild(h(`<div class="toast ${kind}"></div>`)); t.innerHTML = msg;
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, ms);
}
export function modal(html, { actions = [{ label: 'Close', cls: 'pri' }], dismiss = true, onOpen } = {}) {
  return new Promise(res => {
    const s = h(`<div class="scrim"><div class="modal" role="dialog" aria-modal="true"></div></div>`), m = s.firstChild;
    m.innerHTML = html;
    if (actions.length) { const a = m.appendChild(h('<div class="acts"></div>')); actions.forEach((x, i) => { const b = a.appendChild(h(`<button class="btn ${x.cls || ''}"></button>`)); b.textContent = x.label; b.onclick = () => close(x.value ?? i); }); }
    const close = v => { s.remove(); removeEventListener('keydown', key); res(v); };
    const key = e => e.key === 'Escape' && dismiss && close(null);
    if (dismiss) s.addEventListener('click', e => e.target === s && close(null));
    addEventListener('keydown', key);
    document.body.appendChild(s); onOpen?.(m, close);
    (m.querySelector('.acts .btn') || m).focus?.();
  });
}

/* ---------- number tween ---------- */
export function tween(from, to, ms, fn) {
  if (state.settings.reduced || ms <= 0) return fn(to);
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); fn(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- particles ---------- */
let fx, fctx, parts = [], running = false;
export function burst(x = innerWidth / 2, y = innerHeight / 2, { count = 60, colors = ['#22f0ff', '#ff3dc8', '#b8ff3b', '#ffd84d'], speed = 9, spread = 6.283, angle = 0, gravity = 0.25 } = {}) {
  if (state.settings.reduced) return;
  if (!fx) { fx = document.body.appendChild(h('<canvas id="fx"></canvas>')); fctx = fx.getContext('2d'); }
  const d = Math.min(devicePixelRatio || 1, 2); fx.width = innerWidth * d; fx.height = innerHeight * d; fctx.setTransform(d, 0, 0, d, 0, 0);
  for (let i = 0; i < count; i++) { const a = angle + (Math.random() - 0.5) * spread, v = speed * (0.4 + Math.random() * 0.8); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: colors[i % colors.length], s: 2 + Math.random() * 4, r: Math.random() * 6, g: gravity }); }
  if (!running) { running = true; requestAnimationFrame(loop); }
}
function loop() {
  fctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.99; p.life -= 0.012; p.r += 0.1; fctx.globalAlpha = Math.max(0, p.life); fctx.fillStyle = p.c; fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.r); fctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6); fctx.restore(); }
  fctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(loop); else { running = false; fctx.clearRect(0, 0, innerWidth, innerHeight); }
}
export const confetti = () => { burst(innerWidth * 0.2, innerHeight * 0.6, { count: 70, angle: -1.2, spread: 1.2, speed: 16 }); burst(innerWidth * 0.8, innerHeight * 0.6, { count: 70, angle: -1.95, spread: 1.2, speed: 16 }); };

export function bigWin(amount, mult) {
  const tier = mult >= 500 ? 'COSMIC WIN' : mult >= 100 ? 'EPIC WIN' : mult >= 25 ? 'MEGA WIN' : 'BIG WIN';
  const o = document.body.appendChild(h(`<div class="bigwin" style="pointer-events:auto"><div class="bw"><div class="t">${tier}</div><div class="a mono">+0</div><div class="m">${fmtX(mult)}</div></div></div>`));
  sfx('big'); buzz([30, 40, 30, 40, 80]); confetti();
  tween(0, amount, 1400, v => (o.querySelector('.a').textContent = '+' + fmtFull(v)));
  const close = () => o.remove();
  o.onclick = close; setTimeout(close, 2800);
}

/* ---------- bet control ---------- */
export function BetControl(host, { game, min = 10, max = 1_000_000, value, label = 'Bet', onChange } = {}) {
  const el = host.appendChild(h(`<div class="field betctl"><label>${label}<span class="faint mono" data-k="hint"></span></label>
    <div class="inp">${COIN}<input inputmode="numeric" aria-label="${label} amount" autocomplete="off"><button type="button" data-a="half">½</button><button type="button" data-a="dbl">2×</button></div>
    <div class="chips" style="margin-top:8px"><button type="button" data-v="100">100</button><button type="button" data-v="1000">1K</button><button type="button" data-v="10000">10K</button><button type="button" data-v="100000">100K</button><button type="button" data-a="max">Max</button></div></div>`));
  const inp = $('input', el);
  let v = clamp(value ?? lastBet(game, 100));
  function clamp(n) { n = Math.floor(+String(n).replace(/[^\d]/g, '') || 0); return Math.max(min, Math.min(max, n)); }
  function set(n, quiet) { v = clamp(n); inp.value = fmtFull(v); $('[data-k=hint]', el).textContent = v > state.coins ? 'Not enough Glow' : ''; if (game) setLastBet(game, v); if (!quiet) onChange?.(v); }
  inp.addEventListener('focus', () => { inp.value = v; inp.select(); });
  inp.addEventListener('blur', () => set(inp.value));
  inp.addEventListener('keydown', e => e.key === 'Enter' && inp.blur());
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; sfx('tap');
    if (b.dataset.v) set(+b.dataset.v); else if (b.dataset.a === 'half') set(v / 2); else if (b.dataset.a === 'dbl') set(v * 2); else if (b.dataset.a === 'max') set(Math.min(max, Math.max(min, state.coins)));
  });
  on('coins', () => set(v, true));
  set(v, true);
  return {
    el, get value() { return v; }, set value(n) { set(n); },
    disable(d) { inp.disabled = d; $$('button', el).forEach(b => (b.disabled = d)); },
  };
}

/* ---------- recent results strip ---------- */
export function pushRecent(host, text, kind = '') {
  const s = h(`<span class="${kind}"></span>`); s.textContent = text; host.prepend(s);
  while (host.children.length > 14) host.lastChild.remove();
}

/* ---------- game header ---------- */
export function gameHeader(host, { title, rules = '' }) {
  const el = h(`<div class="ghead"><a class="back" href="/" aria-label="Back to lobby">${icon('back')}</a><h1></h1><button class="iconbtn info" aria-label="How to play">${icon('info')}</button></div>`);
  $('h1', el).textContent = title;
  $('.info', el).onclick = () => modal(`<h2>${esc(title)}</h2><div class="dim" style="font-size:14px">${rules}</div><p class="faint" style="font-size:12px;margin-top:14px">Play money only. Outcomes use the fair-play seeds shown on the <a href="/fair.html">Fair play</a> page.</p>`);
  host.prepend(el); return el;
}

/* ---------- shell ---------- */
export function mountShell(active = '') {
  document.body.classList.toggle('reduced', !!state.settings.reduced);
  const top = h(`<header class="topbar"><a class="logo" href="/" aria-label="AFTERGLOW lobby">${LOGO}<span class="lt">AFTER<b>GLOW</b></span></a>
    <nav class="tnav">${[['lobby', '/', 'Lobby'], ['games', '/#games', 'Games'], ['rewards', '/rewards.html', 'Rewards'], ['fair', '/fair.html', 'Fair play'], ['profile', '/profile.html', 'Profile']].map(([k, u, l]) => `<a href="${u}" class="${k === active ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <div class="tsp"></div>
    <div class="bal" title="Glow Coins (play money)">${COIN}<span class="amt mono"></span><a class="plus" href="/rewards.html" aria-label="Free Glow" style="display:grid;place-items:center">+</a></div>
    <button class="lvl" aria-label="Level"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#0e0e1c" stroke="#22223d" stroke-width="4"/><circle class="ring" cx="20" cy="20" r="17" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="106.8" stroke-dashoffset="106.8"/></svg><span></span></button></header>`);
  document.body.prepend(top);
  const bn = h(`<nav class="bnav" aria-label="Main">${[['lobby', '/', 'Lobby'], ['games', '/#games', 'Games'], ['rewards', '/rewards.html', 'Rewards'], ['fair', '/fair.html', 'Fair'], ['profile', '/profile.html', 'Profile']].map(([k, u, l]) => `<a href="${u}" class="${k === active ? 'on' : ''}" data-k="${k}">${icon(k)}<span>${l}</span></a>`).join('')}</nav>`);
  document.body.appendChild(bn);
  if (innerWidth < 380) $('.lt', top).style.display = 'none';

  const amt = $('.amt', top), bal = $('.bal', top); let shown = state.coins, ft;
  amt.textContent = fmt(shown);
  on('coins', ({ delta }) => {
    const to = state.coins; tween(shown, to, 600, x => (amt.textContent = fmt(x))); shown = to;
    if (delta) { bal.classList.remove('up', 'down'); void bal.offsetWidth; bal.classList.add(delta > 0 ? 'up' : 'down'); clearTimeout(ft); ft = setTimeout(() => bal.classList.remove('up', 'down'), 700); }
  });
  const lv = $('.lvl', top);
  const paintLvl = () => { const t = tierOf(state.level), k = state.xp / xpFor(state.level); $('span', lv).textContent = state.level; const r = $('.ring', lv); r.style.stroke = t[2]; r.style.filter = `drop-shadow(0 0 4px ${t[2]})`; r.setAttribute('stroke-dashoffset', 106.8 * (1 - k)); };
  paintLvl(); on('change', paintLvl);
  lv.onclick = () => levelModal();

  on('level', ({ level, reward, tier }) => { sfx('level'); buzz([20, 30, 20]); confetti(); toast(`<b style="color:${tier[2]}">Level ${level}</b> · ${tier[1]} tier · +${fmtFull(reward)} Glow`, 'l', 4500); });
  on('achievement', ({ name, reward }) => { sfx('win'); toast(`🏆 <b>${esc(name)}</b>${reward ? ` · +${fmtFull(reward)} Glow` : ''}`, 'y', 4500); });
  on('round', r => { if (r.quiet || !r.payout) return; if (r.mult >= 10) bigWin(r.payout, r.mult); else if (r.profit > 0) sfx('win'); });
  on('broke', ({ bet }) => {
    if (state.coins < 10) modal(`<h2>Out of Glow</h2><p class="dim">No worries, it's play money. Grab a free refuel on the Rewards page.</p>`, { actions: [{ label: 'Later', value: 0 }, { label: 'Get free Glow', cls: 'pri', value: 1 }] }).then(v => v === 1 && (location.href = '/rewards.html'));
    else { toast(`Not enough Glow for a ${fmtFull(bet)} bet.`, 'r'); buzz(30); }
  });
  rewardDot();
  ageGate(); reminder();
}

export function levelModal() {
  const t = tierOf(state.level), need = xpFor(state.level), k = state.xp / need;
  modal(`<span class="pill" style="color:${t[2]}">${t[1]} tier</span><h2 style="margin-top:10px">Level ${state.level}</h2>
    <div style="height:10px;border-radius:6px;background:var(--line);overflow:hidden;margin:12px 0 6px"><i style="display:block;height:100%;width:${(k * 100).toFixed(1)}%;background:${t[2]};box-shadow:0 0 12px ${t[2]}"></i></div>
    <div class="stat-row"><span>XP</span><b>${fmtFull(state.xp)} / ${fmtFull(need)}</b></div>
    <div class="stat-row"><span>Next level reward</span><b>+${fmtFull(levelReward(state.level + 1))} Glow</b></div>
    <p class="faint" style="font-size:13px">You earn 1 XP for every 10 Glow wagered, win or lose. Tiers unlock at levels 5, 10, 20, 35, 50 and 75.</p>`);
}

function rewardDot() {
  import('./bonus.js').then(b => {
    const paint = () => { const d = $('.bnav [data-k=rewards]'); if (!d) return; const ready = b.dailyReady() || b.dropReady(); const dot = $('.dot', d); if (ready && !dot) d.appendChild(h('<i class="dot"></i>')); if (!ready && dot) dot.remove(); };
    paint(); setInterval(paint, 30000); on('change', paint);
  });
}

function ageGate() {
  if (state.ageOk) return;
  modal(`<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">${LOGO.replace('<svg', '<svg width="34" height="34"')}<h2 style="margin:0">Welcome to AFTER<span style="color:var(--p)">GLOW</span></h2></div>
    <p class="dim">A free-to-play social casino. Here's the deal:</p>
    <ul class="dim" style="padding-left:18px;font-size:14px;margin:8px 0">
      <li>You must be <b style="color:var(--txt)">18 or older</b>.</li>
      <li>Glow Coins are <b style="color:var(--txt)">play money</b>. They can't be bought, sold, transferred or cashed out, and have no real-world value.</li>
      <li>Winning here doesn't mean you'll win at real-money gambling.</li>
    </ul>
    <p class="faint" style="font-size:12.5px">By continuing you agree to the <a href="/terms.html">Terms</a> and <a href="/terms.html#privacy">Privacy policy</a>.</p>`,
    { dismiss: false, actions: [{ label: 'Leave', value: 0 }, { label: "I'm 18+, let's play", cls: 'pri', value: 1 }] })
    .then(v => { if (v === 1) { state.ageOk = true; save(); toast(`${COIN.replace('class="coin"', 'class="coin" style="width:16px;display:inline;vertical-align:-3px"')} <b>10,000 Glow</b> starter pack added`, 'l'); } else location.href = 'https://www.leonlink.net'; });
}

function reminder() {
  const k = 'ag:session'; let s = +sessionStorage.getItem(k); if (!s) { s = Date.now(); sessionStorage.setItem(k, s); }
  setInterval(() => {
    const mins = Math.floor((Date.now() - s) / 60000), every = state.settings.reminder;
    if (every && mins > 0 && mins % every === 0 && sessionStorage.getItem('ag:rem') != mins) { sessionStorage.setItem('ag:rem', mins); toast(`⏱ You've been playing for ${mins} minutes. Good time for a break?`, 'p', 7000); }
  }, 30000);
}

export function mountFooter() {
  document.body.appendChild(h(`<footer class="foot"><div><a href="/terms.html">Terms</a><a href="/terms.html#privacy">Privacy</a><a href="/terms.html#responsible">Responsible play</a><a href="/fair.html">Fair play</a><a href="https://www.leonlink.net">LeonLink</a></div>
    <p>AFTERGLOW is a free-to-play social casino for adults 18+. Glow Coins are play money with no cash value. They can't be purchased, redeemed or exchanged for real money or prizes. No purchase necessary. Practice or success at social casino gaming doesn't imply future success at real-money gambling.</p><p>© ${new Date().getFullYear()} LeonLink</p></footer>`));
}
