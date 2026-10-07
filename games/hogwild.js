import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, tween, modal, state } from '/core/ag.js';
import * as E from '/games/hogwild-engine.js';

boot({ nav: 'games' });
const RTP = '96.3%';

/* ---------- original SVG art (sprite) ---------- */
const EYES = `<circle cx="36" cy="47" r="5" fill="#1a0614"/><circle cx="64" cy="47" r="5" fill="#1a0614"/><circle cx="37.6" cy="45.2" r="1.7" fill="#fff"/><circle cx="65.6" cy="45.2" r="1.7" fill="#fff"/>`;
const SNOUT = (fill = '#ffb3e0') => `<ellipse cx="50" cy="64" rx="15" ry="10.5" fill="${fill}" stroke="#c21d7a" stroke-width="2"/><ellipse cx="44.5" cy="64" rx="2.8" ry="4" fill="#5a0f3a"/><ellipse cx="55.5" cy="64" rx="2.8" ry="4" fill="#5a0f3a"/>`;
const head = (g, inner = '#ff5fb8') => `<path d="M18 40Q3 26 7 9Q27 9 42 24Z" fill="url(#${g})" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linejoin="round"/><path d="M19 33Q10 24 12 14Q25 15 34 25Z" fill="${inner}"/><path d="M82 40Q97 26 93 9Q73 9 58 24Z" fill="url(#${g})" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linejoin="round"/><path d="M81 33Q90 24 88 14Q75 15 66 25Z" fill="${inner}"/><ellipse cx="50" cy="56" rx="38" ry="34" fill="url(#${g})" stroke="#fff" stroke-opacity=".75" stroke-width="2.5"/><ellipse cx="37" cy="33" rx="12" ry="6" fill="#fff" opacity=".35" transform="rotate(-20 37 33)"/><ellipse cx="24" cy="65" rx="6" ry="4" fill="#ff3dc8" opacity=".45"/><ellipse cx="76" cy="65" rx="6" ry="4" fill="#ff3dc8" opacity=".45"/>`;
const SMILE = `<path d="M41 79q9 7 18 0" stroke="#5a0f3a" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
const BANK = `<path d="M10 54q-9-3-6-11 3-5 7 0" stroke="#ff8fd8" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="20" y="72" width="10" height="18" rx="3" fill="#e0479f"/><rect x="36" y="74" width="10" height="17" rx="3" fill="#c23a8a"/><rect x="58" y="74" width="10" height="17" rx="3" fill="#c23a8a"/><rect x="70" y="72" width="10" height="18" rx="3" fill="#e0479f"/><ellipse cx="47" cy="58" rx="38" ry="28" fill="url(#g-bank)" stroke="#ffd6f2" stroke-width="2.5"/><path d="M62 36L69 18L78 39Z" fill="url(#g-bank)" stroke="#ffd6f2" stroke-width="2" stroke-linejoin="round"/><ellipse cx="86" cy="60" rx="8" ry="10" fill="#ffb3e0" stroke="#c21d7a" stroke-width="2"/><ellipse cx="84" cy="57" rx="1.6" ry="2.4" fill="#5a0f3a"/><ellipse cx="88.5" cy="62" rx="1.6" ry="2.4" fill="#5a0f3a"/><circle cx="71" cy="50" r="3.6" fill="#1a0614"/><circle cx="72" cy="49" r="1.2" fill="#fff"/><ellipse cx="34" cy="44" rx="14" ry="6" fill="#fff" opacity=".4" transform="rotate(-12 34 44)"/><rect x="34" y="31" width="24" height="5" rx="2.5" fill="#2a0b1f" transform="rotate(-6 46 33)"/><circle cx="46" cy="18" r="11" fill="url(#g-gold)" stroke="#fff3b0" stroke-width="2"/><ellipse cx="46" cy="18" rx="4.4" ry="3.2" fill="none" stroke="#a86a00" stroke-width="1.8"/><circle cx="44.3" cy="18" r=".9" fill="#a86a00"/><circle cx="47.7" cy="18" r=".9" fill="#a86a00"/>`;
const coinArt = g => `<circle cx="50" cy="50" r="47" fill="url(#${g})" stroke="#fff8d0" stroke-width="2.5"/><circle cx="50" cy="50" r="38" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="3" stroke-dasharray="3 4"/><ellipse cx="36" cy="28" rx="14" ry="7" fill="#fff" opacity=".45" transform="rotate(-25 36 28)"/>`;
const ART = {
  c: `<path d="M50 6C67 12 70 46 60 76H40C30 46 33 12 50 6Z" fill="url(#g-corn)" stroke="#fff6b8" stroke-width="2"/><g stroke="#c98a00" stroke-width="1.6" opacity=".6" fill="none"><path d="M43 13v58M50 8v65M57 13v58M38 22h24M36 32h28M35 42h30M35 52h30M36 62h28"/></g><ellipse cx="44" cy="24" rx="3.5" ry="9" fill="#fff" opacity=".5"/><path d="M50 96C28 86 20 62 28 40C36 60 44 74 53 84Z" fill="#7dd321" stroke="#d4ff7a" stroke-width="2" stroke-linejoin="round"/><path d="M50 96C72 86 80 62 72 40C64 60 56 74 47 84Z" fill="#4fa812" stroke="#d4ff7a" stroke-width="2" stroke-linejoin="round"/>`,
  h: `<path d="M27 18V50A23 23 0 0 0 73 50V18" fill="none" stroke="url(#g-shoe)" stroke-width="16"/><path d="M21 18V50A29 29 0 0 0 79 50V18" fill="none" stroke="#e8feff" stroke-width="1.6" opacity=".7"/><g fill="#063c48"><circle cx="27" cy="27" r="2.5"/><circle cx="27" cy="42" r="2.5"/><circle cx="31" cy="59" r="2.5"/><circle cx="73" cy="27" r="2.5"/><circle cx="73" cy="42" r="2.5"/><circle cx="69" cy="59" r="2.5"/><circle cx="50" cy="73" r="2.5"/></g><rect x="16" y="9" width="22" height="9" rx="3" fill="#b9fcff" stroke="#fff" stroke-width="1.5"/><rect x="62" y="9" width="22" height="9" rx="3" fill="#b9fcff" stroke="#fff" stroke-width="1.5"/>`,
  b: `<path d="M11 46L50 15L89 46V90H11Z" fill="url(#g-barn)" stroke="#ffd0dc" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 49L50 12L94 49" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="32" y="57" width="36" height="33" fill="#5a0a24" stroke="#fff" stroke-width="3"/><path d="M32 57L68 90M68 57L32 90" stroke="#fff" stroke-width="3"/><rect x="42" y="31" width="16" height="14" rx="2" fill="#ffe066" stroke="#fff" stroke-width="2"/><path d="M50 31v14M42 38h16" stroke="#c98a00" stroke-width="1.5"/>`,
  f: `<g transform="rotate(-16 50 50)"><rect x="46" y="44" width="8" height="54" rx="3" fill="#d79a52" stroke="#ffe0b0" stroke-width="1.5"/><path d="M27 7V35Q27 46 38 46H62Q73 46 73 35V7" fill="none" stroke="url(#g-fork)" stroke-width="6.5" stroke-linecap="round"/><path d="M50 6V46" stroke="url(#g-fork)" stroke-width="6.5" stroke-linecap="round"/><rect x="43" y="44" width="14" height="8" rx="2" fill="#86d10f" stroke="#eaffb5" stroke-width="1.5"/></g>`,
  M: `${head('g-pig')}<path d="M54 25c8-4 17 1 15 8s-11 5-15 2-6-8 0-10z" fill="#8a5a2b"/><path d="M15 52c4-7 13-5 13 2s-6 10-10 8-6-5-3-10z" fill="#8a5a2b"/><path d="M73 66c4 3 4 11 1 13s-5-7-1-13z" fill="#8a5a2b"/><circle cx="34" cy="85" r="3" fill="#8a5a2b"/>
     <circle cx="36" cy="47" r="5" fill="#1a0614"/><circle cx="37.6" cy="45.2" r="1.7" fill="#fff"/><path d="M58 47q6-5 12 0" stroke="#1a0614" stroke-width="3.2" fill="none" stroke-linecap="round"/>${SNOUT()}<path d="M41 78q9 6 18 0" stroke="#5a0f3a" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M46 80q4 10 8 0z" fill="#ff5f7a" stroke="#5a0f3a" stroke-width="1.6"/>`,
  S: `${head('g-pigv', '#9b6bff')}<rect x="19" y="39" width="28" height="17" rx="8" fill="#0b0b18" stroke="#22f0ff" stroke-width="2.2"/><rect x="53" y="39" width="28" height="17" rx="8" fill="#0b0b18" stroke="#22f0ff" stroke-width="2.2"/><path d="M47 45h6" stroke="#22f0ff" stroke-width="3"/><path d="M24 50l9-8M29 52l6-5M58 50l9-8M63 52l6-5" stroke="#fff" stroke-width="2" opacity=".7" stroke-linecap="round"/>${SNOUT('#e2d4ff').replace('#c21d7a', '#7a4fe0')}<path d="M42 80q10 3 18-5" stroke="#3a1060" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  K: `${head('g-pig')}${EYES}${SNOUT()}${SMILE}<path d="M27 27L29 3L40 14L50 0L60 14L71 3L73 27Z" fill="url(#g-gold)" stroke="#fff3b0" stroke-width="2" stroke-linejoin="round"/><rect x="27" y="22" width="46" height="6" rx="2" fill="#e09a00" stroke="#fff3b0" stroke-width="1.5"/><circle cx="50" cy="16" r="3.6" fill="#ff3dc8"/><circle cx="37" cy="19" r="2.6" fill="#22f0ff"/><circle cx="63" cy="19" r="2.6" fill="#b8ff3b"/>`,
  W: `${head('g-wild', '#a0127a')}<path d="M30 46l6-6 6 6-6 6z M58 46l6-6 6 6-6 6z" fill="#fff"/><circle cx="36" cy="46" r="2.3" fill="#1a0614"/><circle cx="64" cy="46" r="2.3" fill="#1a0614"/>${SNOUT('#ffd0ef')}<rect x="13" y="71" width="74" height="23" rx="11.5" fill="#2a0b4a" stroke="#ffd84d" stroke-width="2.5"/><text x="50" y="88.5" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="17" letter-spacing="2" fill="#ffd84d">WILD</text>`,
  B: BANK,
  coin: coinArt('g-gold'), coinm: coinArt('g-mint'), coinj: coinArt('g-major'),
  ham: `<rect x="45" y="34" width="11" height="62" rx="4" fill="#d79a52" stroke="#ffe0b0" stroke-width="2"/><rect x="47" y="80" width="7" height="14" rx="2" fill="#ff3dc8"/><rect x="10" y="6" width="80" height="32" rx="9" fill="url(#g-ham)" stroke="#fff" stroke-width="2.5"/><rect x="22" y="6" width="7" height="32" fill="#ff3dc8"/><rect x="71" y="6" width="7" height="32" fill="#ff3dc8"/><rect x="16" y="11" width="62" height="5" rx="2.5" fill="#fff" opacity=".45"/>`,
};
const DEFS = `<defs>
<radialGradient id="g-pig" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffe0f4"/><stop offset=".5" stop-color="#ff9be0"/><stop offset="1" stop-color="#e0479f"/></radialGradient>
<radialGradient id="g-pigv" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#f0e8ff"/><stop offset=".5" stop-color="#c3a8ff"/><stop offset="1" stop-color="#7a4fe0"/></radialGradient>
<radialGradient id="g-wild" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffc6ec"/><stop offset=".5" stop-color="#ff3dc8"/><stop offset="1" stop-color="#9a0f72"/></radialGradient>
<radialGradient id="g-bank" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffe6f6"/><stop offset=".55" stop-color="#ff9be0"/><stop offset="1" stop-color="#d83a98"/></radialGradient>
<radialGradient id="g-gold" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffd84d"/><stop offset="1" stop-color="#d48a00"/></radialGradient>
<radialGradient id="g-mint" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#eafff8"/><stop offset=".45" stop-color="#7dffd4"/><stop offset="1" stop-color="#14a87a"/></radialGradient>
<radialGradient id="g-major" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffd6f2"/><stop offset=".45" stop-color="#ff3dc8"/><stop offset="1" stop-color="#8a0c63"/></radialGradient>
<linearGradient id="g-corn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe680"/><stop offset=".5" stop-color="#ffd84d"/><stop offset="1" stop-color="#e0a000"/></linearGradient>
<linearGradient id="g-shoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9fcff"/><stop offset=".5" stop-color="#22f0ff"/><stop offset="1" stop-color="#0086a8"/></linearGradient>
<linearGradient id="g-barn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8aa8"/><stop offset=".5" stop-color="#ff3d6e"/><stop offset="1" stop-color="#a8103c"/></linearGradient>
<linearGradient id="g-fork" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaffb5"/><stop offset="1" stop-color="#86d10f"/></linearGradient>
<linearGradient id="g-ham" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffd84d"/><stop offset="1" stop-color="#c98a00"/></linearGradient>
</defs>`;
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${Object.entries(ART).map(([k, v]) => `<symbol id="hw-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#hw-${k}"/></svg>`;
const cellHTML = k => `<div class="cell k-${k}">${icon(k)}</div>`;
const short = n => { n = Math.floor(n); return n < 1e4 ? fmtFull(n) : n < 1e6 ? +(n / 1e3).toFixed(n < 1e5 ? 1 : 0) + 'K' : +(n / 1e6).toFixed(n < 1e7 ? 2 : 1) + 'M'; };

/* ---------- fair backdrop: string lights, ferris wheel, tent ---------- */
(() => {
  const cols = ['#ff8fd8', '#7dffd4', '#ffd84d', '#b89bff', '#22f0ff'];
  const bulbs = Array.from({ length: 23 }, (_, i) => { const x = i * 1000 / 22, y = 6 + 14 * Math.sin(Math.PI * ((i % 11) / 11)); return `<circle class="bulb" cx="${x.toFixed(1)}" cy="${(y + 4).toFixed(1)}" r="3.6" fill="${cols[i % 5]}" style="animation-delay:${(i % 4) * 0.4}s;filter:drop-shadow(0 0 4px ${cols[i % 5]})"/>`; }).join('');
  const spokes = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, x = 100 + Math.cos(a) * 80, y = 100 + Math.sin(a) * 80; return `<path d="M100 100L${x.toFixed(1)} ${y.toFixed(1)}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${cols[i % 5]}" stroke="none"/>`; }).join('');
  $('#sky').innerHTML = `<svg class="bunting" viewBox="0 0 1000 30" preserveAspectRatio="none"><path d="M0 10Q250 30 500 10T1000 10" fill="none" stroke="#ffffff33" stroke-width="1.5"/>${bulbs}</svg>
  <svg class="wheel" viewBox="0 0 200 230"><path d="M100 100L60 228M100 100L140 228" stroke="#b89bff" stroke-width="5"/><g fill="none" stroke="#ff8fd8" stroke-width="3"><circle cx="100" cy="100" r="80"/><circle cx="100" cy="100" r="58" stroke="#7dffd4"/>${spokes}</g></svg>
  <svg class="tent" viewBox="0 0 200 140"><path d="M100 10L190 130H10Z" fill="#ff8fd8"/><path d="M100 10L130 130H70Z" fill="#fff"/><path d="M100 10L60 130H40Z M100 10L160 130H140Z" fill="#fff"/><path d="M100 10V0" stroke="#ffd84d" stroke-width="4"/></svg>`;
})();

/* ---------- rules / paytable ---------- */
const ORDER = ['K', 'S', 'M', 'b', 'f', 'c', 'h'];
const LINE_COLORS = ['#ff8fd8', '#7dffd4', '#ffd84d', '#b89bff', '#22f0ff', '#b8ff3b', '#ff6fa8', '#5ff6ff', '#ffb347', '#d4ff7a'];
function payTable(bet) {
  const lb = bet / E.LINES_N, v = (m, total) => bet ? fmtFull(Math.floor((total ? bet : lb) * m)) : `${m}×`;
  const unit = bet ? `Pays shown in Glow for a total bet of ${fmtFull(bet)} (line bet ${fmtFull(lb)}${lb % 1 ? '…' : ''}).` : 'Line pays are multiples of the line bet (total bet ÷ 20).';
  const rows = ORDER.map(k => `<div class="pr">${icon(k)}<div class="pv">${[5, 4, 3].map(n => `<i>${n}×</i>${v(E.PAYS[k][n - 3])}`).join('<br>')}</div></div>`).join('');
  const lines = E.LINES.map((L, i) => `<div><span>${i + 1}</span><svg viewBox="0 0 50 30">${[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${c * 10 + 1}" y="${r * 10 + 1}" width="8" height="8" rx="1.5" fill="${L[c] === r ? LINE_COLORS[i % 10] : '#22223d'}"/>`).join('')).join('')}</svg></div>`).join('');
  const ct = E.COIN_TABLE.filter(c => !c.kind).map(c => c.v + '×').join(', ');
  return `<p class="faint" style="font-size:12px;margin:0">${unit}</p>
  <div class="ptab">${rows}
    <div class="pr wide">${icon('W')}<div class="pv txt"><b style="color:var(--p)">GROWING PIG WILD</b> lands on reels 2, 3 and 4 and substitutes for every symbol except the piggy bank. When one lands it may gobble a corn and puff up to <b>2×2</b> or <b>3×3</b>, turning every covered position wild (it never covers a piggy bank).</div></div>
    <div class="pr wide">${icon('B')}<div class="pv txt"><b style="color:var(--y)">PIGGY BANK SCATTER</b> lands on any reel. Each one drops a coin into the bank meter. Land <b>3 or more in one spin</b> and the bank gets smashed: <b>PIGGY BANK BONUS</b>.</div></div>
  </div>
  <div class="lab">Piggy Bank Bonus (hold &amp; spin)</div>
  <p style="margin:6px 0">Every triggering piggy bank becomes a locked coin. You get <b>3 respins</b>; every empty spot can land a new coin, which locks in place and <b>resets the respins to 3</b>. When respins run out (or the grid is full) every coin is added up and paid.</p>
  <table class="ctab"><tr><td>Coin values</td><td>${ct} total bet</td></tr><tr><td>OINK MINI coin</td><td>${v(E.JACKPOTS.mini, 1)}</td></tr><tr><td>OINK MAJOR coin</td><td>${v(E.JACKPOTS.major, 1)}</td></tr><tr><td>GRAND: fill all 15 spots</td><td>+${v(E.JACKPOTS.grand, 1)}</td></tr></table>
  <p style="margin:6px 0">The base spin and its bonus count as one round. Max win per round is <b>${fmtFull(E.MAX_WIN)}× the total bet</b>.</p>
  <div class="lab">20 paylines · pay left to right from reel 1</div><div class="plines">${lines}</div>`;
}
gameHeader($('#panel'), { title: 'Hog Wild', rules: `<p>Pick a <b>total bet</b> (spread over 20 fixed paylines) and spin. 3, 4 or 5 matching symbols on a payline, left to right from reel 1, win. Only the highest win per line pays; different lines add up.</p>${payTable(0)}<p>Theoretical RTP <b>${RTP}</b> (60M-spin simulation of this exact engine). Hit frequency about 42%; the Piggy Bank Bonus triggers about 1 in 112 spins.</p>` });

/* ---------- controls ---------- */
const bet = BetControl($('#betslot'), { game: 'hogwild', min: 20, label: 'Total bet', onChange: paintBet });
const SPEEDS = { slow: { first: 1100, step: 320, per: 60, ant: 1700 }, normal: { first: 720, step: 220, per: 46, ant: 1400 }, turbo: { first: 320, step: 100, per: 32, ant: 900 } };
let speed = localStorage.getItem('afterglow:hogwild:speed') || 'normal';
if (!SPEEDS[speed]) speed = 'normal';
$$('#spd button').forEach(b => b.classList.toggle('on', b.dataset.s === speed));
$('#spd').onclick = e => { const b = e.target.closest('button'); if (!b || busy) return; sfx('tap'); speed = b.dataset.s; localStorage.setItem('afterglow:hogwild:speed', speed); $$('#spd button').forEach(x => x.classList.toggle('on', x === b)); };
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTable(bet.value)}`); };
$('#rtp').textContent = RTP;
let busy = false;

function paintBet() {
  const v = bet.value;
  $('#linebet').textContent = (v / 20 % 1 ? (v / 20).toFixed(2) : fmtFull(v / 20)) + ' × 20';
  $('#jmi').textContent = short(v * E.JACKPOTS.mini); $('#jma').textContent = short(v * E.JACKPOTS.major); $('#jgr').textContent = short(v * E.JACKPOTS.grand);
}
function paint() {
  const s = $('#spin'); s.disabled = busy; s.textContent = busy ? 'OINK…' : 'SPIN';
  bet.disable(busy); $$('#spd button').forEach(b => (b.disabled = busy)); $('#ptbtn').disabled = busy;
  paintBet();
}

/* ---------- reels ---------- */
const reelsEl = $('#reels'), frame = $('#frame'), linesSvg = $('#lines'), stage = $('#stage');
const rndSym = i => E.pickSym(i, Math.random()); // cosmetic filler only, never an outcome
const reels = [];
for (let i = 0; i < E.REELS; i++) {
  const el = reelsEl.appendChild(h(`<div class="reel"><div class="strip"></div></div>`));
  reels.push({ el, strip: $('.strip', el) });
  setStrip(i, [0, 1, 2].map(() => rndSym(i)).map(k => (k === 'B' ? 'c' : k)));
}
function setStrip(i, col) {
  const st = reels[i].strip; st.getAnimations().forEach(a => a.cancel());
  st.innerHTML = [rndSym(i), ...col, rndSym(i)].map(cellHTML).join('');
  st.style.transform = 'translateY(-20%)';
}
const cellAt = (i, r) => reels[i].strip.children[1 + r];
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const msg = t => ($('#winmsg').textContent = t);
const pick = a => a[Math.floor(Math.random() * a.length)]; // cosmetic commentary only

/* ---------- piggy meter ---------- */
const meter = $('#meter');
function setMeter(n, animate) {
  $$('#pips i').forEach((p, k) => p.classList.toggle('on', k < n));
  $('#mlab').textContent = n >= 3 ? `FULL! ×${n}` : `Piggy ${n}/3`;
  meter.classList.toggle('full', n >= 3);
  if (animate) { meter.classList.remove('jig'); void meter.offsetWidth; meter.classList.add('jig'); }
}

async function animateSpin(raw) {
  const sp = SPEEDS[speed], red = reduced();
  const times = []; let t = 0, banks = 0;
  for (let i = 0; i < E.REELS; i++) {
    const anticipate = banks === 2 && !red;
    t = i === 0 ? sp.first : t + sp.step + (anticipate ? sp.ant : 0);
    times.push({ t: red ? 120 + i * 70 : t, anticipate });
    banks += raw[i].filter(s => s === 'B').length;
  }
  sfx('spin');
  const spinT = setInterval(() => sfx('spin'), speed === 'turbo' ? 180 : 260);
  const anims = raw.map((col, i) => {
    const { strip, el } = reels[i];
    const old = [...strip.children].slice(1, 4).map(c => c.classList[1].slice(2));
    const F = Math.max(4, Math.round(times[i].t / sp.per));
    const seq = [rndSym(i), ...col, ...Array.from({ length: F }, () => rndSym(i)), ...old, 'c'];
    strip.getAnimations().forEach(a => a.cancel());
    strip.innerHTML = seq.map(cellHTML).join('');
    const N = seq.length, from = -(N - 4) / N * 100, to = -1 / N * 100;
    if (!red) el.classList.add('spinning');
    const a = strip.animate([{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
      { duration: times[i].t, easing: red ? 'linear' : 'cubic-bezier(.35,.05,.35,1.06)', fill: 'forwards' });
    if (!red) setTimeout(() => el.classList.remove('spinning'), Math.max(0, times[i].t - 140));
    return a;
  });
  let landed = 0;
  for (let i = 0; i < E.REELS; i++) {
    if (times[i].anticipate) {
      await sleep(Math.max(0, times[i].t - times[i - 1].t - sp.ant) + 20);
      reels[i].el.classList.add('antic'); sfx('rise'); buzz(15);
      if (i === reels.findIndex(r => r.el.classList.contains('antic'))) msg('🐷 One more piggy bank…!');
    }
    await anims[i].finished.catch(() => {});
    reels[i].el.classList.remove('antic', 'spinning');
    const st = reels[i].strip; st.getAnimations().forEach(a => a.cancel());
    st.innerHTML = [rndSym(i), ...raw[i], rndSym(i)].map(cellHTML).join('');
    st.style.transform = 'translateY(-20%)';
    sfx('stop'); buzz(8);
    raw[i].forEach((s, r) => {
      if (s === 'B') { landed++; cellAt(i, r).classList.add('land'); sfx('chip'); setMeter(landed, true); }
      if (s === 'W') { cellAt(i, r).classList.add('land'); sfx('reveal'); }
    });
  }
  clearInterval(spinT);
}

function clearWins() {
  linesSvg.innerHTML = ''; reelsEl.classList.remove('won');
  $$('.cell.win', reelsEl).forEach(c => c.classList.remove('win'));
  $$('.bigpig', reelsEl).forEach(b => b.remove());
  $('#winbox').classList.remove('on');
}

/* ---------- growing pig wild ---------- */
function rectOf(cells) {
  const base = reelsEl.getBoundingClientRect();
  let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
  cells.forEach(c => { const b = c.getBoundingClientRect(); x1 = Math.min(x1, b.left); y1 = Math.min(y1, b.top); x2 = Math.max(x2, b.right); y2 = Math.max(y2, b.bottom); });
  return { left: (x1 - base.left) / base.width * 100, top: (y1 - base.top) / base.height * 100, width: (x2 - x1) / base.width * 100, height: (y2 - y1) / base.height * 100, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}
async function growPig(res) {
  const g = res.grow, [wc, wr] = res.wild;
  cellAt(wc, wr).classList.add('win');
  msg(g.size === 3 ? '🐷 That hog is HUNGRY…' : '🐷 Somebody smells corn…');
  sfx('reveal'); buzz(12);
  await sleep(380);
  if (res.eaten) { cellAt(...res.eaten).classList.add('eat'); sfx('gem'); await sleep(360); }
  cellAt(wc, wr).classList.remove('win');
  const cells = [];
  for (let x = g.x0; x < g.x0 + g.size; x++) for (let y = g.y0; y < g.y0 + g.size; y++) { const c = cellAt(x, y); c.classList.add('under'); cells.push(c); }
  const R = rectOf(cells);
  const el = reelsEl.appendChild(h(`<div class="bigpig" style="left:${R.left}%;top:${R.top}%;width:${R.width}%;height:${R.height}%;--s0:${(1 / g.size).toFixed(2)}">${icon('W')}<span class="tag">${g.size}×${g.size} WILD</span></div>`));
  el.dataset.x0 = g.x0; el.dataset.y0 = g.y0; el.dataset.size = g.size;
  sfx(g.size === 3 ? 'big' : 'rise'); buzz(g.size === 3 ? [30, 30, 60] : [20, 20, 30]);
  if (!reduced()) burst(R.cx, R.cy, { count: g.size === 3 ? 70 : 36, colors: ['#ff8fd8', '#ff3dc8', '#ffd84d', '#7dffd4'], speed: 7, gravity: 0.15 });
  msg(res.eaten ? `🌽 CHOMP! Pig puffs up to ${g.size}×${g.size}!` : `🐷 Pig puffs up to ${g.size}×${g.size}!`);
  await sleep(g.size === 3 ? 900 : 650);
}

/* ---------- wins ---------- */
function centers() {
  const fr = frame.getBoundingClientRect();
  linesSvg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`);
  return reels.map(r => { const b = r.el.getBoundingClientRect(), c = b.width; return { x: b.left - fr.left + c / 2, y: row => b.top - fr.top + c * (row + 0.5) }; });
}
function showWins(res) {
  if (!res.lines.length) return;
  reelsEl.classList.add('won');
  const C = centers(), big = $('.bigpig', reelsEl);
  const inBig = (x, y) => big && x >= +big.dataset.x0 && x < +big.dataset.x0 + +big.dataset.size && y >= +big.dataset.y0 && y < +big.dataset.y0 + +big.dataset.size;
  for (const w of res.lines) {
    const L = E.LINES[w.line], pts = L.map((r, i) => `${C[i].x.toFixed(1)},${C[i].y(r).toFixed(1)}`).join(' ');
    let len = 0; for (let i = 1; i < 5; i++) len += Math.hypot(C[i].x - C[i - 1].x, C[i].y(L[i]) - C[i - 1].y(L[i - 1]));
    const col = LINE_COLORS[w.line % 10];
    linesSvg.insertAdjacentHTML('beforeend', `<polyline points="${pts}" stroke="${col}" style="--len:${Math.ceil(len)};filter:drop-shadow(0 0 6px ${col})"/><polyline class="core" points="${pts}" style="--len:${Math.ceil(len)}"/>`);
    w.cells.forEach(([i, r]) => { if (inBig(i, r)) big.classList.add('win'); else cellAt(i, r).classList.add('win'); });
  }
  const fr = frame.getBoundingClientRect(), bigWin = res.total >= 2;
  if (!reduced()) burst(fr.left + fr.width / 2, fr.top + fr.height / 2, { count: bigWin ? 50 : 18, speed: bigWin ? 8 : 5, colors: ['#ff8fd8', '#7dffd4', '#ffd84d', '#b89bff'], gravity: 0.15 });
}
const WIN_MSGS = ['Oink-credible!', 'Hog heaven!', 'Squeal deal!', 'Bringing home the bacon!', 'This little piggy went to the bank!', 'Pork-tastic!', 'Snout of this world!', 'Ham-azing!'];
const LOSE_MSGS = ['Hogwash. Spin again!', 'Not a squeal.', 'The pigs are just warming up.', 'Muddy spin. Shake it off.', 'Pigs might fly next time.', 'Nothing in the trough.', 'Oink… nope.'];
function winMessage(res) {
  const best = res.lines.slice().sort((a, b) => b.win - a.win)[0];
  return `${pick(WIN_MSGS)} ${best.count}× ${E.SYMBOLS[best.sym].name}${res.lines.length > 1 ? ` + ${res.lines.length - 1} more` : ''}`;
}
function countWin(coins, text, ms, from = 0) {
  $('#winbox').classList.toggle('on', coins > 0);
  if (text) msg(text);
  tween(from, coins, ms, v => ($('#winamt').textContent = fmtFull(v)));
}

/* ---------- banners ---------- */
function banner(html, ms) {
  const b = $('#banner'); b.innerHTML = `<div class="in">${html}<div class="f">Tap to continue</div></div>`; b.hidden = false;
  return new Promise(res => { let done = false; const end = () => { if (done) return; done = true; b.hidden = true; b.onclick = null; res(); }; b.onclick = end; sleep(ms).then(end); });
}
async function smashIntro() {
  const b = $('#banner');
  b.innerHTML = `<div class="in"><div class="smash" id="sm"><svg class="pb" viewBox="0 0 100 100"><use href="#hw-B"/><g class="crack" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M44 34l-6 12 8 6-6 13M60 38l5 10-7 8 4 9M30 52l8 4"/></g></svg><svg class="ham" viewBox="0 0 100 100"><use href="#hw-ham"/></svg></div>
    <div class="k">Bank is full · smash it!</div><div class="t" id="smt" style="visibility:hidden">PIGGY BANK BONUS</div><div class="s" id="sms" style="visibility:hidden">3 respins · every new coin resets to 3</div></div>`;
  b.hidden = false; b.onclick = null;
  sfx('rise'); buzz(20);
  await sleep(550);
  const sm = $('#sm'); sm.classList.add('go');
  await sleep(450);
  sm.classList.add('hit'); sfx('boom'); buzz([50, 30, 100]);
  frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake');
  const r = sm.getBoundingClientRect();
  burst(r.left + r.width * 0.4, r.top + r.height * 0.6, { count: 90, colors: ['#ffd84d', '#fff3b0', '#ff8fd8', '#ff3dc8'], speed: 10, gravity: 0.3 });
  await sleep(260);
  $('#smt').style.visibility = 'visible'; $('#sms').style.visibility = 'visible'; sfx('big');
  await new Promise(res => { let done = false; const end = () => { if (done) return; done = true; b.onclick = null; res(); }; b.onclick = end; sleep(1700).then(end); });
  b.hidden = true; frame.classList.remove('shake');
}

/* ---------- Piggy Bank Bonus (hold & spin) ---------- */
const hs = $('#hs');
function coinHTML(c, stake) {
  const art = c.kind === 'mini' ? 'coinm' : c.kind === 'major' ? 'coinj' : 'coin';
  return `<div class="hcoin ${c.kind}">${icon(art)}${c.kind !== 'coin' ? `<em>${c.kind === 'mini' ? 'MINI' : 'MAJOR'}</em>` : ''}<b>${short(stake * c.v)}</b></div>`;
}
function paintRespins(n, reset) {
  const rp = $('#rp'); rp.classList.toggle('reset', !!reset);
  $$('i', rp).forEach((p, k) => p.classList.toggle('on', k < n));
  if (reset) { rp.classList.remove('reset'); void rp.offsetWidth; rp.classList.add('reset'); }
}
function jpFlash(kind) {
  const el = $(`#jp .${kind === 'mini' ? 'mi' : kind === 'major' ? 'ma' : 'gr'}`);
  el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 2200);
}
async function piggyBonus(r, stake, banks) {
  unlock('hogwild');
  await smashIntro();
  clearWins();
  stage.classList.add('bonus');
  hs.innerHTML = Array.from({ length: E.CELLS }, (_, i) => `<div class="slot" style="grid-column:${Math.floor(i / 3) + 1};grid-row:${i % 3 + 1}"></div>`).join('');
  hs.hidden = false;
  const slots = [...hs.children];
  let cells = E.bonusStart(banks, await r.floats(banks.length));
  const sumOf = cs => cs.reduce((a, c) => a + (c ? c.v : 0), 0);
  let shown = 0;
  const paintTotal = () => { const to = stake * sumOf(cells); tween(shown, to, 400, v => ($('#bt').textContent = short(v))); shown = to; };
  $('#bt').textContent = '0';
  msg('🔨 Smashed! The bank coins lock in…');
  for (const i of banks) { slots[i].classList.add('full'); slots[i].innerHTML = coinHTML(cells[i], stake); sfx('chip'); buzz(8); await sleep(220); }
  paintTotal();
  let left = E.RESPINS, n = 0;
  paintRespins(left);
  while (left > 0 && E.emptyCount(cells)) {
    await sleep(speed === 'turbo' ? 250 : 500);
    n++;
    msg(`Respin ${n} · ${left} left · ${E.emptyCount(cells)} empty spots`);
    const empties = slots.filter((_, i) => !cells[i]);
    empties.forEach(s => s.classList.add('roll'));
    sfx('spin');
    const res = E.respin(cells, await r.floats(E.emptyCount(cells) * 2));
    left--; paintRespins(left);
    await sleep(speed === 'turbo' ? 380 : speed === 'slow' ? 900 : 650);
    empties.forEach(s => s.classList.remove('roll'));
    cells = res.cells;
    for (const i of res.added) {
      const c = cells[i];
      slots[i].classList.add('full'); slots[i].innerHTML = coinHTML(c, stake);
      if (c.kind !== 'coin') { sfx('big'); buzz([30, 30, 60]); jpFlash(c.kind); msg(`🐽 OINK ${c.kind.toUpperCase()}! +${fmtFull(stake * c.v)}`); }
      else { sfx(c.v >= 10 ? 'cash' : 'chip'); buzz(10); }
      if (!reduced()) { const b = slots[i].getBoundingClientRect(); burst(b.left + b.width / 2, b.top + b.height / 2, { count: c.kind !== 'coin' || c.v >= 10 ? 30 : 12, colors: ['#ffd84d', '#fff3b0', '#ff8fd8'], speed: 5, gravity: 0.2 }); }
      await sleep(200);
    }
    if (res.added.length) {
      left = E.RESPINS; paintRespins(left, true); sfx('rise');
      if (!res.added.some(i => cells[i].kind !== 'coin')) msg(`+${res.added.length} coin${res.added.length > 1 ? 's' : ''}! Respins reset to 3`);
      paintTotal();
    } else if (left) msg(left === 1 ? 'Last respin… come on piggy!' : `No coins · ${left} respins left`);
  }
  const bt = E.bonusTotal(cells);
  if (bt.full) {
    jpFlash('grand'); sfx('big'); buzz([40, 40, 40, 40, 120]);
    await banner(`<div class="banner-pig">${icon('B')}</div><div class="k">All 15 spots filled</div><div class="t">GRAND JACKPOT</div><div class="s">+${fmtFull(stake * E.JACKPOTS.grand)}</div>`, 2600);
  }
  // tally: count every coin into the win box
  msg('Counting the coins…');
  let run = 0;
  $('#winbox').classList.add('on');
  const tallyStep = speed === 'turbo' ? 70 : 140;
  for (let i = 0; i < E.CELLS; i++) {
    if (!cells[i]) continue;
    const coin = $('.hcoin', slots[i]); coin.classList.remove('tally'); void coin.offsetWidth; coin.classList.add('tally');
    const from = run; run += cells[i].v;
    tween(stake * from, stake * run, tallyStep, v => ($('#winamt').textContent = fmtFull(v)));
    sfx('tick');
    await sleep(tallyStep);
  }
  if (bt.full) { tween(stake * run, stake * (run + bt.grand), 500, v => ($('#winamt').textContent = fmtFull(v))); await sleep(500); }
  const won = stake * E.capWin(bt.total);
  sfx('cash'); buzz([20, 30, 20]);
  await banner(`<div class="banner-pig">${icon('B')}</div><div class="k">Piggy Bank Bonus complete</div><div class="t">${fmtFull(won)}</div><div class="s">${cells.filter(Boolean).length} coins${bt.full ? ' + GRAND' : ''} · ${fmtX(E.capWin(bt.total))} your bet</div>`, 2600);
  hs.hidden = true; stage.classList.remove('bonus');
  return { total: bt.total, coins: cells.filter(Boolean).length, full: bt.full, respins: n };
}

/* ---------- round ---------- */
async function play() {
  if (busy) return;
  busy = true; paint();
  const stake = bet.value;
  const r = await startRound('hogwild', stake);
  if (!r) { busy = false; paint(); return; }
  sfx('bet'); buzz(10);
  clearWins(); setMeter(0);
  $('#winamt').textContent = '0'; msg(pick(['🐷 Here piggy piggy…', '🎡 Round and round she goes!', '🌽 Feeding time!', '🐽 Snouts out!', '🎪 Step right up!']));
  const res = E.baseSpin(await r.floats(E.BASE_FLOATS));
  await animateSpin(res.raw);
  if (res.grow) await growPig(res);
  let total = res.total, bonus = null;
  if (res.total) {
    showWins(res);
    countWin(stake * res.total, winMessage(res), res.total >= 2 ? 1000 : 500);
    sfx(res.total >= 1 ? 'win' : 'gem'); buzz(12);
    await sleep(res.trigger ? 1300 : speed === 'turbo' ? 450 : 900);
  }
  if (res.trigger) {
    res.banks.forEach(i => cellAt(Math.floor(i / 3), i % 3).classList.add('win'));
    reelsEl.classList.add('won');
    msg(`🐷 ${res.banks.length} PIGGY BANKS! Grab the hammer!`);
    sfx('big'); buzz([30, 40, 30]);
    await sleep(1100);
    bonus = await piggyBonus(r, stake, res.banks);
    total += bonus.total;
  }
  const capped = E.capWin(total);
  const payout = Math.floor(stake * capped), mult = payout / stake;
  r.settle(payout, { mult, detail: `${fmtFull(stake)} bet · ${res.lines.length} lines${res.grow ? ` · ${res.grow.size}×${res.grow.size} pig` : ''}${bonus ? ` · bonus ${bonus.coins} coins${bonus.full ? ' GRAND' : ''}` : ''} · ${fmtX(mult)}` });
  if (bonus) countWin(payout, `Round total · lines + Piggy Bank Bonus${capped < total ? ' (5,000× cap)' : ''}`, 900);
  else if (!payout) { msg(pick(LOSE_MSGS)); }
  setMeter(0);
  $('#lastwin').textContent = payout ? fmtFull(payout) : '-';
  $('#lastwin').style.color = payout > stake ? 'var(--l)' : payout ? 'var(--txt)' : 'var(--faint)';
  pushRecent($('#recent'), (bonus ? '🐷 ' : '') + fmtX(mult), mult >= 10 ? 'b' : mult >= 1 ? 'w' : '');
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
paint();
