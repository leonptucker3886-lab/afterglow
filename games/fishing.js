import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmt, fmtFull, fmtX, unlock, sleep, tween, modal, state } from '/core/ag.js';
import * as E from '/games/fishing-engine.js';

boot({ nav: 'games' });

/* ---------- original SVG symbol art ---------- */
const letter = (ch, g, st) => `<text x="50" y="74" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="70" fill="url(#${g})" stroke="${st}" stroke-width="3" paint-order="stroke">${ch}</text><path d="M18 86q32 8 64 0" stroke="${st}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;
const ART = {
  j: letter('J', 'f-j', '#bffbff'),
  q: letter('Q', 'f-q', '#e2d6ff'),
  k: letter('K', 'f-k', '#efffc9'),
  a: letter('A', 'f-a', '#ffd0f3'),
  // dragonfly lure
  L: `<path d="M50 30L50 80" stroke="url(#f-lb)" stroke-width="9" stroke-linecap="round"/><g opacity=".85"><ellipse cx="30" cy="38" rx="22" ry="8" fill="url(#f-wing)" transform="rotate(-14 30 38)"/><ellipse cx="70" cy="38" rx="22" ry="8" fill="url(#f-wing)" transform="rotate(14 70 38)"/><ellipse cx="32" cy="52" rx="19" ry="7" fill="url(#f-wing)" transform="rotate(12 32 52)"/><ellipse cx="68" cy="52" rx="19" ry="7" fill="url(#f-wing)" transform="rotate(-12 68 52)"/></g><path d="M22 36q8-4 16 0M62 36q8-4 16 0" stroke="#fff" stroke-width="1.4" opacity=".6" fill="none"/><circle cx="50" cy="24" r="9" fill="#ff3dc8" stroke="#ffd0f3" stroke-width="2"/><circle cx="46" cy="22" r="2.6" fill="#fff"/><circle cx="54" cy="22" r="2.6" fill="#fff"/><path d="M50 82v8q0 6-6 6t-6-5" stroke="#e6e8ff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M38 91l-2-4" stroke="#e6e8ff" stroke-width="3" stroke-linecap="round"/>`,
  // float / bobber
  B: `<ellipse cx="50" cy="86" rx="38" ry="7" fill="none" stroke="#22f0ff" stroke-width="2" opacity=".6"/><ellipse cx="50" cy="86" rx="24" ry="4" fill="none" stroke="#22f0ff" stroke-width="2" opacity=".85"/><path d="M50 6v24" stroke="#e6e8ff" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="8" r="5" fill="#ffd84d"/><path d="M22 54a28 28 0 0 1 56 0z" fill="url(#f-bt)"/><path d="M22 54a28 28 0 0 0 56 0z" fill="url(#f-bw)"/><rect x="21" y="51" width="58" height="6" rx="3" fill="#1a0b3a"/><ellipse cx="40" cy="40" rx="8" ry="5" fill="#fff" opacity=".55" transform="rotate(-30 40 40)"/>`,
  // fishing rod
  R: `<path d="M14 92L88 10" stroke="url(#f-rod)" stroke-width="5" stroke-linecap="round"/><path d="M14 92L30 74" stroke="#a8693a" stroke-width="10" stroke-linecap="round"/><circle cx="36" cy="72" r="11" fill="#1a2b4a" stroke="#22f0ff" stroke-width="3"/><circle cx="36" cy="72" r="4" fill="#22f0ff"/><path d="M36 72l8 3" stroke="#e6e8ff" stroke-width="2.4" stroke-linecap="round"/><path d="M88 10Q92 44 78 66" stroke="#eaffd0" stroke-width="1.6" fill="none" opacity=".9"/><path d="M78 66v8q0 6 6 6t5-5" stroke="#ffd84d" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="88" cy="10" r="3" fill="#b8ff3b"/>`,
  // tackle box
  T: `<path d="M16 46L26 22H74L84 46Z" fill="url(#f-lid)" stroke="#ffe7a8" stroke-width="2"/><rect x="24" y="28" width="12" height="10" rx="2" fill="#ff3dc8"/><rect x="40" y="28" width="12" height="10" rx="2" fill="#22f0ff"/><rect x="56" y="28" width="12" height="10" rx="2" fill="#b8ff3b"/><rect x="10" y="46" width="80" height="42" rx="7" fill="url(#f-box)" stroke="#ffe7a8" stroke-width="2.5"/><rect x="10" y="58" width="80" height="5" fill="#7a3a00" opacity=".55"/><rect x="42" y="54" width="16" height="14" rx="3" fill="#ffd84d" stroke="#7a3a00" stroke-width="2"/><path d="M38 46v-4h24v4" stroke="#ffe7a8" stroke-width="3" fill="none"/><path d="M18 78h22" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>`,
  // cash fish (body uses currentColor so the tier colour comes from CSS)
  F: `<path d="M8 50Q30 18 64 38L88 22Q82 50 88 78L64 62Q30 82 8 50Z" fill="currentColor"/><path d="M8 50Q30 82 64 62L60 56Q32 64 12 52Z" fill="#fff" opacity=".35"/><path d="M34 30Q44 14 58 34" fill="currentColor" stroke="#fff" stroke-width="1.5" opacity=".9"/><path d="M40 42q6 8 0 16M50 42q6 8 0 16" stroke="#04131c" stroke-width="2" fill="none" opacity=".35"/><circle cx="22" cy="45" r="5.5" fill="#fff"/><circle cx="21" cy="45" r="3" fill="#04131c"/><path d="M10 54q5 2 9 0" stroke="#04131c" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="36" rx="10" ry="4" fill="#fff" opacity=".45" transform="rotate(-20 34 36)"/>`,
  // ANGLER wild: cheerful fisher with a glowing rod
  W: `<circle cx="50" cy="50" r="47" fill="url(#f-wbg)"/><path d="M74 96L95 6" stroke="#b8ff3b" stroke-width="4" stroke-linecap="round" style="filter:drop-shadow(0 0 4px #b8ff3b)"/><path d="M95 6Q99 30 88 44" stroke="#eaffd0" stroke-width="1.4" fill="none"/><circle cx="88" cy="46" r="4" fill="#ffd84d"/><path d="M14 100Q16 72 44 70Q72 72 76 100Z" fill="url(#f-vest)"/><path d="M44 72v28" stroke="#063a2a" stroke-width="2" opacity=".5"/><circle cx="44" cy="50" r="20" fill="#ffcf9e"/><circle cx="31" cy="56" r="4" fill="#ff7aa8" opacity=".6"/><circle cx="57" cy="56" r="4" fill="#ff7aa8" opacity=".6"/><path d="M35 49q3-4 6 0M47 49q3-4 6 0" stroke="#3a1a08" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M36 58q8 8 16 0" stroke="#3a1a08" stroke-width="2.6" fill="#7a1a20" stroke-linecap="round"/><path d="M16 38Q44 28 72 38L66 42Q44 36 22 42Z" fill="#0a8fa8"/><path d="M26 38Q28 18 44 18Q60 18 62 38Z" fill="url(#f-hat)"/><rect x="26" y="32" width="36" height="5" fill="#ff3dc8"/><circle cx="56" cy="30" r="3" fill="#ffd84d"/><circle cx="74" cy="82" r="6" fill="#ffcf9e"/><rect x="16" y="80" width="56" height="17" rx="8.5" fill="#062a12" stroke="#b8ff3b" stroke-width="2"/><text x="44" y="93" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="12" letter-spacing="2" fill="#b8ff3b">WILD</text>`,
  // BOAT scatter
  S: `<circle cx="50" cy="48" r="44" fill="url(#f-sbg)"/><path d="M50 14v42" stroke="#e6e8ff" stroke-width="3"/><path d="M53 16L78 50H53Z" fill="url(#f-sail)"/><path d="M47 22L28 50H47Z" fill="#22f0ff" opacity=".8"/><path d="M14 58H86L76 74H24Z" fill="url(#f-hull)" stroke="#ffe7a8" stroke-width="2"/><circle cx="36" cy="65" r="2.6" fill="#ffd84d"/><circle cx="50" cy="65" r="2.6" fill="#ffd84d"/><circle cx="64" cy="65" r="2.6" fill="#ffd84d"/><path d="M10 78q10-5 20 0t20 0 20 0 20 0" stroke="#22f0ff" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="20" y="82" width="60" height="15" rx="7.5" fill="#2a1600" stroke="#ffd84d" stroke-width="2"/><text x="50" y="93.5" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="11" letter-spacing="2" fill="#ffd84d">BONUS</text>`,
};
const DEFS = `<defs>
<linearGradient id="f-j" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4feff"/><stop offset="1" stop-color="#00a8c8"/></linearGradient>
<linearGradient id="f-q" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0d4ff"/><stop offset="1" stop-color="#6a3cff"/></linearGradient>
<linearGradient id="f-k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2ffc8"/><stop offset="1" stop-color="#6cbf00"/></linearGradient>
<linearGradient id="f-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd0f3"/><stop offset="1" stop-color="#d0128f"/></linearGradient>
<linearGradient id="f-lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6fd7"/><stop offset=".5" stop-color="#8b5cff"/><stop offset="1" stop-color="#22f0ff"/></linearGradient>
<linearGradient id="f-wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0fdff" stop-opacity=".95"/><stop offset="1" stop-color="#22f0ff" stop-opacity=".35"/></linearGradient>
<linearGradient id="f-bt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9ae4"/><stop offset="1" stop-color="#ff3dc8"/></linearGradient>
<linearGradient id="f-bw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9fb4d8"/></linearGradient>
<linearGradient id="f-rod" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#22f0ff"/><stop offset="1" stop-color="#b8ff3b"/></linearGradient>
<linearGradient id="f-lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf6a"/><stop offset="1" stop-color="#ff8a1f"/></linearGradient>
<linearGradient id="f-box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb43d"/><stop offset="1" stop-color="#d0480a"/></linearGradient>
<radialGradient id="f-wbg" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#1b6b4a"/><stop offset=".7" stop-color="#0a2e2a"/><stop offset="1" stop-color="#b8ff3b" stop-opacity=".3"/></radialGradient>
<linearGradient id="f-vest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb43d"/><stop offset="1" stop-color="#ff6a1a"/></linearGradient>
<linearGradient id="f-hat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ff6ff"/><stop offset="1" stop-color="#0a8fa8"/></linearGradient>
<radialGradient id="f-sbg" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#3a2a08"/><stop offset=".7" stop-color="#140c22"/><stop offset="1" stop-color="#ffd84d" stop-opacity=".3"/></radialGradient>
<linearGradient id="f-sail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd84d"/></linearGradient>
<linearGradient id="f-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6fd7"/><stop offset="1" stop-color="#8b1a6a"/></linearGradient>
</defs>`;
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${Object.entries(ART).map(([k, v]) => `<symbol id="sym-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#sym-${k}"/></svg>`;
const fishColor = v => v >= 1000 ? '#ffd84d' : v >= 250 ? '#ff8a3d' : v >= 50 ? '#ff3dc8' : v >= 15 ? '#b8ff3b' : v >= 10 ? '#8b5cff' : '#22f0ff';
let stakeShown = 100;
const fishLabel = v => fmt(v * stakeShown);
const cellHTML = c => c.k === 'F'
  ? `<div class="cell k-F" style="color:${fishColor(c.v)}">${icon('F')}<b class="fv">${fishLabel(c.v)}</b></div>`
  : `<div class="cell k-${c.k}">${icon(c.k)}</div>`;

/* ---------- rules / paytable ---------- */
const ORDER = ['T', 'R', 'F', 'B', 'L', 'a', 'k', 'q', 'j'];
const LINE_COLORS = ['#22f0ff', '#ff3dc8', '#b8ff3b', '#ffd84d', '#8b5cff', '#39ff88', '#ff8a3d', '#5ff6ff', '#ff6fd7', '#d4ff7a'];
function payTable(stake) {
  const v = m => stake ? fmtFull(Math.floor(stake * m)) : (+m.toFixed(2)) + '×';
  const unit = stake ? `Pays shown in Glow for a total bet of ${fmtFull(stake)}.` : 'Pays are multiples of your total bet (10 fixed lines).';
  const rows = ORDER.map(k => `<div class="pr">${k === 'F' ? `<span style="color:#b8ff3b;display:contents">${icon('F')}</span>` : icon(k)}<div class="pv">${[5, 4, 3].map(n => `<i>${n}×</i>${v(E.PAYS[k][n - 3] / E.LINES_N)}`).join('<br>')}</div></div>`).join('');
  const lines = E.LINES.map((L, i) => `<div><span>${i + 1}</span><svg viewBox="0 0 50 30">${[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${c * 10 + 1}" y="${r * 10 + 1}" width="8" height="8" rx="1.5" fill="${L[c] === r ? LINE_COLORS[i] : '#22223d'}"/>`).join('')).join('')}</svg></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">${unit}</p>
  <div class="ptab">${rows}
    <div class="pr wide">${icon('W')}<div class="pv txt"><b style="color:var(--l)">ANGLER WILD</b> lands on reels 2-5 and substitutes for every symbol except the boat. In free spins each angler collects every fish on screen.</div></div>
    <div class="pr wide">${icon('S')}<div class="pv txt"><b style="color:var(--y)">BOAT SCATTER</b> anywhere: 3 → 10, 4 → 15, 5 → 20 free spins.</div></div>
    <div class="pr wide"><span style="color:#ff3dc8;display:contents">${icon('F')}</span><div class="pv txt"><b style="color:var(--p)">CASH FISH</b> carry a value of ${E.FISH_VALUES.map(x => v(x)).join(', ')}. They pay as a normal line symbol, and their cash is reeled in by anglers.</div></div>
  </div>
  <div class="lab">10 paylines</div><div class="plines">${lines}</div>`;
}
const RULES = `<p>Five reels, three rows, <b>10 fixed paylines</b>. Wins need 3, 4 or 5 matching symbols on a line, left to right from reel 1. The highest win per line pays; different lines add up.</p>${payTable(0)}
<p><b>Free spins.</b> 3, 4 or 5 boats award 10, 15 or 20 free spins at the triggering bet. During free spins every <b>Angler wild</b> that lands casts out and reels in <b>all</b> cash fish on screen. Two anglers collect everything twice.</p>
<p><b>Level up.</b> Every 4th angler collected awards <b>+10 spins</b> and upgrades the fish multiplier for the following spins: <b>2×</b>, then <b>3×</b>, then <b>10×</b>. The progress track shows 4 pips per level and the fish caught counter keeps score.</p>
<p><b>Splash feature.</b> In the base game, a spin with fish but no angler can randomly get a splash: an angler leaps onto reels 2-5, counts as a wild and collects every fish once.</p>
<p><b>Max win</b> is capped at 5,000× the bet per round (base spin plus all its free spins). The round ends once the cap is reached.</p>
<p>RTP 96.3%, measured over 20M simulated rounds of this exact engine. Hit frequency about 24%. Free spins about 1 in 230 spins, splash about 1 in 175.</p>`;
gameHeader($('#panel'), { title: 'Lucky Lure', rules: RULES });

/* ---------- controls ---------- */
const bet = BetControl($('#betslot'), { game: 'fishing', min: 10, label: 'Total bet', onChange: v => { if (!busy) { stakeShown = v; relabel(); } } });
stakeShown = bet.value;
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:fishing:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:fishing:turbo', turboEl.checked ? '1' : '0'); };
const turbo = () => turboEl.checked;
let busy = false;
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTable(bet.value)}`); };
function paint() {
  const s = $('#spin'); s.disabled = busy; s.textContent = busy ? 'REELING…' : 'SPIN';
  bet.disable(busy);
}
function relabel() { $$('.cell.k-F', reelsEl).forEach(c => { const v = +c.dataset.v; if (v) $('.fv', c).textContent = fishLabel(v); }); }

/* ---------- reels ---------- */
const reelsEl = $('#reels'), linesSvg = $('#lines'), castSvg = $('#cast'), frame = $('#frame');
const reels = [];
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
// cosmetic filler only (never decides an outcome)
const COS = { base: E.WEIGHTS.base, fs: E.WEIGHTS.fs };
function cosmetic(mode, r) {
  const w = COS[mode][r], tot = w.reduce((a, b) => a + b, 0); let x = Math.random() * tot;
  for (let i = 0; i < w.length; i++) if ((x -= w[i]) < 0) { const k = E.KEYS[i]; return { k, v: k === 'F' ? E.FISH_VALUES[Math.floor(Math.random() * 7)] : 0 }; }
  return { k: 'j', v: 0 };
}
const INIT = [['q', 'T', 'k'], ['a', 'F', 'j'], ['R', 'W', 'B'], ['k', 'F', 'L'], ['j', 'S', 'a']];
for (let i = 0; i < E.REELS; i++) {
  const el = reelsEl.appendChild(h(`<div class="reel"><div class="strip"></div></div>`));
  reels.push({ el, strip: $('.strip', el) });
  setStrip(i, INIT[i].map((k, r) => ({ k, v: k === 'F' ? [5, 10][i % 2] : 0 })));
}
function setStrip(i, col, mode = 'base') {
  const st = reels[i].strip; st.getAnimations().forEach(a => a.cancel());
  st.innerHTML = [cosmetic(mode, i), ...col, cosmetic(mode, i)].map(cellHTML).join('');
  [...st.children].forEach((c, j) => { if (j >= 1 && j <= 3 && col[j - 1].k === 'F') c.dataset.v = col[j - 1].v; });
  st.style.transform = 'translateY(-20%)';
}
const cellAt = (i, r) => reels[i].strip.children[1 + r];
const colOf = (res, i, show) => show[i].map((k, r) => ({ k, v: res.vals[i][r] }));

async function animateSpin(res, mode, show) {
  const t0 = turbo(), red = reduced();
  clearWins();
  const perCell = t0 ? 30 : 44;
  const times = []; let t = 0, boats = 0;
  for (let i = 0; i < E.REELS; i++) {
    const anticipate = mode === 'base' && boats >= 2;
    t = i === 0 ? (t0 ? 300 : 680) : t + (t0 ? 100 : 220) + (anticipate ? (t0 ? 800 : 1400) : 0);
    times.push({ t: red ? 120 + i * 70 : t, anticipate: anticipate && !red });
    boats += show[i].includes('S') ? 1 : 0;
  }
  sfx('spin');
  const spinT = setInterval(() => sfx('spin'), t0 ? 180 : 260);
  const anims = show.map((_, i) => {
    const { strip, el } = reels[i];
    const old = [...strip.children].slice(1, 4).map(c => ({ k: c.className.match(/k-(\w)/)[1], v: +c.dataset.v || 0 }));
    const F = Math.max(4, Math.round(times[i].t / perCell));
    const seq = [cosmetic(mode, i), ...colOf(res, i, show), ...Array.from({ length: F }, () => cosmetic(mode, i)), ...old, cosmetic(mode, i)];
    strip.getAnimations().forEach(a => a.cancel());
    strip.innerHTML = seq.map(cellHTML).join('');
    const N = seq.length, from = -(N - 4) / N * 100, to = -1 / N * 100;
    if (!red) el.classList.add('spinning');
    const a = strip.animate([{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
      { duration: times[i].t, easing: red ? 'linear' : 'cubic-bezier(.35,.05,.35,1.06)', fill: 'forwards' });
    if (!red) setTimeout(() => el.classList.remove('spinning'), Math.max(0, times[i].t - (t0 ? 90 : 160)));
    return a;
  });
  for (let i = 0; i < E.REELS; i++) {
    if (times[i].anticipate) {
      await sleep(Math.max(0, times[i].t - times[i - 1].t - (t0 ? 800 : 1400)) + 20);
      reels[i].el.classList.add('antic'); sfx('rise'); buzz(15);
      $('#winmsg').textContent = 'One more boat…';
    }
    await anims[i].finished.catch(() => {});
    reels[i].el.classList.remove('antic', 'spinning');
    setStrip(i, colOf(res, i, show), mode);
    sfx('stop'); buzz(8);
    const col = show[i];
    if (col.includes('S') || col.includes('W')) { sfx('reveal'); col.forEach((g, r) => (g === 'S' || g === 'W') && cellAt(i, r).classList.add('land')); }
    else if (col.includes('F')) sfx('tick');
  }
  clearInterval(spinT);
}

function clearWins() {
  linesSvg.innerHTML = ''; castSvg.innerHTML = ''; reelsEl.classList.remove('won');
  $$('.cell.win,.cell.hook,.cell.caught,.cell.angl', reelsEl).forEach(c => c.classList.remove('win', 'hook', 'caught', 'angl'));
  $$('.ll-fly,.ll-pop,.ll-splash', frame).forEach(e => e.remove());
  $('#winbox').classList.remove('on');
}
// cell centre relative to the frame
function ctr(i, r) {
  const fr = frame.getBoundingClientRect(), b = reels[i].el.getBoundingClientRect(), c = b.width;
  return { x: b.left - fr.left + c / 2, y: b.top - fr.top + c * (r + 0.5), c };
}
function sizeSvg(svg) { const fr = frame.getBoundingClientRect(); svg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`); }
function showLines(res) {
  if (!res.lines.length) return;
  reelsEl.classList.add('won'); sizeSvg(linesSvg);
  for (const w of res.lines) {
    const L = E.LINES[w.line], P = L.map((r, i) => ctr(i, r)), pts = P.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    let len = 0; for (let i = 1; i < 5; i++) len += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
    const col = LINE_COLORS[w.line];
    linesSvg.insertAdjacentHTML('beforeend', `<polyline points="${pts}" stroke="${col}" style="--len:${Math.ceil(len)};filter:drop-shadow(0 0 6px ${col})"/><polyline class="core" points="${pts}" style="--len:${Math.ceil(len)}"/>`);
    w.cells.forEach(([i, r]) => cellAt(i, r).classList.add('win'));
  }
}
function popText(x, y, text, color) {
  const p = frame.appendChild(h(`<div class="ll-pop" style="left:${x}px;top:${y}px;color:${color || 'var(--y)'}"></div>`));
  p.textContent = text; setTimeout(() => p.remove(), 1000);
}
function burstAt(i, r, colors, count = 16) {
  const b = cellAt(i, r).getBoundingClientRect();
  burst(b.left + b.width / 2, b.top + b.height / 2, { count, colors, speed: 5, gravity: 0.12 });
}

/* ---------- the collect: angler casts a line and reels each fish in ---------- */
async function reelIn(angler, fish, mult, stake, onCatch) {
  const [ai, ar] = angler, A = ctr(ai, ar), red = reduced(), fast = turbo();
  const ac = cellAt(ai, ar); ac.classList.add('angl');
  sizeSvg(castSvg);
  sfx('rise'); buzz(12);
  await sleep(fast ? 120 : 260);
  for (const [fi, fr, fv] of fish) {
    const F = ctr(fi, fr), cell = cellAt(fi, fr);
    cell.classList.add('hook');
    // cast: a sagging line from the rod tip (top-right of the angler) to the fish
    const sx = A.x + A.c * 0.38, sy = A.y - A.c * 0.42, mx = (sx + F.x) / 2, my = Math.min(sy, F.y) - A.c * 0.6;
    const len = Math.ceil(Math.hypot(F.x - sx, F.y - sy) * 1.3);
    const path = castSvg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    path.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${F.x.toFixed(1)} ${F.y.toFixed(1)}`);
    path.style.setProperty('--len', len);
    sfx('tap');
    await sleep(fast ? 120 : 260);
    // reel: a copy of the fish swims along to the angler
    const amt = fv * mult * stake;
    if (!red) {
      const fly = frame.appendChild(h(`<div class="ll-fly" style="left:${F.x - F.c / 2}px;top:${F.y - F.c / 2}px;width:${F.c}px;height:${F.c}px;color:${fishColor(fv)}">${icon('F')}<b>${fmt(amt)}</b></div>`));
      cell.classList.add('caught');
      const a = fly.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${(A.x - F.x) * 0.5}px,${(A.y - F.y) * 0.5 - A.c * 0.3}px) scale(.9) rotate(${A.x < F.x ? 15 : -15}deg)`, offset: 0.55 }, { transform: `translate(${A.x - F.x}px,${A.y - F.y}px) scale(.35)`, opacity: 0.2 }],
        { duration: fast ? 280 : 520, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
      await a.finished.catch(() => {});
      fly.remove();
    } else cell.classList.add('caught');
    path.remove();
    sfx(fv >= 50 ? 'cash' : 'gem'); buzz(10);
    popText(A.x, A.y - A.c * 0.3, '+' + fmt(amt), fishColor(fv));
    burstAt(ai, ar, [fishColor(fv), '#ffffff', '#b8ff3b'], fv >= 50 ? 30 : 12);
    onCatch(amt);
    await sleep(fast ? 40 : 110);
  }
  ac.classList.remove('angl');
}
async function splash(i, r) {
  const C = ctr(i, r);
  const s = frame.appendChild(h(`<div class="ll-splash" style="left:${C.x}px;top:${C.y}px;width:${C.c}px;height:${C.c}px"></div>`));
  sfx('boom'); buzz([30, 20, 50]);
  burstAt(i, r, ['#9ffcff', '#22f0ff', '#ffffff'], 40);
  popText(C.x, C.y, 'SPLASH!', '#9ffcff');
  await sleep(380);
  const cell = cellAt(i, r);
  cell.className = 'cell k-W land'; cell.innerHTML = icon('W'); delete cell.dataset.v;
  setTimeout(() => s.remove(), 600);
  await sleep(320);
}

/* ---------- win box / banners / bonus HUD ---------- */
let winShown = 0;
function countWin(to, msg, ms = 600) {
  const box = $('#winbox'); box.classList.toggle('on', to > 0);
  if (msg != null) $('#winmsg').textContent = msg;
  const from = winShown; winShown = to;
  tween(from, to, ms, v => ($('#winamt').textContent = fmtFull(v)));
}
function banner(html, ms) {
  const b = $('#banner'); b.innerHTML = `<div class="in">${html}<div class="f">Tap to continue</div></div>`; b.hidden = false;
  return new Promise(res => { let done = false; const end = () => { if (done) return; done = true; b.hidden = true; b.onclick = null; res(); }; b.onclick = end; sleep(ms).then(end); });
}
function paintTrack(anglers, popIdx = -1) {
  const lvl = E.levelOf(anglers), maxed = anglers >= E.ANGLERS_PER_LEVEL * (E.LEVEL_MULTS.length - 1);
  const fill = maxed ? 4 : anglers % E.ANGLERS_PER_LEVEL;
  $$('#pips .pip').forEach((p, i) => { p.classList.toggle('on', i < fill); p.classList.toggle('pop', i === popIdx); });
  $$('#lvls i').forEach((x, i) => { x.className = i === lvl ? 'on' : i < lvl ? 'done' : ''; });
  $('#fsmult').textContent = E.LEVEL_MULTS[lvl];
}
const QUIPS = {
  idle: ['The lake is quiet…', 'Not a nibble.', 'Fish are sleeping. Cast again.', 'Line came back empty.', 'Just weeds this time.'],
  win: ['Nice bite!', 'Fish on!', 'Tight lines!', 'Something tugged!', 'Good cast!'],
};
const quip = k => QUIPS[k][Math.floor(Math.random() * QUIPS[k].length)];
function lineMsg(res) {
  const best = res.lines.slice().sort((a, b) => b.win - a.win)[0];
  return best ? `${best.count}× ${E.SYMBOLS[best.sym].name}${res.lines.length > 1 ? ` + ${res.lines.length - 1} more` : ` · line ${best.line + 1}`}` : '';
}

/* ---------- round ---------- */
async function play() {
  if (busy) return;
  busy = true; paint();
  const stake = bet.value;
  const r = await startRound('fishing', stake);
  if (!r) { busy = false; paint(); return; }
  stakeShown = stake;
  sfx('bet'); buzz(10);
  winShown = 0; $('#winamt').textContent = '0'; $('#winmsg').textContent = 'Casting…';
  const base = E.spin(await r.floats(E.FLOATS_PER_SPIN), 'base');
  const show = base.grid.map(c => c.slice());
  if (base.dynamite) show[base.dynamite[0]][base.dynamite[1]] = base.dynamite[2];
  await animateSpin(base, 'base', show);
  let total = 0;
  if (base.dynamite) {
    $('#winmsg').textContent = 'Splash! An angler jumps in!';
    await sleep(250);
    await splash(base.dynamite[0], base.dynamite[1]);
    await reelIn(base.dynamite, base.fish, 1, stake, amt => { total += amt / stake; countWin(total * stake, 'Reeling in…', 250); });
  }
  total = base.total;
  if (base.lines.length || base.collect) {
    showLines(base);
    const parts = [base.collect ? `Splash catch ${fmt(base.collect * stake)}` : '', lineMsg(base)].filter(Boolean);
    countWin(stake * total, parts.join(' · ') || quip('win'), total >= 2 ? 900 : 500);
    if (!base.dynamite) { sfx(total >= 1 ? 'win' : 'gem'); buzz(12); }
    const fb = frame.getBoundingClientRect();
    if (!reduced()) burst(fb.left + fb.width / 2, fb.top + fb.height / 2, { count: total >= 2 ? 40 : 16, speed: total >= 2 ? 7 : 5, colors: ['#22f0ff', '#b8ff3b', '#ffd84d', '#ff3dc8'], gravity: 0.15 });
    await sleep(base.spins ? 1200 : turbo() ? 450 : 900);
  } else if (!base.spins) $('#winmsg').textContent = quip('idle');

  let played = 0, anglers = 0, caught = 0, fsWon = 0, capped = false;
  if (base.spins) {
    base.boats.forEach(([i, rr]) => cellAt(i, rr).classList.add('win'));
    $('#winmsg').textContent = `${base.boats.length} boats! Free spins!`;
    sfx('big'); buzz([30, 40, 30, 40, 80]);
    await sleep(900);
    clearWins();
    let left = base.spins;
    await banner(`${icon('S')}<div class="k">${base.boats.length} boats · all aboard</div><div class="t">${left} FREE SPINS</div><div class="s">Every angler reels in every fish</div>`, 2800);
    const fsbar = $('#fsbar'); fsbar.hidden = false; $('#stage').classList.add('fsmode');
    $('#fswon').textContent = '0'; $('#fscaught').textContent = '0'; paintTrack(0);
    while (left > 0 && total < E.MAX_WIN) {
      left--; played++;
      $('#fsleft').textContent = left;
      const lvl = E.levelOf(anglers), mult = E.LEVEL_MULTS[lvl];
      winShown = 0; $('#winamt').textContent = '0'; $('#winbox').classList.remove('on');
      $('#winmsg').textContent = `Free spin ${played}${mult > 1 ? ` · fish ×${mult}` : ''}`;
      const s = E.spin(await r.floats(E.FLOATS_PER_SPIN), 'fs', mult);
      await animateSpin(s, 'fs', s.grid);
      let spinWon = 0;
      const bump = amt => { spinWon += amt; fsWon += amt; $('#fswon').textContent = fmt(fsWon); countWin(spinWon, null, 200); };
      if (s.anglers.length && s.fish.length) {
        $('#winmsg').textContent = s.anglers.length > 1 ? `${s.anglers.length} anglers casting!` : 'Angler casting!';
        for (const a of s.anglers) {
          await reelIn(a, s.fish, mult, stake, amt => { bump(amt); caught++; $('#fscaught').textContent = caught; if (caught >= 10) unlock('fishing'); });
          $$('.cell.caught', reelsEl).forEach(c => c.classList.remove('caught', 'hook'));
        }
      } else if (s.anglers.length) $('#winmsg').textContent = 'Angler cast… no fish this time';
      else if (s.fish.length) $('#winmsg').textContent = 'Fish on the line, need an angler!';
      // advance the progress track one pip per angler
      const before = anglers;
      for (let k = 0; k < s.anglers.length; k++) {
        anglers++;
        paintTrack(anglers, (anglers - 1) % E.ANGLERS_PER_LEVEL);
        sfx('peg'); await sleep(turbo() ? 80 : 160);
      }
      if (s.lines.length) { showLines(s); bump(s.lineWin * stake); $('#winmsg').textContent = lineMsg(s); sfx('win'); }
      total += s.total;
      if (spinWon) { $('#winbox').classList.add('on'); countWin(spinWon, null, 300); }
      $('#fswon').textContent = fmt(Math.min(total - base.total, E.MAX_WIN) * stake);
      const ups = E.levelOf(anglers) - E.levelOf(before);
      if (ups > 0 && total < E.MAX_WIN) {
        left += E.RETRIGGER_SPINS * ups; $('#fsleft').textContent = left;
        await sleep(600);
        sfx('level'); buzz([20, 30, 20, 30, 60]);
        const nm = E.LEVEL_MULTS[E.levelOf(anglers)];
        await banner(`${icon('W')}<div class="k">${anglers} anglers collected</div><div class="t">+${E.RETRIGGER_SPINS * ups} SPINS</div><div class="s">Fish now pay ×${nm}</div>`, 2200);
      }
      await sleep(spinWon ? (turbo() ? 450 : 900) : (turbo() ? 150 : 320));
    }
    if (total >= E.MAX_WIN) { capped = true; total = E.MAX_WIN; }
    fsWon = total - base.total;
    clearWins();
    sfx('cash');
    await banner(`${icon('B')}<div class="k">${capped ? 'Max win reached' : 'Back to the dock'}</div><div class="t">${fmtFull(stake * fsWon)}</div><div class="s">${played} spins · ${caught} fish caught · ${fmtX(fsWon)}</div>`, 2800);
    $('#fsbar').hidden = true; $('#stage').classList.remove('fsmode');
  }
  total = Math.min(total, E.MAX_WIN);
  const payout = Math.floor(stake * total), mult = payout / stake;
  r.settle(payout, { mult, detail: `${fmtFull(stake)} bet · ${played ? `${played} free spins · ${caught} fish · ` : ''}${base.dynamite ? 'splash · ' : ''}${fmtX(mult)}${capped ? ' · max win' : ''}` });
  if (played) countWin(payout, `Round total · base + ${played} free spins`, 900);
  $('#lastwin').textContent = payout ? fmtFull(payout) : '-';
  $('#lastwin').style.color = payout > stake ? 'var(--l)' : payout ? 'var(--txt)' : 'var(--faint)';
  pushRecent($('#recent'), (played ? 'FS ' : '') + fmtX(mult), mult >= 10 ? 'b' : mult >= 1 ? 'w' : '');
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

/* ---------- ambience: bubbles (cosmetic) ---------- */
const water = $('#water');
for (let i = 0; i < 14; i++) {
  const s = 4 + Math.random() * 9, e = document.createElement('i');
  e.className = 'bub';
  e.style.cssText = `left:${3 + Math.random() * 94}%;width:${s}px;height:${s}px;--dx:${(Math.random() - 0.5) * 60}px;animation-duration:${6 + Math.random() * 8}s;animation-delay:-${Math.random() * 12}s`;
  water.appendChild(e);
}
paint();
