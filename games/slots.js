import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, tween, modal, state } from '/core/ag.js';
import * as E from '/games/slots-engine.js';

boot({ nav: 'games' });

/* ---------- original SVG symbol art (sprite) ---------- */
const star = (cx, cy, n, r1, r2, rot = -90) => Array.from({ length: n * 2 }, (_, i) => { const a = (rot + i * 180 / n) * Math.PI / 180, r = i % 2 ? r2 : r1; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
const ART = {
  d: `<polygon points="50,8 88,40 50,93 12,40" fill="url(#g-d)" stroke="#d8fdff" stroke-width="3" stroke-linejoin="round"/><path d="M12 40h76M31 40L50 8l19 32M31 40l19 53 19-53" fill="none" stroke="#063c48" stroke-width="2.4" stroke-linejoin="round" opacity=".75"/><polygon points="50,12 66,38 34,38" fill="#fff" opacity=".35"/>`,
  t: `<polygon points="50,10 93,86 7,86" fill="url(#g-t)" stroke="#efffc9" stroke-width="3.5" stroke-linejoin="round"/><polygon points="50,40 70,75 30,75" fill="#203a00" opacity=".55"/><polygon points="50,18 60,36 40,36" fill="#fff" opacity=".45"/>`,
  c: `<circle cx="50" cy="50" r="40" fill="url(#g-c)" stroke="#ffd0f3" stroke-width="3"/><circle cx="50" cy="50" r="22" fill="none" stroke="#5a0742" stroke-width="5" opacity=".55"/><ellipse cx="36" cy="32" rx="12" ry="7" fill="#fff" opacity=".55" transform="rotate(-30 36 32)"/>`,
  s: `<rect x="12" y="12" width="76" height="76" rx="16" fill="url(#g-s)" stroke="#e6dcff" stroke-width="3"/><rect x="31" y="31" width="38" height="38" rx="7" fill="#25105e" opacity=".6"/><path d="M22 30q2-8 10-8h22" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".5"/>`,
  P: `<g transform="rotate(-20 50 50)"><path d="M3 52A47 14 0 0 1 97 52" fill="none" stroke="url(#g-ring)" stroke-width="6"/><circle cx="50" cy="50" r="29" fill="url(#g-p)"/><g clip-path="url(#cp-p)" opacity=".45"><rect x="10" y="38" width="80" height="6" fill="#ff3dc8"/><rect x="10" y="52" width="80" height="4" fill="#fff3b0"/><rect x="10" y="61" width="80" height="7" fill="#c21d97"/></g><ellipse cx="40" cy="36" rx="9" ry="5" fill="#fff" opacity=".5" transform="rotate(-25 40 36)"/><path d="M3 52A47 14 0 0 0 97 52" fill="none" stroke="url(#g-ring)" stroke-width="6"/></g>`,
  C: `<path d="M53 25Q30 55 6 94Q45 74 75 47Z" fill="url(#g-tail)"/><path d="M58 30Q40 58 22 86" stroke="#fff" stroke-width="2" opacity=".55" fill="none"/><circle cx="65" cy="35" r="18" fill="url(#g-cm)" stroke="#e9feff" stroke-width="2.5"/><circle cx="60" cy="30" r="6" fill="#fff" opacity=".85"/><polygon points="${star(86, 74, 4, 7, 2)}" fill="#ffd84d"/><polygon points="${star(22, 22, 4, 5, 1.5)}" fill="#fff"/>`,
  A: `<path d="M36 26L27 9M64 26L73 9" stroke="#9ce82a" stroke-width="4" stroke-linecap="round"/><circle cx="27" cy="9" r="5.5" fill="#ff3dc8"/><circle cx="73" cy="9" r="5.5" fill="#22f0ff"/><path d="M50 20C77 20 88 38 86 56C84 76 66 92 50 92C34 92 16 76 14 56C12 38 23 20 50 20Z" fill="url(#g-a)" stroke="#e8ffc0" stroke-width="2.5"/><ellipse cx="34" cy="54" rx="11" ry="15" fill="#0b0b18" transform="rotate(-24 34 54)"/><ellipse cx="66" cy="54" rx="11" ry="15" fill="#0b0b18" transform="rotate(24 66 54)"/><circle cx="31" cy="48" r="4" fill="#fff"/><circle cx="63" cy="48" r="4" fill="#fff"/><circle cx="37" cy="60" r="1.8" fill="#22f0ff"/><circle cx="69" cy="60" r="1.8" fill="#22f0ff"/><path d="M43 77q7 6 14 0" stroke="#173300" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="24" cy="70" r="4" fill="#ff3dc8" opacity=".5"/><circle cx="76" cy="70" r="4" fill="#ff3dc8" opacity=".5"/>`,
  U: `<path d="M34 62L18 96H82L66 62Z" fill="url(#g-beam)"/><path d="M30 46A20 20 0 0 1 70 46Z" fill="url(#g-dome)" stroke="#c9fbff" stroke-width="2"/><ellipse cx="44" cy="36" rx="5" ry="3" fill="#fff" opacity=".7"/><ellipse cx="50" cy="52" rx="44" ry="14" fill="url(#g-u)" stroke="#f0eaff" stroke-width="2.5"/><ellipse cx="50" cy="49" rx="30" ry="5" fill="#fff" opacity=".22"/><circle cx="20" cy="54" r="3.6" fill="#ffd84d"/><circle cx="35" cy="58" r="3.6" fill="#ff3dc8"/><circle cx="50" cy="60" r="3.6" fill="#22f0ff"/><circle cx="65" cy="58" r="3.6" fill="#b8ff3b"/><circle cx="80" cy="54" r="3.6" fill="#ffd84d"/>`,
  W: `<polygon points="${star(50, 42, 8, 40, 15, -90)}" fill="url(#g-w)" stroke="#fff6c8" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="42" r="11" fill="#fff"/><rect x="14" y="68" width="72" height="24" rx="12" fill="#2a0b4a" stroke="#ffd84d" stroke-width="2.5"/><text x="50" y="86.5" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="17" letter-spacing="2" fill="#ffd84d">NOVA</text>`,
  X: `<circle cx="50" cy="50" r="44" fill="url(#g-x)"/><g fill="none" stroke-linecap="round"><path d="M50 10C78 10 92 34 84 56" stroke="#ff3dc8" stroke-width="5"/><path d="M90 50C90 78 66 92 44 84" stroke="#8b5cff" stroke-width="5"/><path d="M50 90C22 90 8 66 16 44" stroke="#22f0ff" stroke-width="5"/><path d="M10 50C10 22 34 8 56 16" stroke="#ff3dc8" stroke-width="5"/><path d="M50 24C66 24 74 36 70 50" stroke="#ffd84d" stroke-width="3.5"/><path d="M50 76C34 76 26 64 30 50" stroke="#ffd84d" stroke-width="3.5"/></g><circle cx="50" cy="50" r="12" fill="#05050a" stroke="#fff" stroke-width="1.5" opacity=".9"/>`,
};
const DEFS = `<defs>
<linearGradient id="g-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9fcff"/><stop offset=".5" stop-color="#22f0ff"/><stop offset="1" stop-color="#0086a8"/></linearGradient>
<linearGradient id="g-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaffb5"/><stop offset=".55" stop-color="#b8ff3b"/><stop offset="1" stop-color="#5aa100"/></linearGradient>
<radialGradient id="g-c" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#ffc4f0"/><stop offset=".5" stop-color="#ff3dc8"/><stop offset="1" stop-color="#7d0a5e"/></radialGradient>
<linearGradient id="g-s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c7b3ff"/><stop offset=".5" stop-color="#8b5cff"/><stop offset="1" stop-color="#3f1aa8"/></linearGradient>
<radialGradient id="g-p" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#ffb43d"/><stop offset="1" stop-color="#d1287a"/></radialGradient>
<linearGradient id="g-ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22f0ff"/><stop offset=".5" stop-color="#e6fdff"/><stop offset="1" stop-color="#8b5cff"/></linearGradient>
<clipPath id="cp-p"><circle cx="50" cy="50" r="29"/></clipPath>
<linearGradient id="g-tail" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ff8ff"/><stop offset=".45" stop-color="#8b5cff" stop-opacity=".75"/><stop offset="1" stop-color="#ff3dc8" stop-opacity="0"/></linearGradient>
<radialGradient id="g-cm" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#7ff6ff"/><stop offset="1" stop-color="#1a9fd0"/></radialGradient>
<radialGradient id="g-a" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="#e2ff9e"/><stop offset=".55" stop-color="#8be22a"/><stop offset="1" stop-color="#2f8a12"/></radialGradient>
<linearGradient id="g-dome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4fdff"/><stop offset="1" stop-color="#22a8d0" stop-opacity=".85"/></linearGradient>
<linearGradient id="g-u" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3dcff"/><stop offset=".5" stop-color="#9b7cff"/><stop offset="1" stop-color="#3b1d8f"/></linearGradient>
<linearGradient id="g-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8ff3b" stop-opacity=".7"/><stop offset="1" stop-color="#b8ff3b" stop-opacity="0"/></linearGradient>
<radialGradient id="g-w" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#ffe98a"/><stop offset=".8" stop-color="#ffb43d"/><stop offset="1" stop-color="#ff3dc8"/></radialGradient>
<radialGradient id="g-x" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000"/><stop offset=".35" stop-color="#1a0638"/><stop offset=".75" stop-color="#5a1490"/><stop offset="1" stop-color="#ff3dc8" stop-opacity=".2"/></radialGradient>
</defs>`;
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${Object.entries(ART).map(([k, v]) => `<symbol id="sym-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#sym-${k}"/></svg>`;
const cellHTML = k => `<div class="cell k-${k}">${icon(k)}</div>`;

/* ---------- rules / paytable ---------- */
const ORDER = ['P', 'C', 'A', 'U', 's', 'c', 't', 'd'];
const LINE_COLORS = ['#22f0ff', '#ff3dc8', '#b8ff3b', '#ffd84d', '#8b5cff', '#39ff88', '#ff8a3d', '#5ff6ff', '#ff6fd7', '#d4ff7a'];
function payTable(bet) {
  const lb = bet / E.LINES_N, v = (m, total) => bet ? fmtFull(Math.floor((total ? bet : lb) * m)) : `${m}×`;
  const unit = bet ? `Pays shown in Glow for a total bet of ${fmtFull(bet)} (line bet ${fmtFull(lb)}${lb % 1 ? '…' : ''}).` : 'Line pays are multiples of the line bet (total bet ÷ 20).';
  const rows = ORDER.map(k => `<div class="pr">${icon(k)}<div class="pv">${[5, 4, 3].map(n => `<i>${n}×</i>${v(E.PAYS[k][n - 3])}`).join('<br>')}</div></div>`).join('');
  const lines = E.LINES.map((L, i) => `<div><span>${i + 1}</span><svg viewBox="0 0 50 30">${[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${c * 10 + 1}" y="${r * 10 + 1}" width="8" height="8" rx="1.5" fill="${L[c] === r ? LINE_COLORS[i % 10] : '#22223d'}"/>`).join('')).join('')}</svg></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">${unit}</p>
  <div class="ptab">${rows}
    <div class="pr wide">${icon('W')}<div class="pv txt"><b style="color:var(--y)">NOVA WILD</b> lands on reels 2, 3 and 4 only and substitutes for every symbol except the wormhole.</div></div>
    <div class="pr wide">${icon('X')}<div class="pv txt"><b style="color:var(--p)">WORMHOLE SCATTER</b> pays anywhere, × total bet: 5 → ${v(E.SCATTER_PAYS[2], 1)} + 20 free spins, 4 → ${v(E.SCATTER_PAYS[1], 1)} + 12 free spins, 3 → ${v(E.SCATTER_PAYS[0], 1)} + 8 free spins.</div></div>
  </div>
  <p style="margin:6px 0">Free spins: all wins ×${E.FS_MULT}. 3+ wormholes retrigger more spins (up to ${E.FS_CAP} per round). The base spin plus its free spins count as one round.</p>
  <div class="lab">20 paylines</div><div class="plines">${lines}</div>`;
}
gameHeader($('#panel'), { title: 'Nebula Nights', rules: `<p>Choose your <b>total bet</b> (spread across 20 fixed paylines) and spin. Wins need 3, 4 or 5 matching symbols on a payline, left to right starting from reel 1. Only the highest win per line pays; wins on different lines add up.</p>${payTable(0)}<p>Theoretical RTP about 96.2% (10M-spin simulation). Hit frequency about 32%; free spins trigger about 1 in 220 spins.</p>` });

/* ---------- controls ---------- */
const bet = BetControl($('#betslot'), { game: 'slots', min: 20, label: 'Total bet', onChange: paintBet });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:slots:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:slots:turbo', turboEl.checked ? '1' : '0'); };
let autoN = 10, autoLeft = 0, busy = false, last = 0;
$('#aseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy || autoLeft) return; sfx('tap'); autoN = +b.dataset.n; $$('#aseg button').forEach(x => x.classList.toggle('on', x === b)); };
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTable(bet.value)}`); };

function paintBet() { $('#totbet').textContent = fmtFull(bet.value); $('#linebet').textContent = (bet.value / 20 % 1 ? (bet.value / 20).toFixed(2) : fmtFull(bet.value / 20)) + ' × 20'; }
function paint() {
  const spin = $('#spin'), auto = $('#auto');
  if (autoLeft) { spin.textContent = `STOP · ${autoLeft}`; spin.className = 'btn big auto'; spin.disabled = false; auto.textContent = 'Stop'; auto.disabled = false; }
  else { spin.textContent = 'SPIN'; spin.className = 'btn big pri'; spin.disabled = busy; auto.textContent = 'Auto'; auto.disabled = busy; }
  bet.disable(busy || !!autoLeft);
  $$('#aseg button').forEach(b => (b.disabled = busy || !!autoLeft));
  paintBet();
}

/* ---------- reels ---------- */
const reelsEl = $('#reels'), linesSvg = $('#lines'), frame = $('#frame');
const reels = [];
let grid = E.windowAt([3, 8, 14, 20, 26]);
for (let i = 0; i < E.REELS; i++) {
  const el = reelsEl.appendChild(h(`<div class="reel"><div class="strip"></div></div>`));
  reels.push({ el, strip: $('.strip', el) });
  setStrip(i, prevSym(i, [3, 8, 14, 20, 26][i]), grid[i], nextSym(i, [3, 8, 14, 20, 26][i]));
}
function prevSym(i, stop) { const s = E.STRIPS[i]; return s[(stop - 1 + s.length) % s.length]; }
function nextSym(i, stop) { const s = E.STRIPS[i]; return s[(stop + 3) % s.length]; }
// Resting strip: [above, row0, row1, row2, below], translated so rows 0-2 are visible.
function setStrip(i, above, col, below) {
  const st = reels[i].strip; st.getAnimations().forEach(a => a.cancel());
  st.innerHTML = [above, ...col, below].map(cellHTML).join('');
  st.style.transform = 'translateY(-20%)';
}
const cellAt = (i, r) => reels[i].strip.children[1 + r];
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;

async function animateSpin(res) {
  const turbo = turboEl.checked, red = reduced();
  clearWins();
  const perCell = turbo ? 32 : 46;
  // schedule stop times; anticipation once 2 scatters have landed on earlier reels
  const times = []; let t = 0, scat = 0;
  for (let i = 0; i < E.REELS; i++) {
    const anticipate = scat >= 2;
    t = i === 0 ? (turbo ? 320 : 720) : t + (turbo ? 110 : 230) + (anticipate ? (turbo ? 900 : 1500) : 0);
    times.push({ t: red ? 120 + i * 70 : t, anticipate: anticipate && !red });
    scat += res.grid[i].includes('X') ? 1 : 0;
  }
  sfx('spin');
  const spinT = setInterval(() => sfx('spin'), turbo ? 180 : 260);
  const anims = res.grid.map((col, i) => {
    const { strip, el } = reels[i], S = E.STRIPS[i], n = S.length, stop = res.stops[i];
    const old = [...strip.children].slice(1, 4).map(c => c.classList[1].slice(2));
    const F = Math.max(4, Math.round(times[i].t / perCell));
    const filler = Array.from({ length: F }, (_, j) => S[(stop + 3 + j) % n]);
    const seq = [S[(stop - 1 + n) % n], ...col, ...filler, ...old, 'd'];
    strip.getAnimations().forEach(a => a.cancel());
    strip.innerHTML = seq.map(cellHTML).join('');
    const N = seq.length, from = -(N - 4) / N * 100, to = -1 / N * 100;
    if (!red) el.classList.add('spinning');
    const a = strip.animate([{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
      { duration: times[i].t, easing: red ? 'linear' : 'cubic-bezier(.35,.05,.35,1.06)', fill: 'forwards' });
    if (!red) setTimeout(() => el.classList.remove('spinning'), Math.max(0, times[i].t - (turbo ? 90 : 160)));
    return a;
  });
  for (let i = 0; i < E.REELS; i++) {
    if (times[i].anticipate) {
      // light the reel up while it keeps spinning a little longer
      await sleep(Math.max(0, times[i].t - times[i - 1].t - (turbo ? 900 : 1500)) + 20);
      reels[i].el.classList.add('antic'); sfx('rise'); buzz(15);
    }
    await anims[i].finished.catch(() => {});
    reels[i].el.classList.remove('antic', 'spinning');
    setStrip(i, prevSym(i, res.stops[i]), res.grid[i], nextSym(i, res.stops[i]));
    sfx('stop'); buzz(8);
    if (res.grid[i].includes('X')) { sfx('reveal'); res.grid[i].forEach((g, r) => g === 'X' && cellAt(i, r).classList.add('land')); }
  }
  clearInterval(spinT);
  grid = res.grid;
}

function clearWins() {
  linesSvg.innerHTML = ''; reelsEl.classList.remove('won');
  $$('.cell.win', reelsEl).forEach(c => c.classList.remove('win'));
  $('#winbox').classList.remove('on');
}
function centers() {
  const fr = frame.getBoundingClientRect();
  linesSvg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`);
  return reels.map(r => { const b = r.el.getBoundingClientRect(), c = b.width; return { x: b.left - fr.left + c / 2, y: row => b.top - fr.top + c * (row + 0.5), c }; });
}
function showWins(res) {
  if (!res.lines.length && !res.scatter.win) return;
  reelsEl.classList.add('won');
  const C = centers();
  for (const w of res.lines) {
    const L = E.LINES[w.line], pts = L.map((r, i) => `${C[i].x.toFixed(1)},${C[i].y(r).toFixed(1)}`).join(' ');
    let len = 0; for (let i = 1; i < 5; i++) len += Math.hypot(C[i].x - C[i - 1].x, C[i].y(L[i]) - C[i - 1].y(L[i - 1]));
    const col = LINE_COLORS[w.line % 10];
    linesSvg.insertAdjacentHTML('beforeend', `<polyline points="${pts}" stroke="${col}" style="--len:${Math.ceil(len)};filter:drop-shadow(0 0 6px ${col})"/><polyline class="core" points="${pts}" style="--len:${Math.ceil(len)}"/>`);
    w.cells.forEach(([i, r]) => cellAt(i, r).classList.add('win'));
  }
  if (res.scatter.win) res.scatter.cells.forEach(([i, r]) => cellAt(i, r).classList.add('win'));
  const fr = frame.getBoundingClientRect(), big = res.total >= 2;
  if (!reduced()) burst(fr.left + fr.width / 2, fr.top + fr.height / 2, { count: big ? 50 : 18, speed: big ? 8 : 5, colors: ['#22f0ff', '#ff3dc8', '#b8ff3b', '#ffd84d'], gravity: 0.15 });
}
function winMessage(res, mult) {
  if (!res.lines.length && !res.scatter.win) return '';
  const best = res.lines.slice().sort((a, b) => b.win - a.win)[0];
  const parts = [];
  if (res.scatter.win) parts.push(`${res.scatter.count} wormholes`);
  if (best) parts.push(`${best.count}× ${E.SYMBOLS[best.sym].name}${res.lines.length > 1 ? ` + ${res.lines.length - 1} more line${res.lines.length > 2 ? 's' : ''}` : ` · line ${best.line + 1}`}`);
  return (mult > 1 ? `×${mult} · ` : '') + parts.join(' · ');
}
function countWin(coins, msg, ms) {
  const box = $('#winbox'); box.classList.toggle('on', coins > 0);
  $('#winmsg').textContent = msg;
  tween(0, coins, ms, v => ($('#winamt').textContent = fmtFull(v)));
}

/* ---------- banners ---------- */
function banner(html, ms) {
  const b = $('#banner'); b.innerHTML = `<div class="in">${html}<div class="f">Tap to continue</div></div>`; b.hidden = false;
  return new Promise(res => { let done = false; const end = () => { if (done) return; done = true; b.hidden = true; b.onclick = null; res(); }; b.onclick = end; sleep(ms).then(end); });
}

/* ---------- round ---------- */
async function play() {
  if (busy) return;
  busy = true; paint();
  const stake = bet.value;
  const r = await startRound('slots', stake);
  if (!r) { busy = false; autoLeft = 0; paint(); return; }
  sfx('bet'); buzz(10);
  $('#winamt').textContent = '0'; $('#winmsg').textContent = autoLeft ? `Autoplay · ${autoLeft} left` : 'Good luck';
  const turbo = () => turboEl.checked;
  const base = E.spin(await r.floats(5), 1);
  await animateSpin(base);
  let total = base.total, fsSpins = 0, fsWon = 0;
  if (base.total) {
    showWins(base);
    countWin(stake * base.total, winMessage(base, 1), base.total >= 2 ? 1000 : 500);
    if (base.total < 1) sfx('gem');
    await sleep(base.scatter.spins ? 1400 : turbo() ? 450 : 900);
  }
  if (base.scatter.spins) {
    unlock('fs');
    let awarded = E.addSpins(0, base.scatter.spins), left = awarded;
    sfx('big'); buzz([30, 40, 30, 40, 80]);
    clearWins();
    await banner(`${icon('X')}<div class="k">Wormhole opened</div><div class="t">${awarded} FREE SPINS</div><div class="s">All wins ×${E.FS_MULT}</div>`, 2600);
    const fsbar = $('#fsbar'); fsbar.hidden = false; $('#stage').classList.add('fsmode');
    $('#fswon').textContent = '0';
    while (left > 0) {
      left--; fsSpins++;
      $('#fsleft').textContent = left;
      $('#winamt').textContent = '0'; $('#winmsg').textContent = `Free spin ${fsSpins} of ${awarded}`;
      const s = E.spin(await r.floats(5), E.FS_MULT);
      await animateSpin(s);
      total += s.total; fsWon += s.total;
      if (s.total) {
        showWins(s);
        countWin(stake * s.total, winMessage(s, E.FS_MULT), 600);
        tween(stake * (fsWon - s.total), stake * fsWon, 600, v => ($('#fswon').textContent = fmtFull(v)));
        sfx(s.total >= 1 ? 'win' : 'gem'); buzz(12);
      }
      if (s.scatter.spins) {
        const add = E.addSpins(awarded, s.scatter.spins);
        await sleep(900);
        if (add) { awarded += add; left += add; $('#fsleft').textContent = left; sfx('level'); await banner(`${icon('X')}<div class="k">Retrigger</div><div class="t">+${add} SPINS</div><div class="s">${left} spins remaining</div>`, 1800); }
      }
      await sleep(s.total ? (turbo() ? 500 : 950) : (turbo() ? 150 : 300));
    }
    clearWins();
    sfx('cash');
    await banner(`<div class="k">Free spins complete</div><div class="t">${fmtFull(stake * fsWon)}</div><div class="s">${fsSpins} spins · ${fmtX(fsWon)} your bet</div>`, 2600);
    fsbar.hidden = true; $('#stage').classList.remove('fsmode');
  }
  const payout = Math.floor(stake * total), mult = payout / stake;
  r.settle(payout, { mult, detail: `${fmtFull(stake)} bet · ${fsSpins ? `${fsSpins} free spins · ` : ''}${base.lines.length} lines · ${fmtX(mult)}` });
  if (fsSpins) countWin(payout, `Round total · base + ${fsSpins} free spins`, 900);
  last = payout; $('#lastwin').textContent = fmtFull(last);
  $('#lastwin').style.color = payout > stake ? 'var(--l)' : payout ? 'var(--txt)' : 'var(--faint)';
  pushRecent($('#recent'), (fsSpins ? 'FS ' : '') + fmtX(mult), mult >= 10 ? 'b' : mult >= 1 ? 'w' : '');
  if (!payout) $('#winmsg').textContent = 'No win · spin again';
  busy = false;
  if (autoLeft) {
    autoLeft--;
    if (fsSpins || mult >= 20) { autoLeft = 0; if (mult >= 20 || fsSpins) $('#winmsg').textContent = fsSpins ? 'Autoplay stopped · free spins' : 'Autoplay stopped · big win'; }
    paint();
    if (autoLeft) { await sleep(mult >= 10 ? 2600 : turbo() ? 150 : 350); if (autoLeft && !busy) play(); }
  } else paint();
}

$('#spin').onclick = () => { if (autoLeft) { autoLeft = 0; sfx('tap'); paint(); return; } play(); };
$('#auto').onclick = () => {
  if (autoLeft) { autoLeft = 0; sfx('tap'); paint(); return; }
  if (busy) return;
  autoLeft = autoN; sfx('tap'); play();
};
addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat) return;
  if (e.target.closest?.('input,textarea,select') || $('.scrim')) return;
  e.preventDefault();
  $('#spin').click();
});
addEventListener('keyup', e => { if (e.code === 'Space' && e.target.closest?.('button') && !$('.scrim')) e.preventDefault(); });
paint();
