import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmt, fmtFull, fmtX, unlock, sleep, tween, modal, state } from '/core/ag.js';
import { tone } from '/core/audio.js';
import * as E from '/games/fireball-engine.js';

boot({ nav: 'games' });

/* ---------- original SVG symbol art ---------- */
const flameCrown = (cx, by, w, hgt, fill) => `<path d="M${cx - w} ${by}C${cx - w} ${by - hgt * .45} ${cx - w * .55} ${by - hgt * .6} ${cx - w * .5} ${by - hgt}C${cx - w * .2} ${by - hgt * .65} ${cx} ${by - hgt * .7} ${cx + w * .05} ${by - hgt * 1.15}C${cx + w * .3} ${by - hgt * .7} ${cx + w * .5} ${by - hgt * .65} ${cx + w * .6} ${by - hgt * .95}C${cx + w * .75} ${by - hgt * .55} ${cx + w} ${by - hgt * .45} ${cx + w} ${by}Z" fill="${fill}"/>`;
const letter = (ch, grad, stroke) => `${flameCrown(50, 46, 34, 34, 'url(#g-flm)')}<text x="50" y="84" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="70" fill="url(#${grad})" stroke="${stroke}" stroke-width="3" paint-order="stroke" letter-spacing="-2">${ch}</text><text x="50" y="84" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="70" fill="none" stroke="#fff" stroke-width=".8" opacity=".45">${ch}</text>`;
const ART = {
  FB: `${flameCrown(50, 70, 36, 58, 'url(#g-fbo)')}${flameCrown(50, 70, 26, 42, 'url(#g-fbi)')}<circle cx="50" cy="62" r="29" fill="url(#g-fbc)"/><circle cx="50" cy="62" r="29" fill="none" stroke="#fff3b0" stroke-width="1.5" opacity=".7"/><ellipse cx="40" cy="50" rx="10" ry="6" fill="#fff" opacity=".55" transform="rotate(-30 40 50)"/>`,
  DR: `<path d="M64 60Q78 74 96 70Q84 84 66 78Z" fill="url(#g-flm)"/>
    <path d="M14 88L22 62L16 40L30 46L28 22L42 38L52 26L54 40L72 42L86 52L84 60L68 60L76 68L58 72L48 92Z" fill="url(#g-dr)" stroke="#ffd0a0" stroke-width="2" stroke-linejoin="round"/>
    <path d="M28 22L36 40M16 40L30 52M52 26L50 42" stroke="#5a0a06" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M30 58Q44 50 62 52" stroke="#5a0a06" stroke-width="2" fill="none" opacity=".6"/><path d="M26 72Q38 66 52 70" stroke="#5a0a06" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M60 60L63 65L66 60L69 65L72 60" stroke="#fff" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
    <ellipse cx="56" cy="46" rx="6" ry="4" fill="#ffe34d" stroke="#3a0000" stroke-width="1.2"/><ellipse cx="56.5" cy="46" rx="1.3" ry="3.4" fill="#1a0000"/>
    <circle cx="80" cy="51" r="1.8" fill="#3a0000"/>`,
  PH: `<path d="M44 66C40 80 32 88 26 98C40 92 47 86 50 76C53 86 60 92 74 98C68 88 60 80 56 66Z" fill="url(#g-flm)"/>
    <path d="M48 52C36 30 18 28 4 14C10 34 16 46 28 56C18 57 10 55 3 50C12 66 30 72 46 66Z" fill="url(#g-ph)" stroke="#ffe7a8" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M52 52C64 30 82 28 96 14C90 34 84 46 72 56C82 57 90 55 97 50C88 66 70 72 54 66Z" fill="url(#g-ph)" stroke="#ffe7a8" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M14 26Q28 38 40 50M86 26Q72 38 60 50M10 52Q26 60 42 60M90 52Q74 60 58 60" stroke="#8a1a3a" stroke-width="1.6" fill="none" opacity=".55"/>
    <path d="M50 30C58 34 60 48 56 62C54 70 46 70 44 62C40 48 42 34 50 30Z" fill="url(#g-phb)" stroke="#fff3c8" stroke-width="1.5"/>
    <path d="M50 30C46 20 48 12 52 6C53 14 58 16 56 24C60 20 62 16 62 12C66 22 60 30 54 32Z" fill="url(#g-flm)"/>
    <circle cx="50" cy="34" r="7" fill="url(#g-phb)" stroke="#fff3c8" stroke-width="1.4"/><path d="M50 38L54 44L46 44Z" fill="#ffd84d"/><circle cx="47.5" cy="33" r="1.4" fill="#2a0000"/><circle cx="52.5" cy="33" r="1.4" fill="#2a0000"/>`,
  VO: `<path d="M38 40C30 26 40 18 44 6C48 14 52 10 54 4C58 16 70 22 62 40Z" fill="url(#g-flm)"/>
    <circle cx="26" cy="20" r="4" fill="#ff8a1f"/><circle cx="76" cy="16" r="3.4" fill="#ffc23d"/><circle cx="68" cy="28" r="2.6" fill="#ff4d1a"/><circle cx="32" cy="32" r="2.4" fill="#ffc23d"/>
    <path d="M6 94L36 40L44 44L56 44L64 40L94 94Z" fill="url(#g-vo)" stroke="#5a2a20" stroke-width="2" stroke-linejoin="round"/>
    <path d="M36 40L44 44L56 44L64 40Q50 36 36 40Z" fill="#ffb02e"/>
    <path d="M46 44C46 56 38 62 40 72C42 80 34 86 34 94M54 44C56 54 62 58 60 68C58 78 66 84 68 94M50 44C50 58 52 70 50 94" stroke="url(#g-lavav)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M20 80L28 70M76 74L84 84" stroke="#ff5a1a" stroke-width="1.6" opacity=".6"/>`,
  HS: `${flameCrown(30, 30, 12, 24, 'url(#g-flm)')}${flameCrown(70, 30, 12, 24, 'url(#g-flm)')}
    <path d="M30 26C16 44 16 74 50 88C84 74 84 44 70 26" fill="none" stroke="#5a2a00" stroke-width="19" stroke-linecap="round"/>
    <path d="M30 26C16 44 16 74 50 88C84 74 84 44 70 26" fill="none" stroke="url(#g-hs)" stroke-width="15" stroke-linecap="round"/>
    <path d="M30 26C18 44 19 70 50 82" fill="none" stroke="#fff6c8" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>
    ${[[25, 44], [23, 60], [30, 74], [75, 44], [77, 60], [70, 74]].map(([x, y]) => `<rect x="${x - 2.5}" y="${y - 2}" width="5" height="4" rx="1" fill="#5a2a00"/>`).join('')}`,
  S7: `${flameCrown(50, 30, 34, 28, 'url(#g-flm)')}<path d="M16 16H86V32L56 92H32L62 34H16Z" fill="url(#g-s7)" stroke="#ffe08a" stroke-width="3" stroke-linejoin="round"/><path d="M20 20H82V24H20Z" fill="#fff" opacity=".45"/><path d="M58 36L36 86" stroke="#5a0000" stroke-width="2" opacity=".4"/>`,
  A: letter('A', 'g-la', '#3a0400'),
  K: letter('K', 'g-lk', '#3a1400'),
  Q: letter('Q', 'g-lq', '#3a0018'),
  J: letter('J', 'g-lj', '#3a2400'),
};
const DEFS = `<defs>
<linearGradient id="g-flm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d1a"/><stop offset=".5" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ffe38a" stop-opacity=".9"/></linearGradient>
<linearGradient id="g-fbo" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff2a0a"/><stop offset=".6" stop-color="#ff6a1a"/><stop offset="1" stop-color="#ffb02e" stop-opacity=".6"/></linearGradient>
<linearGradient id="g-fbi" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffb02e"/><stop offset="1" stop-color="#fff2a0"/></linearGradient>
<radialGradient id="g-fbc" cx=".42" cy=".38" r=".65"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffe066"/><stop offset=".75" stop-color="#ff9a1f"/><stop offset="1" stop-color="#e8360a"/></radialGradient>
<linearGradient id="g-dr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6a3a"/><stop offset=".5" stop-color="#c8160e"/><stop offset="1" stop-color="#5a0606"/></linearGradient>
<linearGradient id="g-ph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset=".45" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ff3d6e"/></linearGradient>
<linearGradient id="g-phb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset="1" stop-color="#ff8a1f"/></linearGradient>
<linearGradient id="g-vo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2a2e"/><stop offset=".6" stop-color="#241316"/><stop offset="1" stop-color="#120a0c"/></linearGradient>
<linearGradient id="g-lavav" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset=".4" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ff2a0a" stop-opacity=".6"/></linearGradient>
<linearGradient id="g-hs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#ffc23d"/><stop offset="1" stop-color="#c26a00"/></linearGradient>
<linearGradient id="g-s7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb02e"/><stop offset=".5" stop-color="#ff3d1a"/><stop offset="1" stop-color="#a80a1a"/></linearGradient>
<linearGradient id="g-la" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd06a"/><stop offset="1" stop-color="#e8200f"/></linearGradient>
<linearGradient id="g-lk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset="1" stop-color="#ff8a1f"/></linearGradient>
<linearGradient id="g-lq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb0d8"/><stop offset="1" stop-color="#e8205a"/></linearGradient>
<linearGradient id="g-lj" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbd0"/><stop offset="1" stop-color="#ffb02e"/></linearGradient>
</defs>`;
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${Object.entries(ART).map(([k, v]) => `<symbol id="sym-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#sym-${k}"/></svg>`;

let stakeView = 100; // bet used for fireball labels
const fbLabel = c => (c.jp ? `<b class="fv jp ${c.jp}">${c.jp}</b>` : `<b class="fv">${fmt(stakeView * c.v)}</b>`);
const cellHTML = c => (c === null ? `<div class="cell dark"></div>` : c.s === 'FB' ? `<div class="cell k-FB ${c.jp || ''}">${icon('FB')}${fbLabel(c)}</div>` : `<div class="cell k-${c.s}">${icon(c.s)}</div>`);

/* ---------- rules / paytable ---------- */
const LINE_COLORS = ['#ffc23d', '#ff7a1a', '#ff3d6e', '#ffe066', '#ff3dc8', '#ffb347', '#ff5a1a', '#fff2a8', '#ff8a8a', '#ffd84d'];
function payTable(bet) {
  const lb = bet / E.LINES_N, v = m => (bet ? fmtFull(Math.floor(lb * m)) : `${m}×`);
  const unit = bet ? `Pays shown in Glow for a total bet of ${fmtFull(bet)} (line bet ${(lb % 1 ? lb.toFixed(2) : fmtFull(lb))}).` : 'Line pays are multiples of the line bet (total bet ÷ 25).';
  const rows = E.ORDER.map(k => `<div class="pr">${icon(k)}<div class="pv">${[5, 4, 3].map(n => `<i>${n}×</i>${v(E.SYMBOLS[k].pays[n - 3])}`).join('<br>')}</div></div>`).join('');
  const vals = E.VALUES.filter(x => !x.jp).map(x => `${x.v}×`).join(', ');
  const tot = E.VALUES.reduce((a, x) => a + x.w, 0);
  const lines = E.LINES.map((L, i) => `<div><span>${i + 1}</span><svg viewBox="0 0 50 30">${[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${c * 10 + 1}" y="${r * 10 + 1}" width="8" height="8" rx="1.5" fill="${L[c] === r ? LINE_COLORS[i % 10] : '#22223d'}"/>`).join('')).join('')}</svg></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">${unit}</p>
  <div class="ptab">${rows}
    <div class="pr wide">${icon('FB')}<div class="pv txt"><b style="color:var(--y)">FIREBALL</b> can land anywhere and carries a value: ${vals} your total bet, or a jackpot. It does not pay on lines; 6 or more start <b>Hold &amp; Spin</b>.</div></div>
  </div>
  <div class="lab">Jackpots (× total bet)</div>
  <table class="vtab"><tr><td>MINI</td><td class="n">${bet ? fmtFull(bet * 20) : '20×'}</td></tr><tr><td>MINOR</td><td class="n">${bet ? fmtFull(bet * 50) : '50×'}</td></tr><tr><td>MAJOR</td><td class="n">${bet ? fmtFull(bet * 250) : '250×'}</td></tr><tr><td>GRAND · fill all 15 cells</td><td class="n">${bet ? fmtFull(bet * 1000) : '1,000×'}</td></tr></table>
  <p class="faint" style="font-size:12px;margin:2px 0">A fireball shows a jackpot label about 1 time in ${Math.round(tot / E.VALUES.filter(x => x.jp).reduce((a, x) => a + x.w, 0))}.</p>
  <div class="lab">25 paylines</div><div class="plines">${lines}</div>`;
}
const RULES = `<p>Five reels, three rows, <b>25 fixed paylines</b>. Your total bet is spread across all 25 lines. Land 3, 4 or 5 matching symbols on a line, left to right from reel 1, to win. Only the highest win per line pays; wins on different lines add up.</p>
  <p><b>Hold &amp; Spin.</b> Land <b>6 or more fireballs</b> anywhere. They lock in place, every other cell goes dark and you get <b>3 respins</b>. Each new fireball locks too and resets the respins to 3. The feature ends when respins run out or all 15 cells are full. Fill all 15 to win the <b>GRAND (1,000×)</b> on top of every fireball's value. At the end, every fireball's value is added up and paid, along with any line wins from the triggering spin.</p>
  <p><b>Max win</b> is capped at ${fmtFull(E.MAX_WIN)}× your total bet per round. The spin and its Hold &amp; Spin feature count as one round.</p>
  ${payTable(0)}
  <p>Theoretical RTP about <b>96.3%</b> (10M-spin simulation, bonus included). Hit frequency about 25%; Hold &amp; Spin starts about 1 in 220 spins.</p>`;
gameHeader($('#panel'), { title: 'Fireball Fury', rules: RULES });

/* ---------- controls ---------- */
const bet = BetControl($('#betslot'), { game: 'fireball', min: 25, label: 'Total bet', onChange: paintBet });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:fireball:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:fireball:turbo', turboEl.checked ? '1' : '0'); };
let busy = false;
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTable(bet.value)}`); };

function paintBet() {
  const b = bet.value;
  $('#totbet').textContent = fmtFull(b);
  $('#linebet').textContent = (b / 25 % 1 ? (b / 25).toFixed(2) : fmtFull(b / 25)) + ' × 25';
  if (!busy) paintJackpots(b);
}
function paintJackpots(b) {
  $$('#jpm .jpt').forEach(t => { t.querySelector('b').textContent = fmt(b * E.JACKPOTS[t.dataset.jp]); });
}
function paint() {
  const spin = $('#spin');
  spin.disabled = busy; spin.textContent = busy ? 'SPINNING' : 'SPIN';
  bet.disable(busy); $('#ptbtn').disabled = busy;
  paintBet();
}

/* ---------- reels ---------- */
const reelsEl = $('#reels'), linesSvg = $('#lines'), frame = $('#frame');
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const randCell = () => { const s = E.pickSym(Math.random()); return s === 'FB' ? { s, v: [1, 2, 3, 5][Math.floor(Math.random() * 4)], jp: null } : { s }; }; // cosmetic filler only
const reels = [];
let shown = Array.from({ length: 15 }, (_, i) => ({ s: ['A', 'DR', 'K', 'PH', 'Q', 'VO', 'J', 'HS', 'A', 'S7', 'K', 'DR', 'Q', 'PH', 'J'][i] }));
for (let i = 0; i < E.REELS; i++) {
  const el = reelsEl.appendChild(h(`<div class="reel"><div class="strip"></div><div class="flames"></div></div>`));
  reels.push({ el, strip: $('.strip', el) });
}
function setStrip(i, col) {
  const st = reels[i].strip; st.getAnimations().forEach(a => a.cancel());
  st.innerHTML = [randCell(), ...col, randCell()].map(cellHTML).join('');
  st.style.transform = 'translateY(-20%)';
}
const colOf = (cells, i) => cells.slice(i * 3, i * 3 + 3);
const cellAt = idx => reels[Math.floor(idx / 3)].strip.children[1 + (idx % 3)];
for (let i = 0; i < E.REELS; i++) setStrip(i, colOf(shown, i));

async function animateSpin(cells) {
  const turbo = turboEl.checked, red = reduced();
  const perCell = turbo ? 32 : 46;
  const times = []; let t = 0, fbs = 0;
  for (let i = 0; i < E.REELS; i++) {
    const anticipate = fbs === E.TRIGGER - 1;
    t = i === 0 ? (turbo ? 320 : 700) : t + (turbo ? 110 : 220) + (anticipate ? (turbo ? 1000 : 1700) : 0);
    times.push({ t: red ? 120 + i * 70 : t, anticipate: anticipate && !red });
    fbs += colOf(cells, i).filter(c => c.s === 'FB').length;
  }
  sfx('spin');
  const spinT = setInterval(() => sfx('spin'), turbo ? 180 : 260);
  const anims = reels.map(({ strip, el }, i) => {
    const old = colOf(shown, i);
    const F = Math.max(4, Math.round(times[i].t / perCell));
    const seq = [randCell(), ...colOf(cells, i), ...Array.from({ length: F }, randCell), ...old, randCell()];
    strip.getAnimations().forEach(a => a.cancel());
    strip.innerHTML = seq.map(cellHTML).join('');
    const N = seq.length, from = -(N - 4) / N * 100, to = -1 / N * 100;
    if (!red) el.classList.add('spinning');
    const a = strip.animate([{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
      { duration: times[i].t, easing: red ? 'linear' : 'cubic-bezier(.35,.05,.35,1.06)', fill: 'forwards' });
    if (!red) setTimeout(() => el.classList.remove('spinning'), Math.max(0, times[i].t - (turbo ? 90 : 160)));
    return a;
  });
  let seen = 0;
  for (let i = 0; i < E.REELS; i++) {
    if (times[i].anticipate) {
      await sleep(Math.max(0, times[i].t - times[i - 1].t - (turbo ? 1000 : 1700)) + 20);
      // light every reel still spinning: the last reels slow-spin in flames
      for (let j = i; j < E.REELS; j++) reels[j].el.classList.add('antic');
      $('#winmsg').textContent = '🔥 5 fireballs... one more!';
      sfx('rise'); buzz([20, 40, 20]);
    }
    await anims[i].finished.catch(() => {});
    reels[i].el.classList.remove('antic', 'spinning');
    setStrip(i, colOf(cells, i));
    sfx('stop'); buzz(8);
    const col = colOf(cells, i);
    if (col.some(c => c.s === 'FB')) {
      sfx('reveal');
      col.forEach((c, r) => c.s === 'FB' && cellAt(i * 3 + r).classList.add('land'));
      seen += col.filter(c => c.s === 'FB').length;
      if (seen >= E.TRIGGER && seen - col.filter(c => c.s === 'FB').length < E.TRIGGER) { sfx('gem'); buzz([20, 30, 40]); }
    }
  }
  $$('.reel.antic').forEach(r => r.classList.remove('antic'));
  clearInterval(spinT);
  shown = cells;
}

function clearWins() {
  linesSvg.innerHTML = ''; reelsEl.classList.remove('won');
  $$('.cell.win', reelsEl).forEach(c => c.classList.remove('win'));
}
function centers() {
  const fr = frame.getBoundingClientRect();
  linesSvg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`);
  return reels.map(r => { const b = r.el.getBoundingClientRect(), c = b.width; return { x: b.left - fr.left + c / 2, y: row => b.top - fr.top + c * (row + 0.5) }; });
}
function showLines(res) {
  if (!res.lines.length) return;
  reelsEl.classList.add('won');
  const C = centers();
  for (const w of res.lines) {
    const L = E.LINES[w.line], pts = L.map((r, i) => `${C[i].x.toFixed(1)},${C[i].y(r).toFixed(1)}`).join(' ');
    let len = 0; for (let i = 1; i < 5; i++) len += Math.hypot(C[i].x - C[i - 1].x, C[i].y(L[i]) - C[i - 1].y(L[i - 1]));
    const col = LINE_COLORS[w.line % 10];
    linesSvg.insertAdjacentHTML('beforeend', `<polyline points="${pts}" stroke="${col}" style="--len:${Math.ceil(len)};filter:drop-shadow(0 0 6px ${col})"/><polyline class="core" points="${pts}" style="--len:${Math.ceil(len)}"/>`);
    w.cells.forEach(idx => cellAt(idx).classList.add('win'));
  }
  const fr = frame.getBoundingClientRect(), big = res.lineWin >= 2;
  burst(fr.left + fr.width / 2, fr.top + fr.height / 2, { count: big ? 50 : 18, speed: big ? 8 : 5, colors: ['#ff8a1f', '#ffc23d', '#ff4d1a', '#ff3d6e'], gravity: 0.15 });
}
function lineMessage(res) {
  const best = res.lines.slice().sort((a, b) => b.win - a.win)[0];
  return `${best.count}× ${E.SYMBOLS[best.sym].name}${res.lines.length > 1 ? ` + ${res.lines.length - 1} more line${res.lines.length > 2 ? 's' : ''}` : ` · line ${best.line + 1}`}`;
}
let winVal = 0;
function countWin(coins, msg, ms) {
  $('#winbox').classList.toggle('on', coins > 0);
  if (msg) $('#winmsg').textContent = msg;
  const from = winVal; winVal = coins;
  tween(from, coins, ms, v => ($('#winamt').textContent = fmtFull(v)));
}
function setWin(coins) { winVal = coins; $('#winamt').textContent = fmtFull(coins); $('#winbox').classList.toggle('on', coins > 0); }

/* ---------- banners ---------- */
function banner(html, ms) {
  const b = $('#banner'); b.innerHTML = `<div class="in">${html}<div class="f">Tap to continue</div></div>`; b.hidden = false;
  return new Promise(res => { let done = false; const end = () => { if (done) return; done = true; b.hidden = true; b.onclick = null; res(); }; b.onclick = end; sleep(ms).then(end); });
}
function jpPulse(name) {
  const t = $(`#jpm .jpt[data-jp="${name}"]`); if (!t) return;
  t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit');
  setTimeout(() => t.classList.remove('hit'), 3000);
}
function whoosh() {
  if (!state.settings.sound) return;
  sfx('card'); try { tone(260, 0.22, { type: 'sawtooth', vol: 0.05, slide: 3.2, attack: 0.04 }); } catch (e) {}
}

/* ---------- hold & spin ---------- */
function pips(n, reset) {
  const p = $('#pips'); $$('i', p).forEach((x, i) => x.classList.toggle('on', i < n));
  if (reset) { p.classList.remove('reset'); void p.offsetWidth; p.classList.add('reset'); }
}
function renderHold(locked) {
  for (let i = 0; i < E.REELS; i++) {
    const st = reels[i].strip; st.getAnimations().forEach(a => a.cancel());
    st.innerHTML = [null, ...colOf(locked, i), null].map(cellHTML).join('');
    st.style.transform = 'translateY(-20%)';
    colOf(locked, i).forEach((c, r) => c && st.children[1 + r].classList.add('lock'));
  }
}

async function holdAndSpin(r, cells, stake) {
  const turbo = () => turboEl.checked;
  const locked = E.lockFrom(cells);
  // celebrate the trigger
  cells.forEach((c, i) => c.s === 'FB' && cellAt(i).classList.add('win'));
  sfx('big'); buzz([30, 40, 30, 40, 80]);
  await sleep(900);
  clearWins();
  await banner(`${icon('FB')}<div class="k">${locked.filter(Boolean).length} fireballs locked</div><div class="t">HOLD &amp; SPIN</div><div class="s">3 respins · new fireballs reset them</div>`, 2400);
  frame.parentElement.classList.add('hold');
  renderHold(locked);
  const bar = $('#hsbar'); bar.hidden = false;
  let left = E.RESPINS; pips(left); $('#hsn').textContent = locked.filter(Boolean).length;
  setWin(0); $('#winmsg').textContent = 'Hold & Spin';
  await sleep(500);
  while (left > 0 && E.emptyCount(locked)) {
    left--; pips(left);
    const empties = locked.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
    const hits = E.respin(locked, await r.floats(2 * empties.length));
    // flicker the dark cells, then resolve them reel by reel
    empties.forEach(i => cellAt(i).classList.add('flick'));
    sfx('spin');
    await sleep(turbo() ? 280 : 650);
    let lastReel = -1;
    for (const i of empties) {
      const reel = Math.floor(i / 3);
      if (reel !== lastReel) { lastReel = reel; await sleep(turbo() ? 40 : 110); sfx('tick'); }
      const el = cellAt(i);
      el.classList.remove('flick');
      if (hits.includes(i)) {
        const n = h(cellHTML(locked[i])); n.classList.add('lock', 'land'); el.replaceWith(n);
        sfx('gem'); buzz(14);
        const b = n.getBoundingClientRect();
        burst(b.left + b.width / 2, b.top + b.height / 2, { count: 22, speed: 5, colors: ['#ffc23d', '#ff8a1f', '#ff4d1a', '#fff2a8'], gravity: 0.1 });
        if (locked[i].jp) jpPulse(locked[i].jp);
        $('#hsn').textContent = locked.filter(Boolean).length;
        await sleep(turbo() ? 120 : 260);
      }
    }
    if (hits.length) { left = E.RESPINS; pips(left, true); sfx('level'); $('#winmsg').textContent = `+${hits.length} fireball${hits.length > 1 ? 's' : ''} · respins reset to 3`; }
    else $('#winmsg').textContent = left ? `${left} respin${left > 1 ? 's' : ''} left` : 'Last respin done';
    await sleep(turbo() ? 250 : 550);
  }
  const res = E.bonusTotal(locked);
  if (res.grand) {
    jpPulse('GRAND'); sfx('big'); buzz([60, 40, 60, 40, 120]);
    await banner(`${icon('FB')}<div class="k">All 15 cells ablaze</div><div class="t">GRAND</div><div class="s">+${fmtFull(stake * E.GRAND)}</div>`, 2600);
  }
  // collect: every fireball flies into the total counter
  $('#winmsg').textContent = 'Collecting fireballs…';
  const target = $('#winamt');
  let run = 0;
  for (let i = 0; i < E.CELLS; i++) {
    const c = locked[i]; if (!c) continue;
    const el = cellAt(i), a = el.getBoundingClientRect(), t = target.getBoundingClientRect();
    run += c.v;
    whoosh();
    if (!reduced()) {
      const fly = document.body.appendChild(h(`<div class="flyer">${icon('FB')}</div>`));
      Object.assign(fly.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
      el.classList.add('gone');
      const dx = t.left + t.width / 2 - (a.left + a.width / 2), dy = t.top + t.height / 2 - (a.top + a.height / 2);
      const anim = fly.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 40}px) scale(.8)`, opacity: 1, offset: 0.55 }, { transform: `translate(${dx}px,${dy}px) scale(.3)`, opacity: 0.2 }], { duration: turbo() ? 260 : 420, easing: 'cubic-bezier(.5,0,.75,.4)' });
      await anim.finished.catch(() => {}); fly.remove();
    } else el.classList.add('gone');
    countWin(Math.floor(stake * run), c.jp ? `${c.jp} JACKPOT +${fmtFull(stake * c.v)}` : `Fireball +${fmtFull(stake * c.v)}`, turbo() ? 120 : 200);
    target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); setTimeout(() => target.classList.remove('bump'), 140);
    if (c.jp) { jpPulse(c.jp); sfx('cash'); buzz([20, 20, 40]); await sleep(turbo() ? 250 : 600); } else sfx('chip');
    await sleep(turbo() ? 30 : 70);
  }
  if (res.grand) { run += E.GRAND; countWin(Math.floor(stake * run), `GRAND JACKPOT +${fmtFull(stake * E.GRAND)}`, 600); sfx('cash'); await sleep(700); }
  bar.hidden = true;
  return { ...res, count: locked.filter(Boolean).length, locked };
}

/* ---------- round ---------- */
async function play() {
  if (busy) return;
  busy = true; paint();
  const stake = bet.value;
  const r = await startRound('fireball', stake);
  if (!r) { busy = false; paint(); return; }
  stakeView = stake; paintJackpots(stake);
  frame.parentElement.classList.remove('hold');
  clearWins(); setWin(0);
  sfx('bet'); buzz(10);
  $('#winmsg').textContent = 'Good luck';
  const base = E.spinBase(await r.floats(30));
  await animateSpin(base.cells);
  let total = base.lineWin, bonus = null;
  if (base.lineWin) {
    showLines(base);
    countWin(Math.floor(stake * base.lineWin), lineMessage(base), base.lineWin >= 2 ? 1000 : 500);
    sfx(base.lineWin >= 1 ? 'win' : 'gem'); buzz(12);
    await sleep(base.trigger ? 1300 : turboEl.checked ? 450 : 800);
  }
  if (base.trigger) {
    bonus = await holdAndSpin(r, base.cells, stake);
    total += bonus.sum;
    shown = bonus.locked;
    if (bonus.jps.length) unlock('fireball');
  }
  const capped = total > E.MAX_WIN;
  total = E.capWin(total);
  const payout = Math.floor(stake * total), mult = payout / stake;
  if (bonus) {
    sfx('cash');
    await banner(`${icon('FB')}<div class="k">Hold &amp; Spin complete</div><div class="t">${fmtFull(payout)}</div><div class="s">${bonus.count} fireballs${bonus.jps.length ? ' · ' + bonus.jps.join(' + ') : ''} · ${fmtX(mult)}</div>`, 2600);
  }
  r.settle(payout, { mult, detail: `${fmtFull(stake)} bet · ${base.lines.length} lines${bonus ? ` · H&S ${bonus.count} fireballs${bonus.jps.length ? ' ' + bonus.jps.join('+') : ''}` : ''}${capped ? ' · capped' : ''} · ${fmtX(mult)}` });
  setWin(payout);
  $('#winmsg').textContent = payout ? (bonus ? `${base.lineWin ? 'Lines + ' : ''}Hold & Spin total${capped ? ' (max win)' : ''}` : $('#winmsg').textContent) : (base.fbCount === 5 ? 'So close: 5 fireballs' : 'No win · spin again');
  $('#lastwin').textContent = payout ? fmtFull(payout) : '-';
  $('#lastwin').style.color = payout > stake ? 'var(--y)' : payout ? 'var(--txt)' : 'var(--faint)';
  pushRecent($('#recent'), (bonus ? '🔥 ' : '') + fmtX(mult), mult >= 10 ? 'b' : mult >= 1 ? 'w' : '');
  busy = false; paint();
}

$('#spin').onclick = play;
addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat) return;
  if (e.target.closest?.('input,textarea,select') || $('.scrim')) return;
  e.preventDefault();
  if (!$('#banner').hidden) { $('#banner').click(); return; }
  play();
});
addEventListener('keyup', e => { if (e.code === 'Space' && e.target.closest?.('button') && !$('.scrim')) e.preventDefault(); });

/* ---------- embers ---------- */
const sky = $('#sky');
for (let i = 0; i < 20; i++) {
  const s = 2 + Math.random() * 4, e = document.createElement('i');
  e.className = 'ember';
  e.style.cssText = `left:${3 + Math.random() * 94}%;width:${s}px;height:${s}px;background:${Math.random() < 0.7 ? '#ff8a1fd9' : '#ffdc3ccc'};box-shadow:0 0 6px #ff6a1a;--dx:${(Math.random() - 0.5) * 100}px;animation-duration:${4 + Math.random() * 6}s;animation-delay:-${Math.random() * 8}s`;
  sky.appendChild(e);
}
stakeView = bet.value;
paint();
