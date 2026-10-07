import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, tween, modal, state } from '/core/ag.js';
import * as E from '/games/zeus-engine.js';

boot({ nav: 'games' });
const RTP = '96.4%';

/* ---------- original SVG art ---------- */
const leaves = (cx, cy, rad, a0, a1, n, rx = 8, ry = 3.8, fill = 'url(#zg-leaf)') => Array.from({ length: n }, (_, i) => {
  const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad, rot = (a * 180 / Math.PI) + (a1 > a0 ? 90 : -90) + 30;
  return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="#eaffb5" stroke-width="1" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
}).join('');
const ART = {
  K: `<path d="M14 72L9 28l22 20L50 14l19 34 22-20-5 44Z" fill="url(#zg-gold)" stroke="#fff6c8" stroke-width="3" stroke-linejoin="round"/><path d="M50 22L36 50h28Z" fill="#fff" opacity=".25"/><rect x="12" y="68" width="76" height="16" rx="5" fill="url(#zg-gold2)" stroke="#fff6c8" stroke-width="2.5"/><circle cx="9" cy="28" r="4.5" fill="#fff6c8"/><circle cx="50" cy="14" r="5.5" fill="#fff6c8"/><circle cx="91" cy="28" r="4.5" fill="#fff6c8"/><path d="M50 46l8 9-8 10-8-10z" fill="#ff3dc8" stroke="#fff" stroke-width="1.5"/><circle cx="29" cy="58" r="4.5" fill="#22f0ff" stroke="#fff" stroke-width="1"/><circle cx="71" cy="58" r="4.5" fill="#22f0ff" stroke="#fff" stroke-width="1"/><circle cx="30" cy="76" r="3.2" fill="#8b5cff"/><circle cx="50" cy="76" r="3.2" fill="#ff3dc8"/><circle cx="70" cy="76" r="3.2" fill="#8b5cff"/>`,
  H: `<path d="M24 14V86M76 14V86" stroke="url(#zg-gold)" stroke-width="5" stroke-linecap="round"/><path d="M30 16H70Q70 40 54 50Q70 60 70 84H30Q30 60 46 50Q30 40 30 16Z" fill="#22f0ff2a" stroke="#c9fbff" stroke-width="2.5"/><path d="M35 25H65Q62 38 50 45Q38 38 35 25Z" fill="url(#zg-sand)"/><path d="M50 50V72" stroke="#ffd84d" stroke-width="2" stroke-dasharray="3 3"/><path d="M33 82Q50 62 67 82Z" fill="url(#zg-sand)"/><rect x="16" y="6" width="68" height="11" rx="4" fill="url(#zg-gold2)" stroke="#fff6c8" stroke-width="2"/><rect x="16" y="83" width="68" height="11" rx="4" fill="url(#zg-gold2)" stroke="#fff6c8" stroke-width="2"/><path d="M38 22q4 10 10 14" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6" stroke-linecap="round"/>`,
  R: `<ellipse cx="50" cy="62" rx="30" ry="28" fill="none" stroke="url(#zg-gold)" stroke-width="10"/><ellipse cx="50" cy="62" rx="30" ry="28" fill="none" stroke="#fff6c8" stroke-width="1.5" opacity=".7"/><path d="M30 82q-8-10-6-22" stroke="#fff" stroke-width="2.5" fill="none" opacity=".5" stroke-linecap="round"/><path d="M34 34L42 20H58L66 34L50 50Z" fill="url(#zg-ruby)" stroke="#ffe0f6" stroke-width="2.5" stroke-linejoin="round"/><path d="M34 34H66M42 20l8 14 8-14M42 34l8 16 8-16" fill="none" stroke="#5a0742" stroke-width="1.5" opacity=".6"/><path d="M45 23l5 9" stroke="#fff" stroke-width="2.5" opacity=".7" stroke-linecap="round"/>`,
  C: `<path d="M20 16H80Q80 52 50 60Q20 52 20 16Z" fill="url(#zg-gold)" stroke="#fff6c8" stroke-width="3" stroke-linejoin="round"/><ellipse cx="50" cy="17" rx="29" ry="6" fill="url(#zg-nectar)" stroke="#eaffb5" stroke-width="1.5"/><path d="M28 26q2 18 16 26" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/><circle cx="50" cy="38" r="6" fill="#22f0ff" stroke="#fff" stroke-width="1.5"/><circle cx="33" cy="34" r="3" fill="#ff3dc8"/><circle cx="67" cy="34" r="3" fill="#ff3dc8"/><path d="M45 60H55L57 78H43Z" fill="url(#zg-gold2)"/><ellipse cx="50" cy="62" rx="9" ry="3" fill="#ffb43d"/><ellipse cx="50" cy="84" rx="24" ry="7" fill="url(#zg-gold2)" stroke="#fff6c8" stroke-width="2.5"/>`,
  L: `${leaves(50, 50, 32, 100, 250, 8)}${leaves(50, 50, 32, 80, -70, 8)}<path d="M38 82Q50 74 62 82L66 94 58 88 50 92 42 88 34 94Z" fill="url(#zg-gold)" stroke="#fff6c8" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="82" r="5" fill="#ffd84d" stroke="#fff" stroke-width="1.5"/>`,
  b: `<polygon points="50,8 86,29 86,71 50,92 14,71 14,29" fill="url(#zg-sap)" stroke="#d8f4ff" stroke-width="3" stroke-linejoin="round"/><polygon points="50,26 70,38 70,62 50,74 30,62 30,38" fill="#0a2a8a" opacity=".45" stroke="#bfe6ff" stroke-width="1.5"/><path d="M50 8V26M86 29L70 38M86 71L70 62M50 92V74M14 71L30 62M14 29L30 38" stroke="#bfe6ff" stroke-width="1.5" opacity=".7"/><polygon points="50,12 66,22 50,30 34,22" fill="#fff" opacity=".4"/>`,
  g: `<polygon points="32,10 68,10 88,30 88,70 68,90 32,90 12,70 12,30" fill="url(#zg-emr)" stroke="#efffc9" stroke-width="3" stroke-linejoin="round"/><polygon points="38,24 62,24 74,36 74,64 62,76 38,76 26,64 26,36" fill="#1f5200" opacity=".45" stroke="#e2ffb0" stroke-width="1.5"/><path d="M32 10L38 24M68 10L62 24M88 30L74 36M88 70L74 64M68 90L62 76M32 90L38 76M12 70L26 64M12 30L26 36" stroke="#e2ffb0" stroke-width="1.5" opacity=".7"/><path d="M36 16H60" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/>`,
  p: `<path d="M50 8L88 40 50 92 12 40Z" fill="url(#zg-ame)" stroke="#efe6ff" stroke-width="3" stroke-linejoin="round"/><path d="M12 40H88M32 40L50 8 68 40M32 40L50 92 68 40" fill="none" stroke="#2a0b6a" stroke-width="2" stroke-linejoin="round" opacity=".6"/><polygon points="50,14 64,36 36,36" fill="#fff" opacity=".35"/>`,
  r: `<path d="M50 90C30 74 10 58 10 36C10 20 22 10 34 10C42 10 47 14 50 20C53 14 58 10 66 10C78 10 90 20 90 36C90 58 70 74 50 90Z" fill="url(#zg-rub)" stroke="#ffd6ec" stroke-width="3" stroke-linejoin="round"/><path d="M50 32C46 26 40 24 34 26M50 32C54 26 60 24 66 26M50 32V76" fill="none" stroke="#5a0732" stroke-width="2" opacity=".55"/><ellipse cx="30" cy="30" rx="9" ry="5" fill="#fff" opacity=".45" transform="rotate(-30 30 30)"/>`,
  Z: `<circle cx="50" cy="50" r="46" fill="url(#zg-gold2)" stroke="#fff6c8" stroke-width="2.5"/><circle cx="50" cy="50" r="38" fill="url(#zg-coin)" stroke="#ffd84d" stroke-width="2"/>${leaves(50, 50, 42, 120, 240, 6, 5, 2.4, '#ffe98a')}${leaves(50, 50, 42, 60, -60, 6, 5, 2.4, '#ffe98a')}<path d="M57 14L36 50H50L40 80L68 40H53L64 14Z" fill="url(#zg-gold)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><rect x="18" y="68" width="64" height="20" rx="10" fill="#2a0b4a" stroke="#ffd84d" stroke-width="2.5"/><text x="50" y="83.5" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="15" letter-spacing="2.5" fill="#ffd84d">ZEUS</text>`,
};
const DEFS = `<defs>
<linearGradient id="zg-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset=".45" stop-color="#ffd84d"/><stop offset="1" stop-color="#c27a12"/></linearGradient>
<linearGradient id="zg-gold2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe98a"/><stop offset=".5" stop-color="#ffb43d"/><stop offset="1" stop-color="#8a4a06"/></linearGradient>
<linearGradient id="zg-sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffb43d"/></linearGradient>
<radialGradient id="zg-ruby" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffc4f0"/><stop offset=".5" stop-color="#ff3dc8"/><stop offset="1" stop-color="#7d0a5e"/></radialGradient>
<radialGradient id="zg-nectar" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#f4ffd0"/><stop offset="1" stop-color="#86d10f"/></radialGradient>
<linearGradient id="zg-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2ff9e"/><stop offset=".6" stop-color="#8be22a"/><stop offset="1" stop-color="#2f8a12"/></linearGradient>
<linearGradient id="zg-sap" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9f4ff"/><stop offset=".5" stop-color="#22a8ff"/><stop offset="1" stop-color="#1238b8"/></linearGradient>
<linearGradient id="zg-emr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eaffb5"/><stop offset=".5" stop-color="#5fe03a"/><stop offset="1" stop-color="#1a7a10"/></linearGradient>
<linearGradient id="zg-ame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3d6ff"/><stop offset=".5" stop-color="#9b6cff"/><stop offset="1" stop-color="#3f1aa8"/></linearGradient>
<radialGradient id="zg-rub" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffb3d1"/><stop offset=".5" stop-color="#ff2f6d"/><stop offset="1" stop-color="#7a0626"/></radialGradient>
<radialGradient id="zg-coin" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#5a2a9a"/><stop offset="1" stop-color="#140630"/></radialGradient>
</defs>`;
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${Object.entries(ART).map(([k, v]) => `<symbol id="zs-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#zs-${k}"/></svg>`;
const GC = { b: '#22a8ff', g: '#5fe03a', p: '#9b6cff', r: '#ff2f6d' };
const orbTier = v => (v >= 100 ? 4 : v >= 20 ? 3 : v >= 6 ? 2 : 1);
const CRACKLE = '<svg viewBox="0 0 40 40"><path d="M22 4l-7 14h6l-5 18 11-20h-6l5-12z" fill="#fff"/></svg>';
const orbHTML = v => `<div class="orb t${orbTier(v)}">${CRACKLE}<b>${v}×</b></div>`;
const cellHTML = c => {
  const kind = c.s === 'M' ? 'mo' : c.s === 'Z' ? 'sc' : E.SYMBOLS[c.s].kind === 'low' ? 'lo' : 'hi';
  return `<div class="cell k-${c.s} ${kind}"${GC[c.s] ? ` style="--gc:${GC[c.s]}"` : ''}>${c.s === 'M' ? orbHTML(c.v) : icon(c.s)}</div>`;
};

/* Zeus: original figure. The #arm group pivots at the shoulder (136,150). */
$('#zeus').innerHTML = `<defs>
<radialGradient id="zz-aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8b5cff" stop-opacity=".9"/><stop offset=".6" stop-color="#8b5cff" stop-opacity=".25"/><stop offset="1" stop-color="#8b5cff" stop-opacity="0"/></radialGradient>
<linearGradient id="zz-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2275"/><stop offset="1" stop-color="#0d0a26"/></linearGradient>
<linearGradient id="zz-skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a3d96"/><stop offset="1" stop-color="#231a55"/></linearGradient>
<linearGradient id="zz-beard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#cfc6ff"/><stop offset="1" stop-color="#8b7ae0"/></linearGradient>
</defs>
<circle class="aura" cx="100" cy="125" r="98" fill="url(#zz-aura)"/>
<g class="chest">
  <path d="M56 152Q100 130 144 152L170 300H30Z" fill="url(#zz-robe)" stroke="#8b5cff" stroke-width="2"/>
  <path d="M60 154Q40 162 37 204Q35 240 46 266L62 262Q55 222 66 188Z" fill="url(#zz-skin)" stroke="#8b5cff" stroke-width="1.5"/>
  <circle cx="54" cy="264" r="9" fill="url(#zz-skin)" stroke="#8b5cff" stroke-width="1.5"/>
  <path d="M60 150L80 144Q122 208 162 290L148 300Q106 222 60 164Z" fill="url(#zg-gold2)" opacity=".92"/>
  <path d="M70 160Q110 220 150 298" stroke="#fff6c8" stroke-width="1.2" fill="none" opacity=".6"/>
  <path d="M118 176q12 4 20 -2M116 196q10 4 18 0" stroke="#8b5cff" stroke-width="1.5" fill="none" opacity=".7"/>
  <rect x="91" y="112" width="18" height="26" fill="url(#zz-skin)"/>
  <ellipse cx="100" cy="92" rx="21" ry="25" fill="url(#zz-skin)" stroke="#8b5cff" stroke-width="1.5"/>
  <path d="M77 96Q70 62 92 58Q100 50 110 58Q132 60 124 96Q122 76 112 72Q100 66 88 72Q80 78 77 96Z" fill="url(#zz-beard)"/>
  <path d="M74 98q-6 8 -2 18M126 98q6 8 2 18" stroke="#e6e0ff" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${leaves(100, 84, 24, 200, 275, 4, 6, 2.6, '#ffd84d')}${leaves(100, 84, 24, 340, 265, 4, 6, 2.6, '#ffd84d')}
  <path d="M86 86l10 2M114 86l-10 2" stroke="#e6e0ff" stroke-width="3" stroke-linecap="round"/>
  <ellipse class="eye" cx="92" cy="93" rx="3.4" ry="2.2" fill="#22f0ff" style="filter:drop-shadow(0 0 3px #22f0ff)"/>
  <ellipse class="eye" cx="108" cy="93" rx="3.4" ry="2.2" fill="#22f0ff" style="filter:drop-shadow(0 0 3px #22f0ff)"/>
  <path d="M100 94l-3 10h5" stroke="#8b7ae0" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M78 102Q76 124 84 144Q88 162 95 178Q100 168 103 180Q110 164 116 150Q124 128 122 102Q114 114 100 112Q86 114 78 102Z" fill="url(#zz-beard)"/>
  <path d="M88 118q-2 14 4 28M100 116v30M112 118q2 14 -4 28M94 150q2 10 3 18M106 150q-1 8 -3 16" stroke="#8b7ae0" stroke-width="1.4" fill="none" opacity=".7"/>
  <path d="M86 108Q100 100 114 108Q107 114 100 109Q93 114 86 108Z" fill="#fff"/>
</g>
<g id="arm">
  <path d="M126 150Q132 136 148 144L164 78Q158 68 148 72Z" fill="url(#zz-skin)" stroke="#8b5cff" stroke-width="1.5"/>
  <circle cx="137" cy="152" r="13" fill="url(#zz-robe)" stroke="#8b5cff" stroke-width="1.5"/>
  <rect x="146" y="102" width="16" height="6" rx="2" fill="url(#zg-gold2)" transform="rotate(14 154 105)"/>
  <polygon class="bolt" points="166,8 142,52 157,52 145,92 176,42 160,42 174,8" fill="url(#zg-gold)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="156" cy="72" r="8.5" fill="url(#zz-skin)" stroke="#8b5cff" stroke-width="1.5"/>
  <circle id="tip" cx="170" cy="9" r="1" fill="none"/>
</g>`;

/* ---------- rules / paytable ---------- */
function payTable(bet) {
  const v = m => (bet ? fmtFull(Math.floor(bet * m)) : `${m}×`);
  const rows = E.PAY_IDS.map(k => `<div class="pr">${icon(k)}<div class="pv"><i>12-30</i>${v(E.SYMBOLS[k].pays[2])}<br><i>10-11</i>${v(E.SYMBOLS[k].pays[1])}<br><i>8-9</i>${v(E.SYMBOLS[k].pays[0])}</div></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">${bet ? `Pays in Glow for a bet of ${fmtFull(bet)}.` : 'Pays are multiples of your bet.'} Count matching symbols anywhere on the grid.</p>
  <div class="ptab">${rows}
    <div class="pr wide">${icon('Z')}<div class="pv txt"><b style="color:var(--y)">ZEUS SCATTER</b> pays anywhere: 4 → ${v(3)}, 5 → ${v(5)}, 6+ → ${v(100)}. 4+ in the base game trigger <b>${E.FS_AWARD} free spins</b>. 3+ during free spins add <b>+${E.FS_RETRIGGER}</b>.</div></div>
    <div class="pr wide"><div class="orbmini">${orbHTML(25)}</div><div class="pv txt"><b style="color:var(--p)">LIGHTNING ORBS</b> carry 2× to 500× and can land on any spin or tumble. When a tumble sequence ends with a win, every orb on screen is added together and multiplies that sequence's win.</div></div>
  </div>`;
}
const RULES = () => `<p>6 reels × 5 rows. <b>Scatter pays:</b> 8 or more matching symbols anywhere on the grid win, with bigger pays for 10-11 and 12+.</p>
  <p><b>Tumble:</b> winning symbols explode, everything above drops down, and new symbols fall in. This repeats until there's no new win. All wins in that chain form one <b>tumble sequence</b>.</p>
  <p><b>Lightning orbs</b> (2× to 500×, mostly small) can land anywhere. Zeus strikes each one. At the end of a sequence with a win, all orbs on screen are <b>added together</b> and multiply that sequence's win.</p>
  <p><b>Free spins:</b> 4+ Zeus scatters trigger ${E.FS_AWARD} free spins (3+ during the bonus retrigger +${E.FS_RETRIGGER}). The multiplier is <b>persistent</b>: every orb that lands in a winning sequence adds to a running total, which multiplies every winning sequence for the rest of the bonus.</p>
  ${payTable(0)}
  <p>Scatter pays aren't multiplied. The base spin and all its free spins are one round. <b>Max win ${fmtFull(E.MAX_WIN)}× the bet</b> per round; reaching it ends the round.</p>
  <p>Theoretical RTP <b>${RTP}</b> (simulated over 20M rounds). Wins on about 28.5% of spins; free spins trigger about 1 in 425 spins.</p>`;
gameHeader($('#panel'), { title: 'Storm of Olympus', rules: RULES() });

/* ---------- controls ---------- */
const bet = BetControl($('#betslot'), { game: 'zeus', min: 10 });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:zeus:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:zeus:turbo', turboEl.checked ? '1' : '0'); };
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTable(bet.value)}`); };
let busy = false;
function paint() {
  const s = $('#spin'); s.disabled = busy; s.textContent = busy ? '⚡' : 'SPIN';
  bet.disable(busy);
}
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = ms => (turboEl.checked ? ms * 0.45 : ms);
const wait = ms => sleep(T(ms));

/* ---------- board ---------- */
const board = $('#board'), stage = $('#stage'), zeus = $('#zeus'), zap = $('#zap');
const cols = Array.from({ length: E.COLS }, () => board.appendChild(h('<div class="col"></div>')));
const cellAt = (c, r) => cols[c].children[r];
function render(grid) { grid.forEach((col, c) => (cols[c].innerHTML = col.map(cellHTML).join(''))); }
// idle demo grid (cosmetic only)
{
  const demo = 'KHRCLbgprbgpKHRCLbgprZbgpLCRHK'.split('');
  render(Array.from({ length: E.COLS }, (_, c) => Array.from({ length: E.ROWS }, (_, r) => ({ s: demo[(c * 5 + r * 7) % demo.length], v: 0 }))));
}
const pitch = () => { const a = cellAt(0, 0), b = cellAt(0, 1); return a && b ? b.offsetTop - a.offsetTop : 60; };
const center = el => { const s = stage.getBoundingClientRect(), b = el.getBoundingClientRect(); return [b.left - s.left + b.width / 2, b.top - s.top + b.height / 2]; };

const say = (a) => ($('#say').textContent = Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a);
const L_SPIN = ['Behold, the heavens stir!', 'The storm answers to me alone.', 'Feel the thunder, mortal!', 'Olympus is watching.', 'Let the skies split open!', 'Clouds, gather!', 'Another offering? Bold.'];
const L_WIN = ['Ha! The gods smile on you.', 'A worthy tribute!', 'The storm provides.', 'Even Olympus applauds that.', 'Well struck, mortal!'];
const L_LOSE = ['Even gods have quiet nights.', 'The clouds gather... next time.', 'Patience. Thunder always returns.', 'Hmph. The Fates are fickle.', 'Not every storm breaks.'];
const L_ORB = ['BY THUNDER!', 'Feel my lightning!', 'I strike!', 'Multiply, by my will!', 'The sky obeys me!'];
const L_LAND = ['A spark of my power...', 'Lightning finds its mark.', 'An orb! Now win, mortal.', 'I have charged the sky.'];

function clearWins() { board.classList.remove('won'); $$('.cell.win,.cell.hot', board).forEach(c => c.classList.remove('win', 'hot')); $('#wtags').innerHTML = ''; }
let mplShown = 0;
function setMpl(to, label, on = to > 0) {
  const b = $('#mpl'); $('#mplab').textContent = label; $('#mplq').classList.toggle('off', !on);
  tween(mplShown, to, T(400), x => (b.textContent = Math.round(x) + '×')); mplShown = to;
  if (on && !reduced()) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 160); }
}
let shownWin = 0;
function setWin(coins, msg) {
  const box = $('#winbox'); box.classList.toggle('on', coins > 0);
  if (msg != null) $('#winmsg').textContent = msg;
  tween(shownWin, coins, T(500), v => ($('#winamt').textContent = fmtFull(v))); shownWin = coins;
}

/* ---------- lightning ---------- */
function bolt(from, to, color = '#ffd84d', w = 5) {
  const s = stage.getBoundingClientRect(); zap.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
  const [x1, y1] = from, [x2, y2] = to, n = 9, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const pts = Array.from({ length: n + 1 }, (_, i) => { const k = i / n, j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * Math.min(40, len * 0.18); return `${(x1 + dx * k + nx * j).toFixed(1)},${(y1 + dy * k + ny * j).toFixed(1)}`; }).join(' ');
  const g = h(`<svg><g><polyline points="${pts}" stroke="${color}" stroke-width="${w}" style="filter:drop-shadow(0 0 8px ${color})"/><polyline points="${pts}" stroke="#fff" stroke-width="${Math.max(1.5, w / 3)}"/></g></svg>`).firstChild;
  zap.appendChild(g); setTimeout(() => g.remove(), 420);
}
function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
async function strike(orbs, big) {
  if (!orbs.length) return;
  const red = reduced();
  zeus.classList.add('raise'); say(big ? L_ORB : L_LAND);
  await wait(big ? 260 : 160);
  for (const o of orbs) {
    const el = cellAt(o.c, o.r); if (!el) continue;
    zeus.classList.remove('raise'); zeus.classList.add('strike');
    if (!red) { bolt(center($('#tip')), center(el), orbTier(o.v) >= 3 ? '#ff3dc8' : big ? '#ffd84d' : '#8b5cff', big ? 6 : 4); flash(); }
    el.classList.remove('zap'); void el.offsetWidth; el.classList.add('zap');
    sfx(big ? 'boom' : 'reveal'); buzz(big ? 25 : 10);
    if (big && !red) { const [x, y] = center(el), s = stage.getBoundingClientRect(); burst(s.left + x, s.top + y, { count: 16, colors: ['#ffd84d', '#fff', '#8b5cff'], speed: 5, gravity: 0.1 }); }
    if (o.onHit) o.onHit();
    await wait(big ? 300 : 170);
    zeus.classList.remove('strike'); zeus.classList.add('raise');
    await wait(80);
  }
  zeus.classList.remove('raise', 'strike');
}

/* ---------- animations ---------- */
const anim = (el, from, dur, delay, easing = 'cubic-bezier(.3,0,.45,1.18)') => el.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0)' }], { duration: dur, delay, easing, fill: 'backwards' }).finished.catch(() => {});

async function dropIn(grid, mode) {
  const red = reduced(), P = pitch(), H = P * E.ROWS;
  clearWins();
  if (!red) {
    // old symbols fall out
    sfx('spin');
    await Promise.all(cols.map((col, c) => col.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${H}px)`, opacity: 0 }], { duration: T(240), delay: T(c * 30), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {})));
  }
  render(grid);
  cols.forEach(col => col.getAnimations().forEach(a => a.cancel()));
  const need = mode === 'fs' ? E.FS_RETRIGGER_AT : E.FS_TRIGGER;
  let scat = 0, t = 0;
  const jobs = [];
  for (let c = 0; c < E.COLS; c++) {
    const antic = !red && scat === need - 1;
    if (antic) { await Promise.all(jobs.splice(0)); t = 0; }
    const start = t + (antic ? T(800) : 0);
    if (antic) { cols[c].classList.add('antic'); sfx('rise'); buzz(15); }
    const dur = red ? 0 : T(antic ? 520 : 380);
    if (!red) for (let r = 0; r < E.ROWS; r++) jobs.push(anim(cellAt(c, r), -H - P * 0.5, dur, start + T((E.ROWS - 1 - r) * 28)));
    const col = c;
    jobs.push(sleep(red ? 0 : start + dur).then(() => { cols[col].classList.remove('antic'); sfx('stop'); if (grid[col].some(x => x.s === 'Z')) { sfx('reveal'); buzz(8); } }));
    scat += grid[c].filter(x => x.s === 'Z').length;
    t = start + T(red ? 0 : 90);
  }
  await Promise.all(jobs);
  const orbs = E.orbsOn(grid);
  if (orbs.length) await strike(orbs, false);
}

async function tumbleAnim(grid, moves) {
  const red = reduced();
  render(grid);
  const P = pitch(), jobs = [], fresh = [];
  for (let c = 0; c < E.COLS; c++) for (let r = 0; r < E.ROWS; r++) {
    const src = moves[c][r]; if (src === r) continue;
    if (src < 0 && grid[c][r].s === 'M') fresh.push({ c, r, v: grid[c][r].v });
    if (!red) jobs.push(anim(cellAt(c, r), -(r - src) * P, T(320), T(c * 22)));
  }
  await Promise.all(jobs);
  sfx('stop');
  if (fresh.length) await strike(fresh, false);
}

function banner(html, ms) {
  const b = $('#banner'); b.innerHTML = `<div class="in">${html}<div class="f">Tap to continue</div></div>`; b.hidden = false;
  return new Promise(res => { let done = false; const end = () => { if (done) return; done = true; b.hidden = true; b.onclick = null; res(); }; b.onclick = end; sleep(ms).then(end); });
}

/* ---------- round driver ---------- */
async function play() {
  if (busy) return;
  busy = true; paint();
  const stake = bet.value;
  const r = await startRound('zeus', stake);
  if (!r) { busy = false; paint(); return; }
  sfx('bet'); buzz(10);
  let total = 0, seqBase = 0, fsStartTotal = 0, fsOn = false, scSeen = 0;
  setWin(0, 'Good luck'); say(L_SPIN);
  setMpl(0, 'Orb multiplier', false);
  const H = {
    async drop(y) {
      if (y.mode === 'base') setMpl(0, 'Orb multiplier', false);
      seqBase = total;
      await dropIn(y.grid, y.mode);
    },
    async win(y) {
      board.classList.add('won');
      y.remove.forEach(([c, rr]) => cellAt(c, rr).classList.add('win'));
      $('#wtags').innerHTML = y.wins.map(w => `<span>${w.n} ${E.SYMBOLS[w.s].name} · ${fmtX(w.pay)}</span>`).join('');
      setWin(stake * (seqBase + y.seqWin), `Tumble win · ${fmtX(y.seqWin)} so far`);
      sfx(y.win >= 2 ? 'win' : 'gem'); buzz(12);
      const fr = $('#frame').getBoundingClientRect();
      if (!reduced()) burst(fr.left + fr.width / 2, fr.top + fr.height / 2, { count: y.win >= 2 ? 40 : 16, speed: y.win >= 2 ? 7 : 4, colors: ['#ffd84d', '#ff3dc8', '#8b5cff', '#22f0ff'], gravity: 0.15 });
      await wait(750);
      y.remove.forEach(([c, rr]) => cellAt(c, rr).classList.add('boom'));
      sfx('chip');
      await wait(330);
    },
    async tumble(y) { clearWins(); await tumbleAnim(y.grid, y.moves); },
    async orbs(y) {
      const orbs = E.orbsOn(y.grid);
      const label = y.mode === 'fs' ? 'Total multiplier' : 'Orb multiplier';
      let acc = y.mode === 'fs' ? y.running - y.sum : 0;
      if (y.mode === 'fs' && acc > 0) setMpl(acc, label);
      orbs.forEach(o => { o.onHit = () => { acc += o.v; setMpl(acc, label); if (fsOn) $('#fsmult').textContent = acc + '×'; }; });
      await strike(orbs, true);
      if (!orbs.length) setMpl(y.mult, label);
      setWin(stake * (seqBase + y.seqWin * y.mult), `${fmtX(y.seqWin)} × ${y.mult} = ${fmtX(y.seqWin * y.mult)}`);
      if (y.mult >= 10) { sfx('big'); buzz([30, 40, 60]); } else sfx('win');
      await wait(900);
    },
    async seq(y) {
      total = Math.min(E.MAX_WIN, total + y.win + y.scatterPay);
      if (y.win >= 50) unlock('zeus');
      if (y.scatterPay || y.scatters >= (y.mode === 'fs' ? E.FS_RETRIGGER_AT : E.FS_TRIGGER)) {
        board.classList.add('won');
        y.grid.forEach((col, c) => col.forEach((x, rr) => x.s === 'Z' && cellAt(c, rr).classList.add('win', 'hot')));
        sfx('reveal'); await wait(700);
      }
      const parts = [];
      if (y.win) parts.push(y.mult > 1 ? `${fmtX(y.seqWin)} × ${y.mult}` : `Tumble ${fmtX(y.win)}`);
      if (y.scatterPay) parts.push(`${y.scatters} Zeus scatters ${y.scatterPay}×`);
      if (y.win || y.scatterPay) { setWin(stake * total, parts.join(' · ')); say(L_WIN); }
      else if (y.mode === 'base') { setWin(0, 'No win · spin again'); say(L_LOSE); }
      if (fsOn) $('#fswon').textContent = fmtFull(stake * (total - fsStartTotal));
      if (y.mode === 'fs') await wait(y.win ? 600 : 250);
      scSeen = y.scatters;
    },
    async fsStart(y) {
      fsOn = true; fsStartTotal = total;
      sfx('big'); buzz([30, 40, 30, 40, 80]); clearWins(); say('You have summoned me. Now, the true storm!');
      await banner(`${icon('Z')}<div class="k">${scSeen} Zeus scatters</div><div class="t">${y.spins} FREE SPINS</div><div class="s">Orbs build a persistent multiplier</div>`, 3000);
      $('#fsbar').hidden = false; stage.classList.add('fsmode');
      $('#fsleft').textContent = y.spins; $('#fsmult').textContent = '0×'; $('#fswon').textContent = '0';
      setMpl(0, 'Total multiplier', false);
    },
    async fsSpin(y) { $('#fsleft').textContent = y.left; $('#fsmult').textContent = y.running + '×'; setWin(stake * total, `Free spin ${y.played} of ${y.awarded}`); },
    async retrigger(y) {
      sfx('level'); buzz([20, 30, 20]); $('#fsleft').textContent = y.left;
      await banner(`${icon('Z')}<div class="k">Retrigger</div><div class="t">+${y.add} SPINS</div><div class="s">${y.left} spins remaining</div>`, 1800);
    },
    async fsAfter() {},
    async fsEnd(y) {
      clearWins(); sfx('cash'); say('The storm rests... for now.');
      await banner(`<div class="k">Free spins complete</div><div class="t">${fmtFull(stake * (y.total - fsStartTotal))}</div><div class="s">${y.played} spins · final multiplier ${y.running}×</div>`, 2800);
      $('#fsbar').hidden = true; stage.classList.remove('fsmode'); fsOn = false;
    },
    async cap() { sfx('big'); await banner(`<div class="k">Maximum win</div><div class="t">${fmtFull(E.MAX_WIN)}×</div><div class="s">The heavens can give no more</div>`, 2600); },
  };
  const g = E.playRound();
  let input, res;
  for (;;) {
    const step = g.next(input); input = undefined;
    if (step.done) { res = step.value; break; }
    const y = step.value;
    if (y.t === 'need') input = await r.floats(y.n);
    else { try { await H[y.t]?.(y); } catch (e) { console.warn(e); } }
  }
  const payout = Math.floor(stake * res.total), mult = payout / stake;
  r.settle(payout, { mult, detail: `${fmtFull(stake)} bet${res.fsPlayed ? ` · ${res.fsPlayed} free spins · ${res.running}× final` : ''} · ${fmtX(mult)}` });
  setWin(payout, payout ? (res.fsPlayed ? `Round total · base + ${res.fsPlayed} free spins` : $('#winmsg').textContent) : 'No win · spin again');
  $('#lastwin').textContent = fmtFull(payout);
  $('#lastwin').style.color = payout > stake ? 'var(--l)' : payout ? 'var(--txt)' : 'var(--faint)';
  pushRecent($('#recent'), (res.fsPlayed ? 'FS ' : '') + fmtX(mult), mult >= 10 ? 'b' : mult >= 1 ? 'w' : '');
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
$('#rtp').textContent = RTP;
paint();
