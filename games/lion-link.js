/* Lion-Link — 243 ways, expanding Pride Wilds, DATABASE LOCK hold-and-respin.
 * Rebuilt on the shared engine: wallet (core/store.js), rounds (core/round.js)
 * and fairness (core/fair.js) run through startRound() in core/ag.js, the same
 * way pharaohs-gold does. Replaces the standalone games/lion-link/ page. */
import { boot, $, $$, BetControl, gameHeader, startRound, sfx, buzz, modal, fmtFull, sleep } from '../core/ag.js';
import { buildGrid, reelStops, countWin, banner, makeSpinner, installRedHook, RED, symMap } from './v2present.js';
import { createGame, SYMBOLS, META, SCALE, JACKPOTS, GRAND } from './engine/v2/lion.js';
const SYM = symMap(SYMBOLS);
const ID = 'lion-link';

boot({ nav: 'games' });
installRedHook();

const EMOJI = { lion: '🦁', lock: '🔐', sun: '☀️', lioness: '🐆', elephant: '🐘', zebra: '🦓', giraffe: '🦒', A: 'A', K: 'K', Q: 'Q', J: 'J' };
const icon = k => `<span class="ll-sym">${EMOJI[k] || k}</span>`;

const game = createGame();
const gridEl = $('#grid'), stage = $('#stage');
const gridApi = buildGrid(gridEl, 5, 3, icon);
const winbox = $('#winbox'), winamt = $('#winamt'), linkbar = $('#linkbar');
const msg = m => { $('#msg').textContent = m || ''; };

gameHeader($('#panel'), { title: META.name, rules:
  `<p>243 ways: matching symbols on adjacent reels from the left pay, in any row.</p>
  <p><b>🦁 Pride Wild</b> lands on reels 2–4 and <b>expands to fill its reel</b>. It stands in for everything except 🔐 and ☀️.</p>
  <p><b>3+ 🔐 DATABASE LOCK:</b> every 🔐 and ☀️ holds and you get 3 respins. Each new one holds and resets respins to 3. 🔐 pays 2× bet, ☀️ pays its value.</p>
  <p><b>Pride Column:</b> hold a full reel and its coins double. Jackpot coins MINI ${JACKPOTS.MINI}×, MINOR ${JACKPOTS.MINOR}×, MAJOR ${JACKPOTS.MAJOR}×. Fill all 15 for the <b>GRAND ${GRAND}×</b>.</p>
  <p>Theoretical RTP about 95% (600k-spin simulation).</p>` });

const bet = BetControl($('#betslot'), { game: ID, min: 25, label: 'Total bet', onChange: () => {} });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:' + ID + ':turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:' + ID + ':turbo', turboEl.checked ? '1' : '0'); };
let autoLeft = 0, autoN = 10, busy = false;
$('#aseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy || autoLeft) return; sfx('tap'); autoN = +b.dataset.n; $$('#aseg button').forEach(x => x.classList.toggle('on', x === b)); };
const paint = makeSpinner({ spinBtn: $('#spin'), autoBtn: $('#auto'), segBtns: $$('#aseg button'), isBusy: () => busy, getAuto: () => autoLeft, setAuto: n => { autoLeft = n; } });

$('#ptbtn').onclick = () => {
  sfx('tap');
  const rows = SYMBOLS.filter(s => s.pays).map(s => `<div class="pr">${icon(s.id)}<div class="pv">${['5', '4', '3'].map(n => `<i>${n}×</i>${+(s.pays[n] * SCALE.pay / 243).toFixed(3)}×`).join('<br>')}</div></div>`).join('');
  modal(`<h2>Paytable</h2><p class="faint" style="font-size:12px;margin:0">Pays × total bet, per way.</p><div class="s2-ptable">${rows}</div>`);
};

async function showBase(res) {
  const turbo = turboEl.checked;
  gridApi.clearMarks(); gridApi.paintGrid(res.grid);
  await reelStops([...gridEl.children], [0, 1, 2, 3, 4], { turbo, onStop: () => sfx('stop') });
  for (const r of res.expandedReels) for (let c = 0; c < 3; c++) { gridApi.set(r, c, 'lion', RED() ? null : 'pop'); gridApi.mark(r, c, 'win'); }
  if (!RED() && res.expandedReels.length) { sfx('reveal'); await sleep(turbo ? 180 : 420); }
  let won = 0;
  if (res.lineWins.length) {
    const cells = [];
    for (const w of res.lineWins) { won += w.coins; for (const c of w.cells) { gridApi.mark(c[0], c[1], 'win'); cells.push(c); } }
    gridApi.dimExcept(cells); sfx('win'); buzz(12);
    const best = res.lineWins.slice().sort((a, b) => b.coins - a.coins)[0];
    $('#winmsg').textContent = `${best.count}× ${SYM[best.symbol].name} · ${best.ways} way${best.ways > 1 ? 's' : ''}${res.lineWins.length > 1 ? ` +${res.lineWins.length - 1} more` : ''}`;
    await countWin(winbox, winamt, $('#winmsg').textContent, won, turbo ? 150 : 400);
  }
  return won;
}

async function showBonus(b) {
  const turbo = turboEl.checked;
  sfx('reveal'); buzz(30);
  await banner(stage, { kicker: 'Database Lock', title: 'DATABASE LOCK', sub: '3 respins · every new 🔐 or ☀️ resets them', ms: 1800 });
  linkbar.classList.add('on'); gridApi.clearMarks();
  let n = 0;
  const hold = (r, c, hh) => { gridApi.set(r, c, hh.sym, RED() ? null : 'pop'); gridApi.mark(r, c, 'lock'); n++; };
  for (const k in b.start) { const [r, c] = k.split(',').map(Number); hold(r, c, b.start[k]); }
  $('#fslock').textContent = n; $('#fsleft').textContent = 3;
  for (const st of b.steps) {
    await sleep(turbo ? 250 : 650);
    for (const [r, c, hh] of st.added) { hold(r, c, hh); sfx('stop'); }
    $('#fslock').textContent = n; $('#fsleft').textContent = st.left;
  }
  for (const r of b.prideReels) for (let c = 0; c < 3; c++) gridApi.mark(r, c, 'win');
  if (b.prideReels.length) { msg(`Pride Column! Coins on ${b.prideReels.length} reel${b.prideReels.length > 1 ? 's' : ''} doubled.`); await sleep(turbo ? 300 : 800); }
  if (b.grand) await banner(stage, { kicker: 'Full screen', title: `GRAND ${GRAND}×`, sub: 'All 15 cells held', ms: 2000 });
  $('#fswon').textContent = fmtFull(Math.floor(b.totalWin));
  linkbar.classList.remove('on');
  return b.totalWin;
}

async function spinOnce() {
  if (busy) return 'busy';
  busy = true; paint();
  const stake = bet.value;
  let r = null, res = null, settled;
  try {
    r = await startRound(ID, stake);
    if (!r) { msg('Not enough Glow'); return 'broke'; }
    msg('');
    winamt.textContent = '0'; winbox.classList.remove('on');
    sfx('bet');
    res = game.spin(stake);
    try {
      await showBase(res);
      if (res.bonus) {
        await showBonus(res.bonus);
        await countWin(winbox, winamt, `Database Lock won ${fmtFull(Math.floor(res.bonus.totalWin))}`, res.totalWin, 900);
      } else if (!res.lineWins.length) {
        await countWin(winbox, winamt, 'No ways \u2014 the pride is resting', 0, 300);
      }
    } catch (e) { console.error('[lion-link] spin failed', e); }
    const mult = stake ? res.totalWin / stake : 0;
    settled = r.settle(res.totalWin, { detail: 'lion-link-database-lock' });
    r = null;
    if (res.bonus || mult >= 20) { autoLeft = 0; msg(res.bonus ? 'Database Lock complete.' : 'Big win \u2014 autoplay stopped.'); }
    return settled;
  } catch (e) {
    console.error('[lion-link] spin failed', e);
    autoLeft = 0;
    if (r && res) { try { r.settle(res.totalWin, { detail: 'lion-link-database-lock' }); } catch (e2) { console.error('[lion-link] settle failed', e2); } }
    msg('Something went wrong \u2014 tap SPIN to try again.');
    return 'error';
  } finally {
    busy = false; paint();
  }
}

async function loop() {
  while (autoLeft > 0) {
    const s = await spinOnce();
    if (s === 'broke' || s === 'error') { autoLeft = 0; break; }
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
gridApi.paintGrid([['lioness', 'zebra', 'A'], ['elephant', 'K', 'giraffe'], ['Q', 'lioness', 'J'], ['zebra', 'A', 'elephant'], ['giraffe', 'Q', 'K']]);
paint();
