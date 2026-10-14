/* Pharaoh's Gold — sticky expanding scarab wilds + locking Link Spins. */
import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, modal, fmtFull, sleep } from '../../core/ag.js';
import {buildGrid, reelStops, countWin, banner, makeSpinner, installRedHook, RED, symMap} from './v2present.js';
import { ART, DEFS } from './art-pharaoh.js';
import { createGame, SYMBOLS, META } from './engine/v2/pharaoh.js';
const SYM = symMap(SYMBOLS);

boot({ nav: 'games' });
installRedHook();

document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs>${
  Object.entries(ART).map(([k, v]) => `<symbol id="phg-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')
}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#phg-${k}"/></svg>`;

const game = createGame();
const gridEl = $('#grid'), stage = $('#stage');
const gridApi = buildGrid(gridEl, 5, 3, icon);
const winbox = $('#winbox'), winamt = $('#winamt'), multEl = $('#mult');
const linkbar = $('#linkbar');
const msg = m => { $('#msg').textContent = m || ''; };

gameHeader($('#panel'), { title: META.name, rules:
  `<p>30 lines. Scarab wilds <b>expand to fill their reel</b> when they land on reels 2–4.</p>
  <p><b>3+ pyramid Lines</b> trigger 10 Link Spins: every landed wild expands <b>and locks</b> for the round, and each locked wild adds <b>+1 to the global multiplier</b>.</p>
  <div id="phgpay"></div>
  <p>Theoretical RTP about 96% (1M-spin simulation).</p>` });

const bet = BetControl($('#betslot'), { game: 'pharaohs-gold', min: 30, label: 'Total bet', onChange: () => {} });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:pharaohs-gold:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:pharaohs-gold:turbo', turboEl.checked ? '1' : '0'); };
let autoLeft = 0, autoN = 10, busy = false;
$('#aseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy || autoLeft) return; sfx('tap'); autoN = +b.dataset.n; $$('#aseg button').forEach(x => x.classList.toggle('on', x === b)); };

const paint = makeSpinner({ spinBtn: $('#spin'), autoBtn: $('#auto'), segBtns: $$('#aseg button'), isBusy: () => busy, getAuto: () => autoLeft, setAuto: n => { autoLeft = n; } });

function payTableHTML() {
  const rows = Object.entries(SYM).filter(([id, m]) => m.pays && !m.scatter).map(([id, m]) =>
    `<div class="pr">${icon(id)}<div class="pv">${['5', '4', '3'].filter(n => m.pays[n]).map(n => `<i>${n}×</i>${m.pays[n]}×`).join('<br>')}${m.wild ? '<br><span style="color:var(--s2-gold)">WILD</span>' : ''}</div></div>`).join('');
  return `<p class="faint" style="font-size:12px;margin:0">Line pays × line bet (total ÷ 30). Scarab expands on reels 2–4; locks in Link Spins.</p><div class="s2-ptable">${rows}
  <div class="pr wide">${icon('pyramid')}<div class="pv txt"><b style="color:#ff9ad7">PYRAMID LINE</b> — 3+ anywhere trigger 10 Link Spins with locking expanding wilds.</div></div></div>`;
}
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTableHTML()}`); };

function setMult(m) {
  if (m > 1) { multEl.textContent = '×' + m; multEl.classList.add('on'); }
  else multEl.classList.remove('on');
}

async function showSpin({ grid, expandedReels = [], lockedReels = [], mult = 1, lineWins = [], label = '' }) {
  const turbo = turboEl.checked;
  gridApi.clearMarks(); setMult(mult);
  gridApi.paintGrid(grid);
  await reelStops([...gridEl.children], [0, 1, 2, 3, 4], { turbo: turboEl.checked, onStop: () => sfx('stop') });
  // expansion pop
  for (const r of expandedReels) for (let c = 0; c < 3; c++) {
    gridApi.set(r, c, 'scarab', RED() ? null : 'pop');
    if (!lockedReels.includes(r)) gridApi.mark(r, c, 'win');
  }
  for (const r of lockedReels) for (let c = 0; c < 3; c++) gridApi.mark(r, c, 'lock');
  if (!RED() && expandedReels.length) { sfx('reveal'); await sleep(turbo ? 180 : 420); }
  let won = 0;
  if (lineWins.length) {
    const cells = [];
    for (const w of lineWins) { won += w.coins; for (const c of w.cells) { gridApi.mark(c[0], c[1], 'win'); cells.push(c); } }
    gridApi.dimExcept(cells);
    sfx('win'); buzz(12);
    const best = lineWins.slice().sort((a, b) => b.coins - a.coins)[0];
    $('#winmsg').textContent = `${label}${best.count}× ${SYM[best.symbol].name}${lineWins.length > 1 ? ` +${lineWins.length - 1} more` : ''}${mult > 1 ? ` · ×${mult}` : ''}`;
    await countWin(winbox, winamt, $('#winmsg').textContent, won, turbo ? 150 : 400);
    if (!RED()) await sleep(turbo ? 150 : 500);
  }
  return won;
}

async function spinOnce() {
  const stake = bet.value;
  const r = await startRound('pharaohs-gold', stake);
  if (!r) { msg('Not enough Glow'); return 'broke'; }
  busy = true; paint(); msg('');
  winamt.textContent = '0'; winbox.classList.remove('on'); setMult(0);
  sfx('bet');
  const res = game.spin(stake);
  let total = await showSpin({ ...res, lockedReels: [], label: '' });
  if (res.freeSpins) {
    const lk = res.freeSpins;
    sfx('reveal'); buzz(30);
    await banner(stage, { kicker: 'Link Spins', title: `${lk.awarded} LINK SPINS`, sub: 'Wilds lock · each one +1 multiplier', ms: 1800 });
    linkbar.classList.add('on');
    let lkWon = 0;
    const lockedSoFar = [];
    for (let i = 0; i < lk.spins.length; i++) {
      const sp = lk.spins[i];
      for (const r of sp.newLocks || []) if (!lockedSoFar.includes(r)) lockedSoFar.push(r);
      $('#fsleft').textContent = lk.spins.length - i;
      $('#fslock').textContent = lockedSoFar.length;
      $('#fswon').textContent = fmtFull(lkWon);
      const sw = await showSpin({ ...sp, lockedReels: lockedSoFar.slice(), label: `Link ${i + 1} · ` });
      lkWon += sw; total += sw;
    }
    linkbar.classList.remove('on');
    await countWin(winbox, winamt, `Link Spins won ${fmtFull(lkWon)}`, total, 900);
  } else if (!res.lineWins.length) {
    await countWin(winbox, winamt, 'No lines — the tomb keeps its secrets', 0, 300);
  }
  const mult = stake ? total / stake : 0;
  const settled = r.settle(Math.floor(total), { detail: 'pharaoh-sticky-wilds' });
  if (res.freeSpins || mult >= 20) { autoLeft = 0; msg(res.freeSpins ? 'Link round complete.' : 'Big win — autoplay stopped.'); }
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
gridApi.paintGrid([['mask','ankh','eye'],['cobra','jackal','sarcophagus'],['A','K','Q'],['J','mask','ankh'],['eye','cobra','jackal']]);
paint();
