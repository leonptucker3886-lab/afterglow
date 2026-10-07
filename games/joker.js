import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, tween, modal, state } from '/core/ag.js';
import * as E from '/games/joker-engine.js';

boot({ nav: 'games' });

/* ---------- original SVG symbol art ---------- */
const star = (cx, cy, n, r1, r2, rot = -90) => Array.from({ length: n * 2 }, (_, i) => { const a = (rot + i * 180 / n) * Math.PI / 180, r = i % 2 ? r2 : r1; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
const JFACE = `<path d="M50 44L22 14 14 46Z" fill="url(#j-hm)" stroke="#ffd0f3" stroke-width="2" stroke-linejoin="round"/><path d="M50 44L78 14 86 46Z" fill="url(#j-hm)" stroke="#ffd0f3" stroke-width="2" stroke-linejoin="round"/><path d="M50 44L38 4 62 4Z" fill="url(#j-hl)" stroke="#efffc9" stroke-width="2" stroke-linejoin="round"/>
<circle cx="22" cy="13" r="5.5" fill="#ffd84d" stroke="#fff6c8" stroke-width="1.5"/><circle cx="78" cy="13" r="5.5" fill="#ffd84d" stroke="#fff6c8" stroke-width="1.5"/><circle cx="50" cy="5" r="5.5" fill="#ffd84d" stroke="#fff6c8" stroke-width="1.5"/>
<path d="M14 46Q50 34 86 46L84 52Q50 42 16 52Z" fill="#b8ff3b"/><circle cx="26" cy="47" r="2" fill="#ff3dc8"/><circle cx="50" cy="42" r="2" fill="#ff3dc8"/><circle cx="74" cy="47" r="2" fill="#ff3dc8"/>
<path d="M20 52Q20 94 50 95Q80 94 80 52Q50 44 20 52Z" fill="url(#j-face)" stroke="#fff" stroke-width="1.5"/>
<path d="M33 60l4 6 4-6-4-6z" fill="#8b5cff"/><path d="M59 60l4 6 4-6-4-6z" fill="#8b5cff"/>
<path d="M29 63q8-8 15 0" stroke="#0b0b18" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M56 63q8-8 15 0" stroke="#0b0b18" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<path d="M28 74Q50 96 72 74Q50 82 28 74Z" fill="#7a0a4e" stroke="#ff3dc8" stroke-width="2.2" stroke-linejoin="round"/><path d="M33 76Q50 81 67 76L65 79Q50 83 35 79Z" fill="#fff"/>
<circle cx="25" cy="72" r="4" fill="#ff3dc8" opacity=".55"/><circle cx="75" cy="72" r="4" fill="#ff3dc8" opacity=".55"/><circle cx="50" cy="70" r="3.2" fill="#ff3dc8"/>`;
const ART = {
  c: `<path d="M34 64Q40 30 62 14M66 62Q62 36 62 14" stroke="#4fc23a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M62 14Q80 8 88 20Q74 26 62 14Z" fill="#7be04a"/><circle cx="32" cy="70" r="18" fill="url(#g-ch)" stroke="#ffb3c6" stroke-width="2"/><circle cx="68" cy="68" r="18" fill="url(#g-ch)" stroke="#ffb3c6" stroke-width="2"/><ellipse cx="26" cy="63" rx="5" ry="3.5" fill="#fff" opacity=".6" transform="rotate(-30 26 63)"/><ellipse cx="62" cy="61" rx="5" ry="3.5" fill="#fff" opacity=".6" transform="rotate(-30 62 61)"/>`,
  l: `<path d="M8 52Q12 30 34 22Q56 14 78 26Q92 32 94 48Q90 70 66 78Q44 86 22 76Q8 68 8 52Z" fill="url(#g-le)" stroke="#fff6a8" stroke-width="2.5"/><path d="M4 52l8-4v8zM96 46l-6-5-1 9z" fill="#e8c600"/><path d="M26 38Q40 28 58 30" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>`,
  o: `<circle cx="50" cy="56" r="36" fill="url(#g-or)" stroke="#ffd2a0" stroke-width="2.5"/><path d="M50 22Q54 10 66 8" stroke="#4fc23a" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M52 22Q70 4 84 18Q66 28 52 22Z" fill="#7be04a"/><g fill="#c94f00" opacity=".35"><circle cx="38" cy="60" r="1.6"/><circle cx="58" cy="70" r="1.6"/><circle cx="64" cy="50" r="1.6"/><circle cx="44" cy="76" r="1.6"/><circle cx="30" cy="46" r="1.6"/></g><ellipse cx="36" cy="40" rx="9" ry="5" fill="#fff" opacity=".5" transform="rotate(-35 36 40)"/>`,
  p: `<path d="M50 22C76 18 90 42 86 62C82 84 64 94 48 92C28 90 12 74 14 54C16 34 30 24 50 22Z" fill="url(#g-pl)" stroke="#e6c8ff" stroke-width="2.5"/><path d="M50 24Q46 50 52 90" stroke="#3d0c5e" stroke-width="2" fill="none" opacity=".5"/><path d="M50 22Q50 12 56 6" stroke="#6b4a1e" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M54 14Q70 2 80 14Q66 20 54 14Z" fill="#7be04a"/><ellipse cx="32" cy="44" rx="7" ry="11" fill="#fff" opacity=".35" transform="rotate(20 32 44)"/>`,
  g: `<path d="M50 18Q52 8 60 4" stroke="#6b4a1e" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M52 16Q30 2 18 18Q36 26 52 16Z" fill="#7be04a"/><g fill="url(#g-gr)" stroke="#d8c4ff" stroke-width="1.5">${[[34, 30], [50, 28], [66, 30], [26, 46], [42, 44], [58, 44], [74, 46], [34, 60], [50, 60], [66, 60], [42, 75], [58, 75], [50, 89]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</g><g fill="#fff" opacity=".55">${[[31, 27], [47, 25], [63, 27], [39, 41], [55, 41], [47, 57]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('')}</g>`,
  w: `<path d="M6 38A44 44 0 0 0 94 38Z" fill="#1f8a2a" stroke="#b8ff3b" stroke-width="2.5"/><path d="M12 38A38 38 0 0 0 88 38Z" fill="#eaffd0"/><path d="M16 38A34 34 0 0 0 84 38Z" fill="url(#g-wm)"/><g fill="#1a0a10">${[[30, 48], [44, 56], [58, 56], [72, 48], [38, 66], [52, 70], [64, 64]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="3.4"/>`).join('')}</g><path d="M22 42Q30 46 40 46" stroke="#fff" stroke-width="3" fill="none" opacity=".4" stroke-linecap="round"/>`,
  b: `<path d="M50 10Q56 10 56 16Q78 22 78 52Q78 70 90 78H10Q22 70 22 52Q22 22 44 16Q44 10 50 10Z" fill="url(#g-be)" stroke="#fff3b0" stroke-width="2.5" stroke-linejoin="round"/><rect x="8" y="76" width="84" height="8" rx="4" fill="#d18b00" stroke="#fff3b0" stroke-width="2"/><circle cx="50" cy="90" r="7" fill="#ffd84d" stroke="#fff3b0" stroke-width="2"/><path d="M34 30Q30 46 32 64" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".45"/>`,
  B: `<rect x="6" y="26" width="88" height="48" rx="10" fill="#0b0b18" stroke="url(#g-bar)" stroke-width="4"/><rect x="12" y="32" width="76" height="36" rx="6" fill="none" stroke="#22f0ff" stroke-width="1.5" opacity=".5"/><text x="50" y="62" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="30" letter-spacing="2" fill="url(#g-bar)">BAR</text>`,
  7: `<path d="M18 14H86V28Q62 52 54 92H30Q36 58 62 32H32V40H18Z" fill="url(#g-7)" stroke="#ffd84d" stroke-width="4" stroke-linejoin="round"/><path d="M24 20H78" stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"/>`,
  J: JFACE,
  S: `<circle cx="50" cy="50" r="44" fill="url(#g-sg)"/><polygon points="${star(50, 52, 5, 42, 18)}" fill="url(#g-st)" stroke="#fff6c8" stroke-width="2.5" stroke-linejoin="round"/><polygon points="${star(50, 52, 5, 18, 8)}" fill="#fff" opacity=".7"/>`,
};
const DEFS = `<defs>
<radialGradient id="g-ch" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff9cb4"/><stop offset=".5" stop-color="#ff1f5a"/><stop offset="1" stop-color="#8a0024"/></radialGradient>
<linearGradient id="g-le" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbb0"/><stop offset=".5" stop-color="#ffe600"/><stop offset="1" stop-color="#c9a800"/></linearGradient>
<radialGradient id="g-or" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffd59a"/><stop offset=".5" stop-color="#ff8a1f"/><stop offset="1" stop-color="#b84a00"/></radialGradient>
<radialGradient id="g-pl" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#d9a8ff"/><stop offset=".5" stop-color="#8b2fd6"/><stop offset="1" stop-color="#3d0c6e"/></radialGradient>
<radialGradient id="g-gr" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#c7b3ff"/><stop offset=".6" stop-color="#6b3bff"/><stop offset="1" stop-color="#2a0f8a"/></radialGradient>
<radialGradient id="g-wm" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#ff6f8f"/><stop offset="1" stop-color="#e3123f"/></radialGradient>
<linearGradient id="g-be" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffc21f"/><stop offset="1" stop-color="#c47a00"/></linearGradient>
<linearGradient id="g-bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22f0ff"/><stop offset=".5" stop-color="#e6fdff"/><stop offset="1" stop-color="#ff3dc8"/></linearGradient>
<linearGradient id="g-7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8aa0"/><stop offset=".45" stop-color="#ff1f3d"/><stop offset="1" stop-color="#8a0014"/></linearGradient>
<radialGradient id="g-st" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#ffe98a"/><stop offset="1" stop-color="#ffb43d"/></radialGradient>
<radialGradient id="g-sg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff3dc8" stop-opacity=".5"/><stop offset="1" stop-color="#ff3dc8" stop-opacity="0"/></radialGradient>
<linearGradient id="j-hm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8ae0"/><stop offset="1" stop-color="#b0127f"/></linearGradient>
<linearGradient id="j-hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaffb5"/><stop offset="1" stop-color="#6fc400"/></linearGradient>
<radialGradient id="j-face" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f1ecff"/><stop offset="1" stop-color="#c6b8f0"/></radialGradient>
<pattern id="j-harl" width="40" height="60" patternUnits="userSpaceOnUse"><rect width="40" height="60" fill="#2a0b3a"/><path d="M20 0L40 30 20 60 0 30Z" fill="#ff3dc8" opacity=".55"/><path d="M0 0L20 30 0 60ZM40 0L20 30 40 60Z" fill="#b8ff3b" opacity=".18"/></pattern>
</defs>`;
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${Object.entries(ART).map(([k, v]) => `<symbol id="jk-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#jk-${k}"/></svg>`;
const cellHTML = k => `<div class="cell k-${k}">${icon(k)}</div>`;
const BIG = `<svg viewBox="0 0 100 300" preserveAspectRatio="xMidYMid slice"><rect width="100" height="300" fill="url(#j-harl)"/>
<rect x="3" y="3" width="94" height="294" rx="8" fill="none" stroke="#ffd84d" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>
<text x="50" y="44" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="17" letter-spacing="2" fill="#fff" stroke="#ff3dc8" stroke-width=".8">JOKER</text>
<g class="face"><g transform="translate(0 92)">${JFACE}</g></g>
<rect x="14" y="238" width="72" height="26" rx="13" fill="#05050a" stroke="#b8ff3b" stroke-width="2.5"/><text x="50" y="257" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="16" letter-spacing="3" fill="#b8ff3b">WILD</text></svg><div class="ha">HA HA HA!</div>`;

/* ---------- rules / paytable ---------- */
const ORDER = ['7', 'B', 'b', 'w', 'g', 'o', 'p', 'l', 'c'];
const LINE_COLORS = ['#22f0ff', '#ff3dc8', '#b8ff3b', '#ffd84d', '#8b5cff', '#39ff88', '#ff8a3d', '#5ff6ff', '#ff6fd7', '#d4ff7a'];
function payTable(bet) {
  const lb = bet / E.LINES_N, v = (m, total) => bet ? fmtFull(Math.floor((total ? bet : lb) * m)) : `${m}×`;
  const unit = bet ? `Pays shown in Glow for a total bet of ${fmtFull(bet)} (line bet ${fmtFull(lb)}${lb % 1 ? '…' : ''}).` : 'Line pays are multiples of the line bet (total bet ÷ 10).';
  const rows = ORDER.map(k => `<div class="pr">${icon(k)}<div class="pv">${[5, 4, 3].map(n => `<i>${n}×</i>${v(E.PAYS[k][n - 3])}`).join('<br>')}</div></div>`).join('');
  const lines = E.LINES.map((L, i) => `<div><span>${i + 1}</span><svg viewBox="0 0 50 30">${[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${c * 10 + 1}" y="${r * 10 + 1}" width="8" height="8" rx="1.5" fill="${L[c] === r ? LINE_COLORS[i] : '#22223d'}"/>`).join('')).join('')}</svg></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">${unit}</p>
  <div class="ptab">${rows}
    <div class="pr wide">${icon('J')}<div class="pv txt"><b style="color:var(--p)">JOKER WILD</b> lands on reels 2, 3 and 4 and substitutes for every fruit, bell, BAR and 7 (not the star).</div></div>
    <div class="pr wide">${icon('S')}<div class="pv txt"><b style="color:var(--y)">STAR SCATTER</b> pays anywhere, × total bet: 5 → ${v(E.SCATTER_PAYS[2], 1)}, 4 → ${v(E.SCATTER_PAYS[1], 1)}, 3 → ${v(E.SCATTER_PAYS[0], 1)}.</div></div>
  </div>
  <div class="lab">10 paylines</div><div class="plines">${lines}</div>`;
}
const RULES = `<p>5 reels, 3 rows, <b>10 fixed paylines</b>. Wins need 3, 4 or 5 matching symbols on a line, left to right from reel 1. Only the best win per line pays; wins on different lines add up.</p>
<p><b>Expanding joker.</b> When a joker is part of a win it expands to fill its whole reel, then the wins pay. The expanded jokers stay <b>sticky</b> and the other reels <b>respin once</b>. Any new joker that lands during a respin also expands, sticks and awards another respin, up to <b>${E.MAX_RESPINS} respins</b>. Every respin pays its wins (stars too).</p>
<p><b>Gamble (optional).</b> After a win under ${E.GAMBLE_LIMIT}× your bet you may guess the colour of a face-down card: right doubles your win, wrong loses it. Up to ${E.GAMBLE_MAX} times, or press <b>Collect</b> at any point. It's a fair 50/50, so it doesn't change the RTP. You can switch the offer off in the panel.</p>
${payTable(0)}
<p>Maximum win ${fmtFull(E.MAX_WIN)}× the bet per spin. Theoretical RTP 96.2% (20M-spin simulation). Hit frequency about 22%; jokers expand about 1 spin in 11.</p>`;
gameHeader($('#panel'), { title: 'Neon Joker', rules: RULES });

/* ---------- controls ---------- */
const bet = BetControl($('#betslot'), { game: 'joker', min: 10, label: 'Total bet', onChange: paintBet });
const turboEl = $('#turbo'), gamOpt = $('#gamopt');
turboEl.checked = localStorage.getItem('afterglow:joker:turbo') === '1';
gamOpt.checked = localStorage.getItem('afterglow:joker:gamble') !== '0';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:joker:turbo', turboEl.checked ? '1' : '0'); };
gamOpt.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:joker:gamble', gamOpt.checked ? '1' : '0'); };
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTable(bet.value)}`); };
let busy = false, gambling = null;

function paintBet() { $('#totbet').textContent = fmtFull(bet.value); const lb = bet.value / 10; $('#linebet').textContent = (lb % 1 ? lb.toFixed(1) : fmtFull(lb)) + ' × 10'; }
function paint() {
  const spin = $('#spin');
  if (gambling) { spin.textContent = `COLLECT ${fmtFull(gambling.win)}`; spin.classList.add('collect'); spin.disabled = gambling.locked; }
  else { spin.textContent = busy ? 'GOOD LUCK' : 'SPIN'; spin.classList.remove('collect'); spin.disabled = busy; }
  const lock = busy || !!gambling;
  bet.disable(lock); turboEl.disabled = lock; gamOpt.disabled = lock;
  paintBet();
}

/* ---------- line numbers (both sides, grouped by start/end row) ---------- */
function buildLineNums() {
  for (const [id, col] of [['#lnL', 0], ['#lnR', 4]]) {
    const host = $(id);
    host.innerHTML = [0, 1, 2].map(r => `<div>${E.LINES.map((L, i) => L[col] === r ? `<span data-l="${i}" style="--lc:${LINE_COLORS[i]}">${i + 1}</span>` : '').join('')}</div>`).join('');
  }
}
buildLineNums();
const lineBadges = i => $$(`.jk-ln span[data-l="${i}"]`);

/* ---------- reels ---------- */
const reelsEl = $('#reels'), linesSvg = $('#lines'), frame = $('#frame'), cab = $('#cab');
const reels = [];
const START = [4, 9, 15, 21, 27];
for (let i = 0; i < E.REELS; i++) {
  const el = reelsEl.appendChild(h(`<div class="reel"><div class="strip"></div></div>`));
  reels.push({ el, strip: $('.strip', el) });
  setStrip(i, START[i]);
}
function setStrip(i, stop) {
  const S = E.STRIPS[i], n = S.length, st = reels[i].strip;
  st.getAnimations().forEach(a => a.cancel());
  st.innerHTML = [S[(stop - 1 + n) % n], ...E.column(i, stop), S[(stop + 3) % n]].map(cellHTML).join('');
  st.style.transform = 'translateY(-20%)';
}
const cellAt = (i, r) => reels[i].strip.children[1 + r];
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;

async function animateSpin(res, sticky) {
  const turbo = turboEl.checked, red = reduced();
  const perCell = turbo ? 32 : 46;
  const times = []; let t = 0, scat = 0, prev = -1;
  for (let i = 0; i < E.REELS; i++) {
    if (sticky.includes(i)) { times.push(null); scat += 0; continue; }
    const anticipate = scat >= 2;
    t = prev < 0 ? (turbo ? 320 : 700) : t + (turbo ? 110 : 220) + (anticipate ? (turbo ? 800 : 1400) : 0);
    times.push({ t: red ? 120 + i * 70 : t, anticipate: anticipate && !red });
    prev = i;
    scat += res.grid[i].includes('S') ? 1 : 0;
  }
  sfx('spin');
  const spinT = setInterval(() => sfx('spin'), turbo ? 180 : 260);
  const anims = res.grid.map((col, i) => {
    if (!times[i]) return null;
    const { strip, el } = reels[i], S = E.STRIPS[i], n = S.length, stop = res.stops[i];
    const old = [...strip.children].slice(1, 4).map(c => c.classList[1].slice(2));
    const F = Math.max(4, Math.round(times[i].t / perCell));
    const filler = Array.from({ length: F }, (_, j) => S[(stop + 3 + j) % n]);
    const seq = [S[(stop - 1 + n) % n], ...col, ...filler, ...old, 'c'];
    strip.getAnimations().forEach(a => a.cancel());
    strip.innerHTML = seq.map(cellHTML).join('');
    const N = seq.length, from = -(N - 4) / N * 100, to = -1 / N * 100;
    if (!red) el.classList.add('spinning');
    const a = strip.animate([{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
      { duration: times[i].t, easing: red ? 'linear' : 'cubic-bezier(.35,.05,.35,1.06)', fill: 'forwards' });
    if (!red) setTimeout(() => el.classList.remove('spinning'), Math.max(0, times[i].t - (turbo ? 90 : 160)));
    return a;
  });
  let last = 0;
  for (let i = 0; i < E.REELS; i++) {
    if (!anims[i]) continue;
    if (times[i].anticipate) {
      await sleep(Math.max(0, times[i].t - last - (turbo ? 800 : 1400)) + 20);
      reels[i].el.classList.add('antic'); sfx('rise'); buzz(15);
    }
    await anims[i].finished.catch(() => {});
    last = times[i].t;
    reels[i].el.classList.remove('antic', 'spinning');
    setStrip(i, res.stops[i]);
    sfx('stop'); buzz(8);
    if (res.grid[i].includes('S')) { sfx('reveal'); res.grid[i].forEach((g, r) => g === 'S' && cellAt(i, r).classList.add('land')); }
    if (res.grid[i].includes('J')) res.grid[i].forEach((g, r) => g === 'J' && cellAt(i, r).classList.add('land'));
  }
  clearInterval(spinT);
}

/* ---------- expanding jokers ---------- */
function clearBig() { $$('.jk-big', reelsEl).forEach(b => b.remove()); }
async function expand(reelIdxs, grid) {
  for (const i of reelIdxs) {
    const row = Math.max(0, grid[i].indexOf('J'));
    const b = h(`<div class="jk-big" style="--oy:${(row * 33.3 + 16.6).toFixed(1)}%">${BIG}</div>`);
    reels[i].el.appendChild(b);
    [0, 1, 2].forEach(r => { const c = cellAt(i, r); c.className = 'cell k-J'; c.innerHTML = icon('J'); });
    sfx('boom'); buzz([20, 30, 40]);
    const rc = reels[i].el.getBoundingClientRect();
    if (!reduced()) burst(rc.left + rc.width / 2, rc.top + rc.height / 2, { count: 28, speed: 6, colors: ['#ff3dc8', '#b8ff3b', '#ffd84d'], gravity: 0.12 });
    await sleep(320);
    b.classList.add('laugh');
    [0, 140, 280].forEach(d => setTimeout(() => sfx('gem'), d));
    await sleep(turboEl.checked ? 450 : 800);
  }
  unlock('joker');
}

/* ---------- wins ---------- */
function clearWins() {
  linesSvg.innerHTML = ''; reelsEl.classList.remove('won');
  $$('.cell.win', reelsEl).forEach(c => c.classList.remove('win'));
  $$('.jk-ln span.on').forEach(s => s.classList.remove('on'));
}
function centers() {
  const fr = frame.getBoundingClientRect();
  linesSvg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`);
  return reels.map(r => { const b = r.el.getBoundingClientRect(), c = b.width; return { x: b.left - fr.left + c / 2, y: row => b.top - fr.top + c * (row + 0.5) }; });
}
function showWins(ev) {
  if (!ev.lines.length && !ev.scatter.win) return;
  reelsEl.classList.add('won');
  const C = centers(), fr = frame.getBoundingClientRect();
  for (const w of ev.lines) {
    const L = E.LINES[w.line], col = LINE_COLORS[w.line];
    // draw the full line edge to edge, so it meets the numbers on both sides
    const pts = [[0, C[0].y(L[0])], ...L.map((r, i) => [C[i].x, C[i].y(r)]), [fr.width, C[4].y(L[4])]];
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const p = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    linesSvg.insertAdjacentHTML('beforeend', `<polyline points="${p}" stroke="${col}" style="--len:${Math.ceil(len)};filter:drop-shadow(0 0 6px ${col})"/><polyline class="core" points="${p}" style="--len:${Math.ceil(len)}"/>`);
    w.cells.forEach(([i, r]) => cellAt(i, r).classList.add('win'));
    lineBadges(w.line).forEach(s => s.classList.add('on'));
  }
  if (ev.scatter.win) ev.scatter.cells.forEach(([i, r]) => cellAt(i, r).classList.add('win'));
  const big = ev.total >= 2;
  if (!reduced()) burst(fr.left + fr.width / 2, fr.top + fr.height / 2, { count: big ? 50 : 18, speed: big ? 8 : 5, colors: ['#ff3dc8', '#b8ff3b', '#ffd84d', '#22f0ff'], gravity: 0.15 });
}
function winMessage(ev) {
  const best = ev.lines.slice().sort((a, b) => b.win - a.win)[0], parts = [];
  if (ev.scatter.win) parts.push(`${ev.scatter.count} stars`);
  if (best) parts.push(`${best.count}× ${E.SYMBOLS[best.sym]}${ev.lines.length > 1 ? ` + ${ev.lines.length - 1} more line${ev.lines.length > 2 ? 's' : ''}` : ` · line ${best.line + 1}`}`);
  return parts.join(' · ');
}
let shownWin = 0;
function countWin(to, msg, ms) {
  const box = $('#winbox'); box.classList.toggle('on', to > 0);
  if (msg != null) $('#winmsg').textContent = msg;
  const lo = Math.min(shownWin, to), hi = Math.max(shownWin, to); // clamp: rAF time can precede the tween start
  tween(shownWin, to, ms, v => ($('#winamt').textContent = fmtFull(Math.min(hi, Math.max(lo, v))))); shownWin = to;
}
function banner(html, ms) {
  const b = $('#banner'); b.innerHTML = `<div class="in">${html}</div>`; b.hidden = false;
  return new Promise(res => { let done = false; const end = () => { if (done) return; done = true; b.hidden = true; b.onclick = null; res(); }; b.onclick = end; sleep(ms).then(end); });
}
function paintRespins(n, show) {
  const r = $('#rsp'); r.hidden = !show;
  $$('i', r).forEach((d, i) => d.classList.toggle('on', i < n));
}

/* ---------- gamble (optional, before the single settle) ---------- */
const SUIT_CH = { h: '♥', d: '♦', c: '♣', s: '♠' };
function gamble(round, win, stake) {
  return new Promise(resolve => {
    const g = $('#gam'), card = $('#gcard'), face = $('#gface'), res = $('#gres'), hist = $('#ghist');
    gambling = { win, step: 0, locked: false };
    hist.innerHTML = ''; res.textContent = ''; card.classList.remove('flip');
    const paintG = () => {
      $('#gwin').textContent = fmtFull(gambling.win); $('#gnext').textContent = fmtFull(gambling.win * 2);
      $$('#gsteps i').forEach((d, i) => d.classList.toggle('on', i < gambling.step));
      const lock = gambling.locked || !E.canGamble(win, stake, gambling.step);
      $('#gred').disabled = $('#gblk').disabled = lock; $('#gcol').disabled = gambling.locked;
      $('#gcol').textContent = `Collect ${fmtFull(gambling.win)}`;
      paint();
    };
    const finish = () => { g.hidden = true; const w = gambling.win; gambling = null; resolve(w); };
    const pick = async wantRed => {
      if (gambling.locked) return;
      gambling.locked = true; paintG(); sfx('card'); buzz(10);
      card.classList.remove('flip'); await sleep(card.classList.contains('shown') ? 260 : 0);
      const c = E.gambleCard(await round.float());
      face.textContent = SUIT_CH[c.suit]; face.className = 'cf ' + (c.red ? 'red' : 'black');
      card.classList.add('flip', 'shown'); await sleep(480);
      hist.insertAdjacentHTML('afterbegin', `<span style="color:${c.red ? '#e8174a' : '#14141f'}">${SUIT_CH[c.suit]}</span>`);
      if (c.red === wantRed) {
        gambling.win *= 2; gambling.step++;
        res.innerHTML = `<span style="color:var(--l)">DOUBLED!</span>`; sfx('win'); buzz(20);
        countWin(gambling.win, `Gamble ×${2 ** gambling.step}`, 400);
        const r = card.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, { count: 24, speed: 6, colors: ['#b8ff3b', '#ffd84d', '#ff3dc8'] });
        gambling.locked = false; paintG();
        if (gambling.step >= E.GAMBLE_MAX) { res.innerHTML = `<span style="color:var(--l)">MAXED OUT · collecting</span>`; await sleep(900); finish(); }
      } else {
        gambling.win = 0; res.innerHTML = `<span style="color:var(--r)">The joker laughs last…</span>`; sfx('lose'); buzz(40);
        countWin(0, 'Gamble lost', 300); paintG();
        await sleep(1100); finish();
      }
    };
    $('#gred').onclick = () => pick(true);
    $('#gblk').onclick = () => pick(false);
    $('#gcol').onclick = () => { if (!gambling || gambling.locked) return; sfx('cash'); finish(); };
    g.hidden = false; paintG();
  });
}

/* ---------- round ---------- */
const SPIN_MSGS = ['Send in the clowns', 'Lights up, reels down', 'Feeling jolly?', 'Pull the neon lever', 'The joker is watching'];
async function play() {
  if (busy) return;
  busy = true; paint();
  const stake = bet.value;
  const r = await startRound('joker', stake);
  if (!r) { busy = false; paint(); return; }
  sfx('bet'); buzz(10);
  clearWins(); clearBig(); paintRespins(0, false);
  shownWin = 0; $('#winamt').textContent = '0'; $('#winbox').classList.remove('on');
  $('#winmsg').textContent = SPIN_MSGS[(r.nonce >>> 0) % SPIN_MSGS.length];
  const turbo = () => turboEl.checked;

  const base = E.spin(await r.floats(5));
  await animateSpin(base, []);
  let sticky = E.expansions(base.grid, [], true), respins = 0;
  if (sticky.length) { cab.classList.add('hot'); await expand(sticky, base.grid); }
  let ev = E.evaluate(E.expandGrid(base.grid, sticky)), total = ev.total, lines = ev.lines.length;
  if (ev.total) {
    showWins(ev); countWin(Math.floor(stake * total), winMessage(ev), ev.total >= 2 ? 900 : 500);
    sfx(ev.total >= 1 ? 'win' : 'gem'); buzz(12);
    await sleep(turbo() ? 600 : 1100);
  }
  let pending = sticky.length > 0;
  if (pending) await banner(`<div class="k">Jokers hold</div><div class="t">RESPIN</div><div class="s">${sticky.length} sticky reel${sticky.length > 1 ? 's' : ''}</div>`, turbo() ? 900 : 1400);
  while (pending && respins < E.MAX_RESPINS) {
    respins++; paintRespins(respins, true);
    clearWins();
    $('#winmsg').textContent = `Respin ${respins} of up to ${E.MAX_RESPINS}`;
    const rs = E.spin(await r.floats(5), sticky);
    await animateSpin(rs, sticky);
    const add = E.expansions(rs.grid, sticky, false);
    if (add.length) await expand(add, rs.grid);
    sticky = [...sticky, ...add].sort();
    ev = E.evaluate(E.expandGrid(rs.grid, sticky)); total += ev.total; lines += ev.lines.length;
    if (ev.total) { showWins(ev); countWin(Math.floor(stake * Math.min(total, E.MAX_WIN)), `Respin ${respins} · ${winMessage(ev)}`, 700); sfx(ev.total >= 1 ? 'win' : 'gem'); buzz(12); }
    pending = add.length > 0;
    if (pending && respins < E.MAX_RESPINS) { sfx('level'); await banner(`<div class="k">New joker</div><div class="t">+1 RESPIN</div><div class="s">${sticky.length} sticky reels</div>`, turbo() ? 800 : 1200); }
    else await sleep(ev.total ? (turbo() ? 600 : 1000) : (turbo() ? 250 : 450));
  }
  cab.classList.remove('hot');
  const capped = total > E.MAX_WIN; total = Math.min(total, E.MAX_WIN);
  let win = Math.floor(stake * total);
  if (respins) countWin(win, `Total · ${respins} respin${respins > 1 ? 's' : ''}${capped ? ' · max win' : ''}`, 600);

  let gSteps = 0, gLost = false;
  if (gamOpt.checked && E.canGamble(win, stake, 0)) {
    const before = win;
    win = await gamble(r, win, stake);
    gSteps = win ? Math.round(Math.log2(win / before)) : -1; gLost = !win;
  }

  const mult = win / stake;
  r.settle(win, { mult, detail: `${fmtFull(stake)} bet · ${lines} line${lines === 1 ? '' : 's'}${respins ? ` · ${respins} respins` : ''}${gSteps > 0 ? ` · gamble ×${2 ** gSteps}` : gLost ? ' · gamble lost' : ''} · ${fmtX(mult)}` });
  $('#lastwin').textContent = $('#lastwin2').textContent = fmtFull(win);
  $('#lastwin').style.color = win > stake ? 'var(--l)' : win ? 'var(--txt)' : 'var(--faint)';
  pushRecent($('#recent'), (respins ? 'J ' : '') + fmtX(mult), mult >= 10 ? 'b' : mult >= 1 ? 'w' : '');
  if (!win && !gLost) { $('#winmsg').textContent = 'No win · spin again'; }
  else if (win) countWin(win, gSteps > 0 ? `Collected · gamble ×${2 ** gSteps}` : $('#winmsg').textContent, 300);
  busy = false; paint();
}

$('#spin').onclick = () => { if (gambling) { $('#gcol').click(); return; } play(); };
addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat) return;
  if (e.target.closest?.('input,textarea,select') || $('.scrim')) return;
  e.preventDefault();
  if (!$('#banner').hidden) { $('#banner').click(); return; }
  $('#spin').click();
});
addEventListener('keyup', e => { if (e.code === 'Space' && e.target.closest?.('button') && !$('.scrim')) e.preventDefault(); });
paint();
