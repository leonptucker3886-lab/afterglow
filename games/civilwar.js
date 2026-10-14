/* Civil War — 117,649 ways, cascading volleys, uncapped Link Spins multiplier. */
import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, modal, fmtFull, sleep } from '../../core/ag.js';
import {countWin, banner, makeSpinner, installRedHook, RED, symMap} from './v2present.js';
import { ART, DEFS } from './art-civilwar.js';
import { createGame, SYMBOLS, META } from './engine/v2/civilwar.js';
const SYM = symMap(SYMBOLS);

boot({ nav: 'games' });
installRedHook();

document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs>${
  Object.entries(ART).map(([k, v]) => `<symbol id="cww-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')
}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#cww-${k}"/></svg>`;

const game = createGame();
const gridEl = $('#grid'), stage = $('#stage');
const winbox = $('#winbox'), winamt = $('#winamt'), multEl = $('#mult');
const linkbar = $('#linkbar'), waysEl = $('#ways');
const msg = m => { $('#msg').textContent = m || ''; };

gameHeader($('#panel'), { title: META.name, rules:
  `<p>6 reels, 2–7 rows each — ways to win multiply up to <b>117,649</b>. Wins pay left to right on adjacent reels, then cascade: winners fall away and new symbols drop in.</p>
  <p><b>4+ battle-standard Lines</b> trigger 12 Link Spins. Every cascade adds <b>+1 to the multiplier</b> and it <b>never resets</b> — it carries across the whole round.</p>
  <div id="cwwpay"></div>
  <p>High volatility. Theoretical RTP about 96% (1M-spin simulation).</p>` });

const bet = BetControl($('#betslot'), { game: 'civil-war', min: 100, label: 'Total bet', onChange: () => {} });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:civil-war:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:civil-war:turbo', turboEl.checked ? '1' : '0'); };
let autoLeft = 0, autoN = 10, busy = false;
$('#aseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy || autoLeft) return; sfx('tap'); autoN = +b.dataset.n; $$('#aseg button').forEach(x => x.classList.toggle('on', x === b)); };

const paint = makeSpinner({ spinBtn: $('#spin'), autoBtn: $('#auto'), segBtns: $$('#aseg button'), isBusy: () => busy, getAuto: () => autoLeft, setAuto: n => { autoLeft = n; } });

function payTableHTML() {
  const rows = Object.entries(SYM).filter(([id, m]) => m.pays && !m.scatter).map(([id, m]) => {
    const pays = ['6', '5', '4', '3', '2'].filter(n => m.pays[n]).map(n => `<i>${n}</i>${m.pays[n]}×`).join('<br>');
    return `<div class="pr">${icon(id)}<div class="pv">${pays}${m.wild ? '<br><span style="color:var(--acc)">WILD</span>' : ''}</div></div>`;
  }).join('');
  return `<p class="faint" style="font-size:12px;margin:0">Ways pays are × total bet, normalized to 117,649 ways.</p><div class="s2-ptable">${rows}
  <div class="pr wide">${icon('standard')}<div class="pv txt"><b style="color:#ff9ad7">BATTLE STANDARD LINE</b> — 4+ anywhere trigger 12 Link Spins with an uncapped growing multiplier.</div></div></div>`;
}
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTableHTML()}`); };

function setMult(m) {
  if (m > 1) { multEl.textContent = '×' + m; multEl.classList.add('on'); }
  else multEl.classList.remove('on');
}

/* Variable-height grid. Rebuilds columns only when row counts change. */
let cols = [], colRows = [];
function ensureGrid(rows) {
  if (rows.join() === colRows.join()) return;
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = 'repeat(6,1fr)';
  cols = []; colRows = rows.slice();
  rows.forEach(n => {
    const col = h('<div class="s2-col"></div>');
    const cells = [];
    for (let i = 0; i < n; i++) { const c = h('<div class="s2-cell"><div class="fill"></div></div>'); col.appendChild(c); cells.push(c); }
    gridEl.appendChild(col); cols.push(cells);
  });
}
function setCell(r, c, id, anim) {
  const cell = cols[r][c], fill = cell.firstChild;
  fill.innerHTML = icon(id);
  cell.className = 's2-cell' + (anim ? ' ' + anim : '');
}
function clearMarks() {
  for (const col of cols) for (const cell of col) cell.classList.remove('win', 'dim', 'lock', 'new', 'drop', 'pop');
}
function markWinCells(cells) {
  const keep = new Set(cells.map(k => k[0] + ',' + k[1]));
  for (let r = 0; r < cols.length; r++) for (let c = 0; c < cols[r].length; c++) {
    const cell = cols[r][c];
    if (keep.has(r + ',' + c)) cell.classList.add('win'); else cell.classList.add('dim');
  }
}

const waysOf = rows => rows.reduce((a, b) => a * b, 1);

async function playSteps(steps, label, keepWays, fallback) {
  const turbo = turboEl.checked;
  let won = 0;
  if (!steps.length) {
    if (fallback && fallback.grid) {
      ensureGrid(fallback.rows);
      clearMarks();
      fallback.grid.forEach((col, r) => col.forEach((id, c) => setCell(r, c, id)));
      waysEl.textContent = waysOf(fallback.rows).toLocaleString();
      setMult(0);
      if (!RED()) await sleep(turbo ? 120 : 260);
    }
    return 0;
  }
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    ensureGrid(st.rows);
    if (!keepWays) waysEl.textContent = waysOf(st.rows).toLocaleString();
    clearMarks();
    if (i === 0) {
      st.grid.forEach((col, r) => col.forEach((id, c) => setCell(r, c, id)));
      if (!RED()) await sleep(turbo ? 120 : 260);
    } else {
      const prev = steps[i - 1].grid;
      st.grid.forEach((col, r) => col.forEach((id, c) => setCell(r, c, id, id !== (prev[r] || [])[c] ? 'drop' : null)));
      if (!RED()) await sleep(turbo ? 140 : 320);
    }
    setMult(st.mult);
    if (st.wins.length) {
      const cells = [];
      for (const w of st.wins) { won += w.coins; for (const cell of w.cells) cells.push(cell); }
      markWinCells(cells);
      sfx('win'); buzz(12);
      const best = st.wins.slice().sort((a, b) => b.coins - a.coins)[0];
      $('#winmsg').textContent = `${label}${best.length}-reel ${SYM[best.symbol].name} · ${st.wins.reduce((a, w) => a + w.ways, 0).toLocaleString()} ways${st.mult > 1 ? ` · ×${st.mult}` : ''}`;
      await countWin(winbox, winamt, $('#winmsg').textContent, won, turbo ? 200 : 450);
      if (!RED()) await sleep(turbo ? 200 : 550);
    }
  }
  return won;
}

async function spinOnce() {
  const stake = bet.value;
  const r = await startRound('civil-war', stake);
  if (!r) { msg('Not enough Glow'); return 'broke'; }
  busy = true; paint(); msg('');
  winamt.textContent = '0'; winbox.classList.remove('on'); setMult(0);
  sfx('bet');
  const res = game.spin(stake);
  let total = await playSteps(res.steps, '', false, { grid: res.initialGrid, rows: res.rows });
  if (res.freeSpins) {
    const lk = res.freeSpins;
    sfx('reveal'); buzz(35);
    await banner(stage, { kicker: 'Link Spins', title: `${lk.awarded} LINK SPINS`, sub: 'Multiplier grows every cascade — no cap, no reset', ms: 2000 });
    linkbar.classList.add('on');
    let lkWon = 0;
    for (let i = 0; i < lk.spins.length; i++) {
      const sp = lk.spins[i];
      $('#fsleft').textContent = lk.spins.length - i;
      $('#fswon').textContent = fmtFull(lkWon);
      const rows = sp.steps.length ? sp.steps[0].rows : null;
      if (rows) waysEl.textContent = waysOf(rows).toLocaleString();
      const sw = await playSteps(sp.steps, `Link ${i + 1} · `, true, sp.grid ? { grid: sp.grid, rows: sp.grid.map(col => col.length) } : null);
      lkWon += sw; total += sw;
      const lastMult = sp.steps.length ? sp.steps[sp.steps.length - 1].mult : 1;
      $('#fslock').textContent = '×' + lastMult;
      if (sp.retrigger) { msg('+5 Link Spins — the line holds!'); sfx('reveal'); }
    }
    linkbar.classList.remove('on');
    await countWin(winbox, winamt, `Link Spins won ${fmtFull(lkWon)}`, total, 900);
  } else {
    await countWin(winbox, winamt, total > 0 ? `Won ${fmtFull(total)}` : 'No volley lands — fire again', total, 400);
  }
  const mult = stake ? total / stake : 0;
  const settled = r.settle(Math.floor(total), { detail: 'civil-war-ways' });
  if (res.freeSpins || mult >= 20) { autoLeft = 0; msg(res.freeSpins ? 'Link Spins complete.' : 'Big win — autoplay stopped.'); }
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
ensureGrid([4, 5, 4, 5, 4, 5]);
paint();
