/* Nebula Cascades — 5x4 cluster pays, cascade multiplier ladder, Free Fall Link. */
import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, modal, fmtFull, sleep } from '../../core/ag.js';
import {buildGrid, countWin, banner, makeSpinner, installRedHook, RED, symMap} from './v2present.js';
import { ART, DEFS } from './art-nebula.js';
import { createGame, SYMBOLS, META } from './engine/v2/nebula.js';
const SYM = symMap(SYMBOLS);

boot({ nav: 'games' });
installRedHook();

document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs>${
  Object.entries(ART).map(([k, v]) => `<symbol id="nbc-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')
}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#nbc-${k}"/></svg>`;

const game = createGame();
const gridEl = $('#grid'), stage = $('#stage');
const gridApi = buildGrid(gridEl, 5, 4, icon);
const winbox = $('#winbox'), winamt = $('#winamt'), multEl = $('#mult');
const linkbar = $('#linkbar');
const msg = m => { $('#msg').textContent = m || ''; };

gameHeader($('#panel'), { title: META.name, rules:
  `<p>Cluster pays on a 5×4 grid: <b>8 or more touching symbols</b> (up/down/left/right) win. Winning clusters vanish, new symbols drop in, and the cascade multiplier climbs <b>×1 → ×2 → ×3 → ×5</b> within the spin.</p>
  <p><b>4+ black-hole Lines</b> trigger the Free Fall Link: 10 free spins where the multiplier <b>never resets</b> and starts at ×2.</p>
  <div id="nbpay"></div>
  <p>Theoretical RTP about 96% (1M-spin simulation).</p>` });

const bet = BetControl($('#betslot'), { game: 'slots', min: 20, label: 'Total bet', onChange: () => {} });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:slots:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:slots:turbo', turboEl.checked ? '1' : '0'); };
let autoLeft = 0, autoN = 10, busy = false;
$('#aseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy || autoLeft) return; sfx('tap'); autoN = +b.dataset.n; $$('#aseg button').forEach(x => x.classList.toggle('on', x === b)); };

const paint = makeSpinner({ spinBtn: $('#spin'), autoBtn: $('#auto'), segBtns: $$('#aseg button'), isBusy: () => busy, getAuto: () => autoLeft, setAuto: n => { autoLeft = n; } });

function payTableHTML() {
  const rows = Object.entries(SYM).filter(([id]) => id !== 'comet' && id !== 'blackhole').map(([id, m]) =>
    `<div class="pr">${icon(id)}<div class="pv">${['20', '15', '12', '10', '8'].filter(n => m.pays && m.pays[n]).map(n => `<i>${n}+</i>${m.pays[n]}×`).join('<br>')}</div></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">Cluster pays are multiples of the total bet. 8+ touching symbols.</p><div class="s2-ptable">${rows}
  <div class="pr wide">${icon('comet')}<div class="pv txt"><b style="color:var(--acc)">COMET WILD</b> — substitutes in clusters, lands on all reels.</div></div>
  <div class="pr wide">${icon('blackhole')}<div class="pv txt"><b style="color:var(--acc2)">BLACK HOLE LINE</b> — 4+ anywhere trigger the Free Fall Link (10 spins, persistent ladder from ×2).</div></div></div>`;
}
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTableHTML()}`); };

function setMult(m) {
  if (m > 1) { multEl.textContent = '×' + m; multEl.classList.add('on'); }
  else multEl.classList.remove('on');
}

/* Play one cascade sequence (base or one free spin). Returns total won. */
async function playSteps(steps, label, fallbackGrid) {
  let won = 0;
  const turbo = turboEl.checked;
  if (!steps.length && fallbackGrid) {
    gridApi.clearMarks();
    gridApi.paintGrid(fallbackGrid);
    setMult(0);
    if (!RED()) await sleep(turbo ? 120 : 260);
    return 0;
  }
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    // paint grid; changed cells drop
    gridApi.clearMarks();
    if (i === 0) {
      gridApi.paintGrid(st.grid);
      if (!RED()) await sleep(turbo ? 120 : 260);
    } else {
      const prev = steps[i - 1].grid;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
        gridApi.set(r, c, st.grid[r][c], st.grid[r][c] !== prev[r][c] ? 'drop' : null);
      }
      if (!RED()) await sleep(turbo ? 140 : 320);
    }
    setMult(st.mult);
    if (st.clusters.length) {
      const cells = [];
      for (const cl of st.clusters) for (const cell of cl.cells) { gridApi.mark(cell[0], cell[1], 'win'); cells.push(cell); }
      gridApi.dimExcept(cells);
      won += st.stepWin;
      $('#winmsg').textContent = `${label}${st.clusters.length} cluster${st.clusters.length > 1 ? 's' : ''} ×${st.mult}`;
      await countWin(winbox, winamt, $('#winmsg').textContent, won, turbo ? 200 : 450);
      sfx('win'); buzz(12);
      if (!RED()) await sleep(turbo ? 200 : 550);
    }
  }
  return won;
}

async function spinOnce() {
  const stake = bet.value;
  const r = await startRound('slots', stake);
  if (!r) { msg('Not enough Glow'); return 'broke'; }
  busy = true; paint(); msg('');
  winamt.textContent = '0'; winbox.classList.remove('on'); setMult(0);
  sfx('bet');
  const res = game.spin(stake);
  let total = await playSteps(res.steps, '', res.initialGrid);
  // Free Fall Link
  if (res.freeFall) {
    const ff = res.freeFall;
    sfx('reveal'); buzz(30);
    await banner(stage, { kicker: 'Free Fall Link', title: '10 FREE SPINS', sub: 'The ladder never resets — it starts at ×2', ms: 1800 });
    linkbar.classList.add('on');
    let ffWon = 0;
    for (let i = 0; i < ff.spins.length; i++) {
      $('#fsleft').textContent = ff.spins.length - i;
      $('#fswon').textContent = fmtFull(ffWon);
      const sw = await playSteps(ff.spins[i].steps, `Free spin ${i + 1} · `, ff.spins[i].initialGrid);
      ffWon += sw; total += sw;
    }
    $('#fswon').textContent = fmtFull(ff.totalWin);
    linkbar.classList.remove('on');
    await countWin(winbox, winamt, `Free Fall Link won ${fmtFull(ff.totalWin)}`, total, 900);
  } else {
    await countWin(winbox, winamt, total > 0 ? `Won ${fmtFull(total)}` : 'No clusters — spin again', total, 400);
  }
  const mult = stake ? total / stake : 0;
  const settled = r.settle(Math.floor(total), { detail: 'nebula-cascades' });
  if (res.freeFall || mult >= 20) { autoLeft = 0; msg(res.freeFall ? 'Link round complete.' : 'Big win — autoplay stopped.'); }
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
// idle backdrop
gridApi.paintGrid([['star','moon','saturn','ice'],['mars','nova','asteroid','crystal'],['moon','star','ice','saturn'],['crystal','mars','nova','moon'],['ice','asteroid','star','crystal']]);
paint();
