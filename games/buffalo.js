import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, tween, modal, state } from '/core/ag.js';
import * as E from '/games/buffalo-engine.js';

boot({ nav: 'games' });

/* ---------- original SVG art ---------- */
// Side-view bison silhouette (120x70), used by the coin and the stampede herd.
const BISON_SIDE = 'M10 40C10 30 18 26 28 25C40 24 48 18 56 10C64 3 80 3 88 12C94 17 98 24 102 32L110 44C112 50 108 54 102 54L98 54C96 60 92 62 88 58L86 52L82 52L82 66L75 66L74 54C62 56 50 56 40 53L38 66L31 66L30 52C24 50 20 50 17 48L14 64L8 64L9 46C6 44 4 42 2 46C2 40 6 38 10 40Z';
const SERIF = `font-family="Rockwell,'Roboto Slab',Georgia,'Times New Roman',serif" font-weight="900"`;
const spark = (x, y, s, c) => `<path d="M${x} ${y - s}L${x + s * .28} ${y - s * .28}L${x + s} ${y}L${x + s * .28} ${y + s * .28}L${x} ${y + s}L${x - s * .28} ${y + s * .28}L${x - s} ${y}L${x - s * .28} ${y - s * .28}Z" fill="${c}"/>`;
const royal = (ch, k, c, dark) => `<rect x="9" y="9" width="82" height="82" rx="18" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="7 4"/>
  <text x="50" y="${ch.length > 1 ? 70 : 73}" text-anchor="middle" ${SERIF} font-size="${ch.length > 1 ? 50 : 66}" ${ch.length > 1 ? 'letter-spacing="-4"' : ''} fill="url(#hb-r${k})" stroke="${dark}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${ch}</text>
  ${spark(20, 21, 6, c)}${spark(80, 80, 5, '#fff')}`;
const ART = {
  B: `<path d="M24 41C9 41 3 30 6 15C10 26 16 31 28 31Z" fill="url(#hb-horn)" stroke="#fff0c8" stroke-width="1.5"/><path d="M76 41C91 41 97 30 94 15C90 26 84 31 72 31Z" fill="url(#hb-horn)" stroke="#fff0c8" stroke-width="1.5"/>
    <path d="M50 11C30 11 18 23 17 39C9 47 11 60 20 67C24 75 32 79 38 79H62C68 79 76 75 80 67C89 60 91 47 83 39C82 23 70 11 50 11Z" fill="url(#hb-fur)" stroke="#ff8a1f" stroke-width="2.5"/>
    <path d="M24 31l4-8 3 7 4-9 3 8 4-10 3 9 3-9 4 10 3-8 4 9 3-7 4 8" fill="none" stroke="#ffb35c" stroke-width="2" stroke-linejoin="round" opacity=".85"/>
    <path d="M20 45l-6 3 6 3-5 4 6 2M80 45l6 3-6 3 5 4-6 2M26 66l-4 5 6-1M74 66l4 5-6-1" stroke="#ffb35c" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
    <path d="M38 38C44 34 56 34 62 38L60 66C59 78 55 84 50 84C45 84 41 78 40 66Z" fill="url(#hb-face)"/>
    <path d="M37 39c3-7 9-5 13-9 4 4 10 2 13 9-4 5-9 2-13 6-4-4-9-1-13-6z" fill="#6b3414" stroke="#ffb35c" stroke-width="1" stroke-opacity=".6"/>
    <path d="M37 76C39 88 45 97 50 98C55 97 61 88 63 76C58 83 54 86 50 86C46 86 42 83 37 76Z" fill="#2a1206" stroke="#ff8a1f" stroke-width="1.5"/>
    <path d="M44 88l2 6M50 89v7M56 88l-2 6" stroke="#ff8a1f" stroke-width="1.2" opacity=".7"/>
    <path d="M35 47q6-4 11 0M54 47q5-4 11 0" stroke="#ffb35c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <ellipse cx="41" cy="52" rx="4" ry="3" fill="#ffd84d"/><ellipse cx="59" cy="52" rx="4" ry="3" fill="#ffd84d"/><circle cx="41.5" cy="52" r="1.6" fill="#1a0800"/><circle cx="58.5" cy="52" r="1.6" fill="#1a0800"/>
    <ellipse cx="50" cy="73" rx="9.5" ry="6.5" fill="#140803" stroke="#ff8a1f" stroke-width="1.3"/><ellipse cx="45.5" cy="73" rx="2.2" ry="2.8" fill="#ff8a1f" opacity=".75"/><ellipse cx="54.5" cy="73" rx="2.2" ry="2.8" fill="#ff8a1f" opacity=".75"/>`,
  E: `<path d="M34 99C36 79 44 66 58 62C72 58 86 66 92 80L96 99Z" fill="url(#hb-brown)" stroke="#ff3dc8" stroke-width="2"/>
    <path d="M58 70l4 8M70 68l3 10M82 72l1 9M64 84l3 9M78 84l2 10" stroke="#ff9be6" stroke-width="1.5" opacity=".55" stroke-linecap="round"/>
    <path d="M28 40C30 22 44 14 60 15C78 17 88 30 86 48C85 58 80 64 74 67L68 62 64 70 58 63 52 70 50 61 44 64 44 58C36 54 28 48 28 40Z" fill="url(#hb-white)" stroke="#ff3dc8" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M60 22q12 4 18 16M58 30q10 4 14 14" stroke="#c9b8d8" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M35 31C22 29 10 36 8 51C12 47 18 47 22 51C23 45 28 43 37 45Z" fill="url(#hb-gold)" stroke="#fff3c4" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M36 44L19 47" stroke="#7a4300" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M37 25q10-7 20-1" stroke="#5a2a10" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="46" cy="31" r="4.6" fill="#ffd84d"/><circle cx="45" cy="31" r="2.1" fill="#1a0800"/><circle cx="44" cy="29.8" r=".8" fill="#fff"/>`,
  F: `<path d="M19 50L8 60 21 62 14 71 30 70ZM81 50L92 60 79 62 86 71 70 70Z" fill="url(#hb-grey)" stroke="#22f0ff" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M20 46L24 7 46 30Z" fill="url(#hb-grey)" stroke="#22f0ff" stroke-width="2" stroke-linejoin="round"/><path d="M26 36L27 17 38 30Z" fill="#ff7ad9" opacity=".55"/>
    <path d="M80 46L76 7 54 30Z" fill="url(#hb-grey)" stroke="#22f0ff" stroke-width="2" stroke-linejoin="round"/><path d="M74 36L73 17 62 30Z" fill="#ff7ad9" opacity=".55"/>
    <path d="M50 24C30 24 18 34 18 48C18 60 26 66 32 72L44 90C47 94 53 94 56 90L68 72C74 66 82 60 82 48C82 34 70 24 50 24Z" fill="url(#hb-grey)" stroke="#22f0ff" stroke-width="2.5"/>
    <path d="M50 26L45 44 50 52 55 44Z" fill="#2c3458" opacity=".75"/>
    <path d="M40 55C44 52 56 52 60 55L58 79C56 87 44 87 42 79Z" fill="#e8eeff"/>
    <path d="M29 45L44 48 39 54Z" fill="#22f0ff"/><path d="M71 45L56 48 61 54Z" fill="#22f0ff"/><circle cx="39" cy="49" r="1.6" fill="#05050a"/><circle cx="61" cy="49" r="1.6" fill="#05050a"/>
    <path d="M43 74C46 70 54 70 57 74C55 80 45 80 43 74Z" fill="#0b0b18"/>
    <path d="M50 80v4M44 86q6 3 12 0" stroke="#0b0b18" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  C: `<circle cx="25" cy="28" r="11" fill="url(#hb-tan)" stroke="#ffd84d" stroke-width="2"/><circle cx="25" cy="29" r="5.5" fill="#5a2a14"/><circle cx="75" cy="28" r="11" fill="url(#hb-tan)" stroke="#ffd84d" stroke-width="2"/><circle cx="75" cy="29" r="5.5" fill="#5a2a14"/>
    <path d="M50 20C28 20 16 34 16 52C16 72 32 89 50 89C68 89 84 72 84 52C84 34 72 20 50 20Z" fill="url(#hb-tan)" stroke="#ffd84d" stroke-width="2.5"/>
    <path d="M42 29q8 7 16 0M46 34q4 3 8 0" stroke="#a85a20" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="42" cy="69" rx="10" ry="8" fill="#fff4e0"/><ellipse cx="58" cy="69" rx="10" ry="8" fill="#fff4e0"/><path d="M40 78Q50 90 60 78Q50 85 40 78Z" fill="#fff4e0"/>
    <path d="M34 51Q31 61 36 67M66 51Q69 61 64 67" stroke="#4a220c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M27 46Q36 39 45 46Q36 53 27 46Z" fill="#b8ff3b" stroke="#3a1a08" stroke-width="1.2"/><path d="M55 46Q64 39 73 46Q64 53 55 46Z" fill="#b8ff3b" stroke="#3a1a08" stroke-width="1.2"/>
    <ellipse cx="36" cy="46" rx="1.5" ry="3.8" fill="#0b0b18"/><ellipse cx="64" cy="46" rx="1.5" ry="3.8" fill="#0b0b18"/>
    <path d="M44 58H56L50 66Z" fill="#ff7ab0" stroke="#5a2a14" stroke-width="1.2" stroke-linejoin="round"/><path d="M50 66v5" stroke="#5a2a14" stroke-width="1.6"/>
    <circle cx="38" cy="68" r="1" fill="#7a4a2a"/><circle cx="41" cy="72" r="1" fill="#7a4a2a"/><circle cx="62" cy="68" r="1" fill="#7a4a2a"/><circle cx="59" cy="72" r="1" fill="#7a4a2a"/>`,
  H: `<g fill="none" stroke="url(#hb-antler)" stroke-width="4.5" stroke-linecap="round"><path d="M41 35C35 25 26 16 14 6M31 23C24 22 16 24 7 30M24 15C20 10 20 6 22 2M36 28C34 20 36 14 40 8M59 35C65 25 74 16 86 6M69 23C76 22 84 24 93 30M76 15C80 10 80 6 78 2M64 28C66 20 64 14 60 8"/></g>
    <path d="M37 43C25 36 14 40 11 47C19 51 30 51 38 49ZM63 43C75 36 86 40 89 47C81 51 70 51 62 49Z" fill="url(#hb-brown)" stroke="#ffb35c" stroke-width="1.5"/>
    <path d="M30 72C30 86 38 99 50 99C62 99 70 86 70 72Z" fill="#3a1d0c" stroke="#ffb35c" stroke-width="1.2" stroke-opacity=".5"/>
    <path d="M50 32C40 32 34 38 35 48L39 76C40 86 45 92 50 92C55 92 60 86 61 76L65 48C66 38 60 32 50 32Z" fill="url(#hb-elk)" stroke="#ffb35c" stroke-width="2.2"/>
    <path d="M44 40Q50 36 56 40L54 60Q50 63 46 60Z" fill="#ffd3a0" opacity=".25"/>
    <path d="M42 74C44 70 56 70 58 74L57 84C55 90 45 90 43 84Z" fill="#2a1408"/><ellipse cx="46.5" cy="80" rx="1.6" ry="2.4" fill="#ffb35c" opacity=".6"/><ellipse cx="53.5" cy="80" rx="1.6" ry="2.4" fill="#ffb35c" opacity=".6"/>
    <circle cx="41" cy="53" r="3" fill="#ffd84d"/><circle cx="59" cy="53" r="3" fill="#ffd84d"/><circle cx="41.4" cy="53" r="1.3" fill="#1a0800"/><circle cx="58.6" cy="53" r="1.3" fill="#1a0800"/>`,
  A: royal('A', 'A', '#ff8a1f', '#3a1400'),
  K: royal('K', 'K', '#ff3dc8', '#3a0630'),
  Q: royal('Q', 'Q', '#8b5cff', '#1a0a4a'),
  J: royal('J', 'J', '#22f0ff', '#03303a'),
  T: royal('10', 'T', '#b8ff3b', '#1a3000'),
  N: royal('9', 'N', '#ffd84d', '#3a2a00'),
  W: `<rect x="4" y="4" width="92" height="92" rx="16" fill="url(#hb-wbg)" stroke="#ffd84d" stroke-width="3"/>
    <g clip-path="url(#hb-wclip)"><circle cx="50" cy="44" r="27" fill="url(#hb-sun)"/><g fill="#3a0a40"><rect x="20" y="47" width="60" height="2"/><rect x="20" y="53" width="60" height="3"/><rect x="20" y="59" width="60" height="4"/></g></g>
    <path d="M4 64L18 54 26 59 38 49 50 61 62 50 74 59 84 53 96 64V70H4Z" fill="#1a0420"/>
    <path d="M4 64H96M50 64L22 96M50 64L78 96M50 64V96M50 64L4 82M50 64L96 82M8 76H92" stroke="#ff3dc8" stroke-width="1.4" opacity=".65"/>
    <rect x="13" y="69" width="74" height="23" rx="11.5" fill="#1a0420" stroke="#ffd84d" stroke-width="2.2"/>
    <text x="50" y="86.5" text-anchor="middle" ${SERIF} font-size="17" letter-spacing="3" fill="url(#hb-gold)">WILD</text>`,
  S: `<circle cx="50" cy="50" r="45" fill="url(#hb-coin)" stroke="#fff3c4" stroke-width="2.5"/>
    <circle cx="50" cy="50" r="37" fill="none" stroke="#8a5200" stroke-width="2.5" stroke-dasharray="1.5 4.2" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="32" fill="url(#hb-coin2)" stroke="#a86a00" stroke-width="1.5"/>
    <g transform="translate(23 28) scale(.45)"><path d="${BISON_SIDE}" fill="#6a3a00"/><path d="M90 14C92 8 96 8 98 12" stroke="#6a3a00" stroke-width="4" fill="none" stroke-linecap="round"/></g>
    <text x="50" y="72" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="9" letter-spacing="2.4" fill="#6a3a00">BONUS</text>
    <ellipse cx="33" cy="26" rx="12" ry="5.5" fill="#fff" opacity=".5" transform="rotate(-32 33 26)"/>`,
};
const g2 = (id, a, b, c, d = '0 0 0 1') => { const [x1, y1, x2, y2] = d.split(' '); return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/>${c ? `<stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>` : `<stop offset="1" stop-color="${b}"/>`}</linearGradient>`; };
const DEFS = `<defs>
${g2('hb-horn', '#fff3d6', '#c9a46a', '#6b4a1e', '0 0 1 1')}
<radialGradient id="hb-fur" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#8a4a1c"/><stop offset=".6" stop-color="#5a2c10"/><stop offset="1" stop-color="#2a1206"/></radialGradient>
${g2('hb-face', '#4a2410', '#2a1408')}
${g2('hb-brown', '#7a4520', '#4a2410', '#2a1206')}
${g2('hb-white', '#ffffff', '#f0e8f8', '#c9b8d8')}
${g2('hb-gold', '#fff2a8', '#ffc23d', '#d47a00')}
${g2('hb-grey', '#c6d0ee', '#7a86b0', '#3a4268')}
<radialGradient id="hb-tan" cx=".5" cy=".4" r=".65"><stop offset="0" stop-color="#f7c27a"/><stop offset=".6" stop-color="#d48a3c"/><stop offset="1" stop-color="#8a4a18"/></radialGradient>
${g2('hb-antler', '#fff3d6', '#ffc23d', '#ff8a1f')}
${g2('hb-elk', '#a8622a', '#7a4018', '#4a2410')}
${g2('hb-wbg', '#2a0a4a', '#8a1f5a', '#ff6a2a')}
${g2('hb-sun', '#fff27a', '#ffb347', '#ff3dc8')}
<clipPath id="hb-wclip"><rect x="4" y="4" width="92" height="60"/></clipPath>
<radialGradient id="hb-coin" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff6c0"/><stop offset=".45" stop-color="#ffc23d"/><stop offset="1" stop-color="#b86a00"/></radialGradient>
<radialGradient id="hb-coin2" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#ffe38a"/><stop offset="1" stop-color="#e09a1a"/></radialGradient>
${g2('hb-rA', '#fff2d0', '#ffb35c', '#ff6a1a')}${g2('hb-rK', '#ffe0f6', '#ff7ad9', '#d0189a')}${g2('hb-rQ', '#ece4ff', '#a98bff', '#6a3af0')}
${g2('hb-rJ', '#e0fdff', '#6ff6ff', '#00b0d0')}${g2('hb-rT', '#f4ffd8', '#c8ff5a', '#6ab800')}${g2('hb-rN', '#fffbe0', '#ffe27a', '#e0a000')}
</defs>`;
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${Object.entries(ART).map(([k, v]) => `<symbol id="hb-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#hb-${k}"/></svg>`;
const cellHTML = k => `<div class="cell k-${k}">${icon(k)}</div>`;

/* ---------- rules / paytable ---------- */
function payTable(stake) {
  const v = m => stake ? fmtFull(+(stake * m).toFixed(2)) : `${m}×`;
  const unit = stake ? `Pays per way in Glow for a ${fmtFull(stake)} bet (multiplied by the number of ways).` : 'Pays are per way, as multiples of your total bet, then multiplied by the number of ways.';
  const rows = E.PAY_ORDER.map(k => `<div class="pr">${icon(k)}<div class="pv">${[5, 4, 3].map(n => `<i>${n}×</i>${v(E.PAYS[k][n - 3])}`).join('<br>')}</div></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">${unit}</p>
  <div class="ptab">${rows}
    <div class="pr wide">${icon('W')}<div class="pv txt"><b style="color:var(--y)">SUNSET WILD</b> lands on reels 2, 3 and 4 only and substitutes for every symbol except the gold coin.</div></div>
    <div class="pr wide">${icon('S')}<div class="pv txt"><b style="color:var(--gold)">GOLD COIN SCATTER</b> pays anywhere, × total bet: 3 → ${v(2)} + 8 free spins, 4 → ${v(10)} + 15 free spins, 5 → ${v(50)} + 20 free spins.</div></div>
  </div>`;
}
const RULES = `<p><b>5 reels × 4 rows, 1,024 ways.</b> A win needs the same symbol on adjacent reels starting from reel 1, in <b>any row</b>. Every combination of positions is a separate way, so 2 bison on reel 1, 3 on reel 2 and 1 on reel 3 = 2 × 3 × 1 = 6 ways. Each way pays the symbol's value × your total bet. Only the longest run per symbol pays; different symbols add up.</p>
  ${payTable(0)}
  <p><b>Free spins.</b> 3, 4 or 5 gold coins anywhere award 8, 15 or 20 free spins at the triggering bet. During free spins every wild that's part of a win carries a random <b>×2 or ×3</b> multiplier. Several wilds in one way multiply together (up to <b>×27</b>). Coins retrigger: 2 coins = +5 spins, 3 or more = +8 spins (and 3+ also pay the scatter prize). A round can award at most ${E.FS_CAP} free spins.</p>
  <p><b>Stampede.</b> When 15 or more bison land on screen the herd thunders across the reels. It's a celebration only and doesn't change the result.</p>
  <p><b>Anticipation.</b> When 2 coins are showing, the remaining reels spin slower and glow.</p>
  <p>The paid spin plus any free spins it triggers count as one round. <b>Max win 5,000× the bet</b> per round; free spins end early if it's reached.</p>
  <p>RTP 96.0%, measured over 120 million simulated rounds of this exact engine (bonus included). Hit frequency about 42%; free spins trigger about 1 in 117 spins.</p>`;
gameHeader($('#panel'), { title: 'Thunder Herd', rules: RULES });

/* ---------- controls ---------- */
const bet = BetControl($('#betslot'), { game: 'buffalo', min: 10 });
const SKEY = 'afterglow:buffalo:speed';
let speed = localStorage.getItem(SKEY) === 'fast' ? 'fast' : 'normal', busy = false;
$$('#spd button').forEach(x => x.classList.toggle('on', x.dataset.s === speed));
$('#spd').onclick = e => { const b = e.target.closest('button'); if (!b || busy) return; sfx('tap'); speed = b.dataset.s; localStorage.setItem(SKEY, speed); $$('#spd button').forEach(x => x.classList.toggle('on', x === b)); };
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTable(bet.value)}`); };
function paint() {
  const s = $('#spin'); s.disabled = busy; s.textContent = busy ? 'SPINNING…' : 'SPIN';
  bet.disable(busy); $$('#spd button').forEach(b => (b.disabled = busy));
}

/* ---------- reels ---------- */
const reelsEl = $('#reels'), frame = $('#frame'), stage = $('#stage');
const reels = [];
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const randStop = i => Math.floor(Math.random() * E.STRIPS[i].length); // cosmetic idle display only
const startStops = [0, 1, 2, 3, 4].map(randStop);
const prevSym = (i, st) => { const s = E.STRIPS[i]; return s[(st - 1 + s.length) % s.length]; };
const nextSym = (i, st) => { const s = E.STRIPS[i]; return s[(st + E.ROWS) % s.length]; };
function setStrip(i, above, col, below) {
  const st = reels[i].strip; st.getAnimations().forEach(a => a.cancel());
  st.innerHTML = [above, ...col, below].map(cellHTML).join('');
  st.style.transform = `translateY(${-100 / 6}%)`;
}
const startGrid = E.windowAt(startStops);
for (let i = 0; i < E.REELS; i++) {
  const el = reelsEl.appendChild(h(`<div class="reel"><div class="strip"></div></div>`));
  reels.push({ el, strip: $('.strip', el) });
  setStrip(i, prevSym(i, startStops[i]), startGrid[i], nextSym(i, startStops[i]));
}
const cellAt = (i, r) => reels[i].strip.children[1 + r];

function addBadges(i, res) {
  if (!res.mults) return false;
  let any = false;
  res.grid[i].forEach((g, r) => { if (g === 'W') { const m = res.mults[i][r]; cellAt(i, r).insertAdjacentHTML('beforeend', `<i class="wm x${m}">×${m}</i>`); any = true; } });
  return any;
}

async function animateSpin(res) {
  const fast = speed === 'fast', red = reduced();
  clearWins();
  const perCell = fast ? 34 : 48, AN = fast ? 900 : 1400;
  const times = []; let t = 0, scat = 0;
  for (let i = 0; i < E.REELS; i++) {
    const anticipate = scat >= 2;
    t = i === 0 ? (fast ? 340 : 720) : t + (fast ? 110 : 220) + (anticipate ? AN : 0);
    times.push({ t: red ? 120 + i * 70 : t, anticipate: anticipate && !red });
    scat += res.grid[i].includes('S') ? 1 : 0;
  }
  sfx('spin');
  const spinT = setInterval(() => sfx('spin'), fast ? 180 : 260);
  const anims = res.grid.map((col, i) => {
    const { strip, el } = reels[i], S = E.STRIPS[i], n = S.length, stop = res.stops[i];
    const old = [...strip.children].slice(1, 1 + E.ROWS).map(c => c.classList[1].slice(2));
    const F = Math.max(4, Math.round(times[i].t / perCell));
    const filler = Array.from({ length: F }, (_, j) => S[(stop + E.ROWS + j) % n]);
    const seq = [S[(stop - 1 + n) % n], ...col, ...filler, ...old, 'N'];
    strip.getAnimations().forEach(a => a.cancel());
    strip.innerHTML = seq.map(cellHTML).join('');
    const N = seq.length, from = -(N - E.ROWS - 1) / N * 100, to = -1 / N * 100;
    if (!red) el.classList.add('spinning');
    const a = strip.animate([{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
      { duration: times[i].t, easing: red ? 'linear' : 'cubic-bezier(.35,.05,.35,1.06)', fill: 'forwards' });
    if (!red) setTimeout(() => el.classList.remove('spinning'), Math.max(0, times[i].t - (fast ? 90 : 160)));
    return a;
  });
  for (let i = 0; i < E.REELS; i++) {
    if (times[i].anticipate) {
      await sleep(Math.max(0, times[i].t - times[i - 1].t - AN) + 20);
      reels[i].el.classList.add('antic'); sfx('rise'); buzz(15);
      if (i === 0 || !times[i - 1].anticipate) $('#winmsg').innerHTML = `${icon('S')}<span>2 coins showing… one more for free spins!</span>`;
    }
    await anims[i].finished.catch(() => {});
    reels[i].el.classList.remove('antic', 'spinning');
    setStrip(i, prevSym(i, res.stops[i]), res.grid[i], nextSym(i, res.stops[i]));
    sfx('stop'); buzz(8);
    if (res.grid[i].includes('S')) { sfx('reveal'); res.grid[i].forEach((g, r) => g === 'S' && cellAt(i, r).classList.add('land')); }
    if (addBadges(i, res)) sfx('gem');
  }
  clearInterval(spinT);
}

/* ---------- win presentation ---------- */
let cycleT = null;
function clearWins() {
  clearInterval(cycleT); cycleT = null;
  reelsEl.classList.remove('won');
  $$('.cell.win', reelsEl).forEach(c => c.classList.remove('win'));
  $('#winbox').classList.remove('on');
}
const maxMult = (res, w) => {
  if (!res.mults) return 1;
  let m = 1;
  for (let i = 0; i < w.count; i++) m *= Math.max(1, ...w.cells.filter(([c]) => c === i).map(([c, r]) => res.grid[c][r] === 'W' ? res.mults[c][r] : 1));
  return Math.min(E.WAY_CAP, m);
};
function wayText(res, w, stake) {
  const mm = maxMult(res, w);
  return `${icon(w.sym)}<span><b style="color:#fff">${E.SYMBOLS[w.sym].short.toUpperCase()}</b> × ${w.count} reels · ${w.ways} way${w.ways > 1 ? 's' : ''}${mm > 1 ? ` · wilds up to ×${mm}` : ''} = ${fmtFull(stake * w.win)}</span>`;
}
function scatText(res, stake) { return `${icon('S')}<span><b style="color:#fff">${res.scat} GOLD COINS</b>${res.scatWin ? ` · ${fmtFull(stake * res.scatWin)}` : ''}${res.spins ? ` · +${res.spins} free spins` : ''}</span>`; }
function mark(cells) { cells.forEach(([i, r]) => cellAt(i, r).classList.add('win')); }
function showWins(res, stake) {
  const items = res.wins.slice().sort((a, b) => b.win - a.win).map(w => ({ html: wayText(res, w, stake), cells: w.cells }));
  if (res.scatWin || res.spins) items.unshift({ html: scatText(res, stake), cells: res.scatCells });
  if (!items.length) return 0;
  reelsEl.classList.add('won');
  items.forEach(it => mark(it.cells));
  const msg = $('#winmsg');
  msg.innerHTML = items.length > 1 ? `${items[0].html.replace('</span>', ` <span style="color:var(--faint)">+${items.length - 1} more</span></span>`)}` : items[0].html;
  const fr = frame.getBoundingClientRect(), big = res.total >= 2;
  if (!reduced()) burst(fr.left + fr.width / 2, fr.top + fr.height / 2, { count: big ? 54 : 18, speed: big ? 8 : 5, colors: ['#ffc23d', '#ff8a1f', '#ff3dc8', '#fff2a8'], gravity: 0.15 });
  if (items.length > 1) {
    let k = 0;
    cycleT = setInterval(() => {
      k = (k + 1) % items.length;
      $$('.cell.win', reelsEl).forEach(c => c.classList.remove('win'));
      mark(items[k].cells); msg.innerHTML = items[k].html;
    }, 1500);
  }
  return items.length;
}
function countWin(coins, ms, from = 0) {
  $('#winbox').classList.toggle('on', coins > 0);
  tween(from, coins, ms, v => ($('#winamt').textContent = fmtFull(v)));
}

/* ---------- banners ---------- */
function banner(html, ms) {
  const b = $('#banner'); b.innerHTML = `<div class="in">${html}<div class="f">Tap to continue</div></div>`; b.hidden = false;
  return new Promise(res => { let done = false; const end = () => { if (done) return; done = true; b.hidden = true; b.onclick = null; res(); }; b.onclick = end; sleep(ms).then(end); });
}

/* ---------- stampede (cosmetic) ---------- */
export async function stampede() {
  const herd = $('#herd');
  sfx('boom'); buzz([60, 40, 60, 40, 120]);
  if (reduced()) { herd.innerHTML = '<div class="word" style="animation:none">STAMPEDE!</div>'; herd.classList.add('on'); await sleep(900); herd.classList.remove('on'); herd.innerHTML = ''; return; }
  const sw = stage.clientWidth, H = stage.clientHeight;
  const B = (w, d, dl, top) => `<div class="bz" style="--w:${w}px;--d:${d}ms;--dl:${dl}ms;--sw:${sw}px;top:${top}px"><svg viewBox="0 0 120 70"><path d="${BISON_SIDE}" fill="#0c0306" stroke="#ff8a1f" stroke-width="2"/><path d="M90 14C92 8 96 8 98 12" stroke="#ffc23d" stroke-width="3" fill="none" stroke-linecap="round"/></svg></div>`;
  const base = Math.max(70, Math.min(150, sw / 5));
  let html = '<div class="dust"></div><div class="word">STAMPEDE!</div>';
  const rows = [[0.50, 0.75], [0.62, 0.9], [0.76, 1.1]];
  rows.forEach(([y, s], ri) => { for (let j = 0; j < 4; j++) { const w = base * s * (0.85 + ((j * 37 + ri * 11) % 30) / 100); html += B(w, 1500 - ri * 150 + j * 40, ri * 120 + j * 260, H * y - w * 0.3); } });
  herd.innerHTML = html; herd.classList.add('on'); stage.classList.add('quake');
  sfx('rise');
  const thump = setInterval(() => { sfx('stop'); }, 140);
  await sleep(1300); stage.classList.remove('quake');
  await sleep(1300); clearInterval(thump);
  herd.classList.remove('on'); herd.innerHTML = '';
}

/* ---------- round ---------- */
async function play() {
  if (busy) return;
  busy = true; paint();
  const stake = bet.value;
  const r = await startRound('buffalo', stake);
  if (!r) { busy = false; paint(); return; }
  sfx('bet'); buzz(10);
  $('#winamt').textContent = '0'; $('#winmsg').innerHTML = '<span>Good luck…</span>';
  const fast = () => speed === 'fast';

  const base = E.spin(await r.floats(E.REELS), false);
  await animateSpin(base);
  if (base.stampede) await stampede();
  let total = base.total, fsSpins = 0, fsWon = 0, ways = base.wins.length;
  if (base.total) {
    showWins(base, stake);
    countWin(stake * base.total, base.total >= 2 ? 1000 : 500);
    sfx(base.total >= 5 ? 'big' : base.total >= 1 ? 'win' : 'gem'); buzz(base.total >= 5 ? [20, 30, 20] : 12);
    await sleep(base.spins ? 1500 : fast() ? 450 : 900);
  }
  if (base.spins) {
    unlock('buffalo');
    let awarded = E.addSpins(0, base.spins), left = awarded;
    sfx('big'); buzz([30, 40, 30, 40, 80]);
    clearWins();
    await banner(`${icon('S')}<div class="k">Gold rush</div><div class="t">${awarded} FREE SPINS</div><div class="s">Winning wilds ×2 or ×3 · multiply up to ×27</div>`, 2800);
    const fsbar = $('#fsbar'); fsbar.hidden = false; stage.classList.add('fsmode');
    $('#fswon').textContent = '0'; $('#fsleft').textContent = left;
    while (left > 0 && total < E.MAX_WIN) {
      left--; fsSpins++;
      $('#fsleft').textContent = left;
      $('#winamt').textContent = '0'; $('#winmsg').innerHTML = `<span>Free spin ${fsSpins} of ${awarded}</span>`;
      const s = E.spin(await r.floats(E.FS_FLOATS), true);
      await animateSpin(s);
      if (s.stampede) await stampede();
      const before = fsWon;
      total += s.total; fsWon += s.total; ways += s.wins.length;
      if (s.total) {
        showWins(s, stake);
        countWin(stake * s.total, 650);
        tween(stake * before, stake * fsWon, 650, v => ($('#fswon').textContent = fmtFull(v)));
        sfx(s.total >= 5 ? 'big' : s.total >= 1 ? 'win' : 'gem'); buzz(12);
      }
      if (s.spins) {
        const add = E.addSpins(awarded, s.spins);
        await sleep(900);
        if (add) { awarded += add; left += add; $('#fsleft').textContent = left; sfx('level'); unlock('buffalo'); await banner(`${icon('S')}<div class="k">Retrigger</div><div class="t">+${add} SPINS</div><div class="s">${left} spins remaining</div>`, 1800); }
      }
      await sleep(s.total ? (fast() ? 550 : 1000) : (fast() ? 150 : 320));
    }
    const capped = total >= E.MAX_WIN;
    clearWins();
    sfx('cash');
    await banner(`<div class="k">${capped ? 'Max win reached' : 'Free spins complete'}</div><div class="t">${fmtFull(stake * Math.min(fsWon, E.MAX_WIN))}</div><div class="s">${fsSpins} spins · ${fmtX(Math.min(fsWon, E.MAX_WIN))} your bet</div>`, 2600);
    fsbar.hidden = true; stage.classList.remove('fsmode');
  }
  total = Math.min(total, E.MAX_WIN);
  const payout = Math.floor(stake * total), mult = payout / stake;
  r.settle(payout, { mult, detail: `${fmtFull(stake)} bet · ${fsSpins ? `${fsSpins} free spins · ` : ''}${ways} way win${ways === 1 ? '' : 's'} · ${fmtX(mult)}` });
  if (fsSpins) { countWin(payout, 900); $('#winmsg').innerHTML = `<span>Round total · base + ${fsSpins} free spins</span>`; }
  $('#lastwin').textContent = payout ? fmtFull(payout) : '-';
  $('#lastwin').style.color = payout > stake ? 'var(--l)' : payout ? 'var(--txt)' : 'var(--faint)';
  pushRecent($('#recent'), (fsSpins ? 'FS ' : '') + fmtX(mult), mult >= 10 ? 'b' : mult >= 1 ? 'w' : '');
  if (!payout) $('#winmsg').innerHTML = '<span>No win · the herd moves on</span>';
  busy = false; paint();
}

$('#spin').onclick = play;
addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat) return;
  if (e.target.closest?.('input,textarea,select') || $('.scrim')) return;
  e.preventDefault();
  play();
});
addEventListener('keyup', e => { if (e.code === 'Space' && e.target.closest?.('button') && !$('.scrim')) e.preventDefault(); });
paint();
