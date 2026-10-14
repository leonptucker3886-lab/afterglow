/* Dragon's Hoard — hold & win Hoard Link with tiered coins. */
import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, modal, fmtFull, sleep } from '../../core/ag.js';
import {buildGrid, reelStops, countWin, banner, makeSpinner, installRedHook, RED, symMap} from './v2present.js';
import { ART, DEFS } from './art-dragon.js';
import { createGame, SYMBOLS, META } from './engine/v2/dragon.js';
const SYM = symMap(SYMBOLS);

boot({ nav: 'games' });
installRedHook();

document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs>${
  Object.entries(ART).map(([k, v]) => `<symbol id="drh-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')
}</svg>`));
const icon = k => k === 'blank'
  ? `<svg viewBox="0 0 100 100" aria-hidden="true"></svg>`
  : `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#drh-${k}"/></svg>`;
const coinIcon = kind => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#drh-${kind}"/></svg>`;

const game = createGame();
const gridEl = $('#grid'), stage = $('#stage');
const gridApi = buildGrid(gridEl, 5, 3, icon);
const winbox = $('#winbox'), winamt = $('#winamt');
const linkbar = $('#linkbar');
const msg = m => { $('#msg').textContent = m || ''; };

gameHeader($('#panel'), { title: META.name, rules:
  `<p>30 lines on the base game. Land <b>6+ coins</b> anywhere to enter the <b>Hoard Link</b>: a coins-only grid where coins lock and you get <b>3 respins</b> — every new coin resets the count. Coins carry values; special coins are <b>MINI 20×, MINOR 50×, MAJOR 150×</b>. Fill all 15 for the <b>GRAND 1000×</b>.</p>
  <div id="drhpay"></div>
  <p>Theoretical RTP about 96% (1M-spin simulation).</p>` });

const bet = BetControl($('#betslot'), { game: 'dragons-hoard', min: 30, label: 'Total bet', onChange: () => {} });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:dragons-hoard:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:dragons-hoard:turbo', turboEl.checked ? '1' : '0'); };
let autoLeft = 0, autoN = 10, busy = false;
$('#aseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy || autoLeft) return; sfx('tap'); autoN = +b.dataset.n; $$('#aseg button').forEach(x => x.classList.toggle('on', x === b)); };

const paint = makeSpinner({ spinBtn: $('#spin'), autoBtn: $('#auto'), segBtns: $$('#aseg button'), isBusy: () => busy, getAuto: () => autoLeft, setAuto: n => { autoLeft = n; } });

function payTableHTML() {
  const rows = Object.entries(SYM).filter(([id, m]) => m.pays && id !== 'coin').map(([id, m]) =>
    `<div class="pr">${icon(id)}<div class="pv">${['5', '4', '3'].filter(n => m.pays[n]).map(n => `<i>${n}×</i>${m.pays[n]}×`).join('<br>')}</div></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">Line pays × line bet (total ÷ 30).</p><div class="s2-ptable">${rows}
  <div class="pr wide">${coinIcon('coin')}<div class="pv txt"><b style="color:var(--acc)">COIN</b> — 6+ trigger the Hoard Link. Values 1×–20×.</div></div>
  <div class="pr">${coinIcon('mini')}<div class="pv">MINI<br>20×</div></div>
  <div class="pr">${coinIcon('minor')}<div class="pv">MINOR<br>50×</div></div>
  <div class="pr">${coinIcon('major')}<div class="pv">MAJOR<br>150×</div></div>
  <div class="pr"><div class="pv" style="font-size:15px">15 coins<br><b style="color:var(--acc)">GRAND 1000×</b></div></div></div>`;
}
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTableHTML()}`); };

async function playHoard(hoard, stake) {
  const turbo = turboEl.checked;
  linkbar.classList.add('on');
  // coins-only grid: start empty, coins lock in as respins resolve
  gridApi.clearMarks();
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) gridApi.set(r, c, 'blank');
  await reelStops([...gridEl.children], [0, 1, 2, 3, 4], { turbo, stagger: 90, onStop: () => sfx('stop') });
  let won = 0;
  for (let i = 0; i < hoard.respins.length; i++) {
    const g = hoard.respins[i];
    $('#fsleft').textContent = g.respinsLeft;
    $('#fswon').textContent = fmtFull(won);
    const fresh = new Set(g.newCoins.map(nc => nc.pos[0] + ',' + nc.pos[1]));
    for (const L of g.locked) {
      const [lr, lc] = L.pos;
      const isNew = fresh.has(lr + ',' + lc);
      gridApi.set(lr, lc, L.kind, RED() ? null : (isNew ? 'pop' : null));
      gridApi.mark(lr, lc, 'coinlock');
    }
    $('#fslock').textContent = g.locked.length;
    if (g.newCoins.length) { sfx('reveal'); buzz(15); }
    if (!RED()) await sleep(turbo ? 220 : 520);
  }
  won = hoard.totalWin;
  $('#fswon').textContent = fmtFull(won);
  linkbar.classList.remove('on');
  if (hoard.grand) {
    sfx('reveal'); buzz(40);
    await banner(stage, { kicker: 'GRAND', title: '1000× GRAND', sub: 'The dragon yields the whole hoard', ms: 2200 });
  }
  await countWin(winbox, winamt, hoard.grand ? 'GRAND — full hoard!' : `Hoard Link won ${fmtFull(won)}`, won, 900);
  return won;
}

async function spinOnce() {
  const stake = bet.value;
  const r = await startRound('dragons-hoard', stake);
  if (!r) { msg('Not enough Glow'); return 'broke'; }
  busy = true; paint(); msg('');
  winamt.textContent = '0'; winbox.classList.remove('on');
  sfx('bet');
  const res = game.spin(stake);
  let total = 0;
  if (res.hoard) {
    total = await playHoard(res.hoard, stake);
  } else {
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
      if (!RED()) await sleep(turboEl.checked ? 150 : 500);
    } else {
      $('#winmsg').textContent = res.coinCount >= 4 ? `${res.coinCount} coins — two short of the Hoard` : 'No lines — spin again';
      await countWin(winbox, winamt, $('#winmsg').textContent, 0, 250);
    }
  }
  const mult = stake ? total / stake : 0;
  const settled = r.settle(Math.floor(total), { detail: 'dragon-hoard' });
  if (res.hoard || mult >= 20) { autoLeft = 0; msg(res.hoard ? 'Hoard Link complete.' : 'Big win — autoplay stopped.'); }
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
gridApi.paintGrid([['dragon','egg','chest'],['sword','gemR','gemB'],['gemG','dragon','egg'],['chest','sword','gemR'],['gemB','gemG','dragon']]);
paint();
