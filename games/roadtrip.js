/* Route 66 — Road Trip Link: pick stops, spin the Link Wheel. */
import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, modal, fmtFull, sleep } from '../../core/ag.js';
import {buildGrid, reelStops, countWin, banner, hideBanner, makeSpinner, installRedHook, RED, symMap} from './v2present.js';
import { ART, DEFS } from './art-route66.js';
import { createGame, SYMBOLS, META } from './engine/v2/route66.js';
const SYM = symMap(SYMBOLS);

boot({ nav: 'games' });
installRedHook();

document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs>${
  Object.entries(ART).map(([k, v]) => `<symbol id="rt6-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')
}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#rt6-${k}"/></svg>`;

const game = createGame();
const gridEl = $('#grid'), stage = $('#stage');
const gridApi = buildGrid(gridEl, 5, 3, icon);
const winbox = $('#winbox'), winamt = $('#winamt');
const linkbar = $('#linkbar');
const msg = m => { $('#msg').textContent = m || ''; };

gameHeader($('#panel'), { title: META.name, rules:
  `<p>30 lines. <b>3+ diner Lines</b> trigger the <b>Road Trip Link</b>: five roadside stops, you pick three. Each stop reveals instant Glow — or the <b>Link Wheel</b>, with segments up to <b>500×</b>.</p>
  <div id="rt6pay"></div>
  <p>Theoretical RTP about 96% (1M-spin simulation).</p>` });

const bet = BetControl($('#betslot'), { game: 'route-66', min: 30, label: 'Total bet', onChange: () => {} });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:route-66:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:route-66:turbo', turboEl.checked ? '1' : '0'); };
let autoLeft = 0, autoN = 10, busy = false;
$('#aseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy || autoLeft) return; sfx('tap'); autoN = +b.dataset.n; $$('#aseg button').forEach(x => x.classList.toggle('on', x === b)); };

const paint = makeSpinner({ spinBtn: $('#spin'), autoBtn: $('#auto'), segBtns: $$('#aseg button'), isBusy: () => busy, getAuto: () => autoLeft, setAuto: n => { autoLeft = n; } });

function payTableHTML() {
  const rows = Object.entries(SYM).filter(([id, m]) => m.pays && id !== 'diner').map(([id, m]) =>
    `<div class="pr">${icon(id)}<div class="pv">${['5', '4', '3'].filter(n => m.pays[n]).map(n => `<i>${n}×</i>${m.pays[n]}×`).join('<br>')}</div></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">Line pays × line bet (total ÷ 30).</p><div class="s2-ptable">${rows}
  <div class="pr wide">${icon('diner')}<div class="pv txt"><b style="color:#ff9ad7">DINER LINE</b> — 3+ anywhere trigger the Road Trip Link (pick 3 of 5 stops; the Link Wheel pays up to 500×).</div></div></div>`;
}
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTableHTML()}`); };

const STOP_ART = ['motel', 'diner', 'guitar', 'boots', 'hat']; // by engine stop index

async function playTrip(trip, stake) {
  const turbo = turboEl.checked;
  linkbar.classList.add('on');
  sfx('reveal'); buzz(25);
  let glowWon = 0, wheelResult = null;
  // The engine pre-resolves outcomes: tap i (in tap order) reveals stops[trip.picked[i]].
  const revealed = new Map();
  const used = new Set();
  let picksLeft = 3;
  const ov = $('#overlay');
  const pickFor = () => {
    const i = trip.picked.findIndex(id => !used.has(id));
    const stop = trip.stops[trip.picked[i]];
    used.add(trip.picked[i]);
    return stop;
  };
  const renderPicks = () => {
    ov.innerHTML = `<div><div class="k">Road Trip Link</div><div class="t">PICK ${picksLeft} STOP${picksLeft > 1 ? 'S' : ''}</div>
    <div class="s2-picks">${trip.stops.map((st, idx) => {
      if (revealed.has(idx)) {
        const p = revealed.get(idx);
        return `<div class="s2-pick done">${icon(STOP_ART[idx])}<div><b>${p.kind === 'wheel' ? 'LINK WHEEL' : fmtFull(p.value * stake)}</b><small>${st.name}</small></div></div>`;
      }
      return `<div class="s2-pick" data-s="${idx}">${icon(STOP_ART[idx])}<div>${st.name}<small>tap to reveal</small></div></div>`;
    }).join('')}</div><div class="f"></div></div>`;
    ov.querySelectorAll('[data-s]').forEach(el => (el.onclick = e => {
      e.stopPropagation();
      const s = +el.dataset.s;
      if (revealed.has(s) || picksLeft <= 0) return;
      const p = pickFor();
      revealed.set(s, p);
      if (p.kind === 'instant') { glowWon += p.value * stake; sfx('win'); }
      else { sfx('reveal'); }
      picksLeft--;
      renderPicks();
      if (picksLeft === 0) setTimeout(() => ovResolve(), turbo ? 300 : 700);
    }));
  };
  let ovResolve;
  const ovDone = new Promise(res => (ovResolve = res));
  ov.classList.add('on');
  renderPicks();
  await ovDone;
  // wheel if any revealed pick awarded it
  const wheelPick = [...revealed.values()].find(p => p.kind === 'wheel');
  if (wheelPick && trip.wheel) {
    const w = trip.wheel;
    const n = w.segments.length, arc = 360 / n;
    const segs = w.segments.map((sg, i) => {
      const a0 = (i * arc * Math.PI) / 180, a1 = ((i + 1) * arc * Math.PI) / 180;
      const x0 = 150 + 145 * Math.sin(a0), y0 = 150 - 145 * Math.cos(a0);
      const x1 = 150 + 145 * Math.sin(a1), y1 = 150 - 145 * Math.cos(a1);
      const mid = ((i + 0.5) * arc * Math.PI) / 180;
      const lx = 150 + 100 * Math.sin(mid), ly = 150 - 100 * Math.cos(mid);
      const col = i % 2 ? '#1a0b26' : '#2a1230';
      return `<path d="M150 150 L${x0.toFixed(1)} ${y0.toFixed(1)} A145 145 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${col}" stroke="#ff3dc8" stroke-width="2"/>
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="15" font-weight="800" fill="#ffe98a" transform="rotate(${(i + 0.5) * arc} ${lx.toFixed(1)} ${ly.toFixed(1)})">${w.segments[i].label}</text>`;
    }).join('');
    ov.innerHTML = `<div><div class="k">Link Wheel</div><div class="s2-wheel"><div class="ptr"></div>
      <svg viewBox="0 0 300 300" id="wheelspin" style="transition:transform 2.8s cubic-bezier(.15,.8,.2,1)">${segs}<circle cx="150" cy="150" r="26" fill="#ff3dc8"/><text x="150" y="158" text-anchor="middle" font-size="15" font-weight="900" fill="#0b0b18">66</text></svg></div>
      <div class="f">The wheel is spinning…</div></div>`;
    const wsel = ov.querySelector('#wheelspin');
    await sleep(120);
    const target = w.landedIndex * arc + arc / 2; // segment center angle from top
    const spins = 5 * 360;
    wsel.style.transform = `rotate(${spins - target + 360 - (spins - target) % 360}deg)`;
    sfx('reveal'); buzz(20);
    await sleep(RED() || turbo ? 400 : 3000);
    const seg = w.segments[w.landedIndex];
    wheelResult = w.prize * stake;
    ov.querySelector('.f').textContent = `${seg.label} — tap to collect`;
    sfx('win'); buzz(30);
    await new Promise(res => (ov.onclick = () => { ov.onclick = null; res(); }));
  }
  ov.classList.remove('on');
  linkbar.classList.remove('on');
  const won = glowWon + (wheelResult || 0);
  await countWin(winbox, winamt, `Road Trip Link won ${fmtFull(won)}`, won, 900);
  return won;
}

async function spinOnce() {
  const stake = bet.value;
  const r = await startRound('route-66', stake);
  if (!r) { msg('Not enough Glow'); return 'broke'; }
  busy = true; paint(); msg('');
  winamt.textContent = '0'; winbox.classList.remove('on');
  sfx('bet');
  const res = game.spin(stake);
  let total = 0;
  // base grid first
  gridApi.clearMarks();
  gridApi.paintGrid(res.grid);
  await reelStops([...gridEl.children], [0, 1, 2, 3, 4], { turbo: turboEl.checked, onStop: () => sfx('stop') });
  if (res.lineWins.length) {
    const cells = [];
    for (const w of res.lineWins) { total += w.coins; for (const c of w.cells) { gridApi.mark(c[0], c[1], 'win'); cells.push(c); } }
    gridApi.dimExcept(cells);
    sfx('win'); buzz(12);
    const best = res.lineWins.slice().sort((a, b) => b.coins - a.coins)[0];
    $('#winmsg').textContent = `${best.count}× ${SYM[best.symbol].name}${res.lineWins.length > 1 ? ` +${res.lineWins.length - 1} more` : ''}`;
    await countWin(winbox, winamt, $('#winmsg').textContent, total, turboEl.checked ? 150 : 400);
  }
  if (res.roadTrip) {
    sfx('reveal'); buzz(25);
    await banner(stage, { kicker: 'Road Trip Link', title: 'ROAD TRIP', sub: 'Pick 3 stops — find the Link Wheel', ms: 1600 });
    total += await playTrip(res.roadTrip, stake);
  } else if (!res.lineWins.length) {
    await countWin(winbox, winamt, 'No lines — keep rolling', 0, 250);
  }
  const mult = stake ? total / stake : 0;
  const settled = r.settle(Math.floor(total), { detail: 'route66-roadtrip' });
  if (res.roadTrip || mult >= 20) { autoLeft = 0; msg(res.roadTrip ? 'Road trip complete.' : 'Big win — autoplay stopped.'); }
  busy = false; paint();
  return settled;
}

async function loop() {
  while (autoLeft > 0) {
    const s = await spinOnce();
    if (s === 'broke') { autoLeft = 0; break; }
    autoLeft--; paint();
    if (autoLeft <= 0) break;
    await sleep(450);
  }
  autoLeft = 0; paint();
}
$('#spin').onclick = () => { sfx('tap'); if (autoLeft) { autoLeft = 0; paint(); return; } if (!busy) return spinOnce(); };
$('#auto').onclick = () => { sfx('tap'); if (autoLeft) { autoLeft = 0; paint(); } else if (!busy) { autoLeft = autoN; paint(); loop(); } };
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.target.closest?.('input,textarea,select') && !$('.scrim')) { e.preventDefault(); $('#spin').click(); }
});
gridApi.paintGrid([['car','motel','guitar'],['boots','hat','badge'],['A','K','Q'],['J','car','motel'],['guitar','boots','hat']]);
paint();
