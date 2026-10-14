/* Classics cabinet — Lucky 7s, Fruit Party, Diamond Star, Pirates Gold.
 * Shared signature: post-win Gamble (red/black double-or-nothing).
 */
import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, modal, fmtFull, sleep, state, credit, debit } from '../../core/ag.js';
import {buildGrid, reelStops, countWin, banner, makeSpinner, gambleModal, installRedHook, RED, symMap} from './v2present.js';
import { SEVEN as SEVENART, FRUIT as FRUITART, DIAMOND as DIAMONDART, PIRATE as PIRATEART, DEFS as CLDEFS } from './art-classics.js';
import { createGame as mkLucky, SYMBOLS as S_LUCKY, META as M_LUCKY } from './engine/v2/lucky7s.js';
import { createGame as mkFruit, SYMBOLS as S_FRUIT, META as M_FRUIT } from './engine/v2/fruitparty.js';
import { createGame as mkDiamond, SYMBOLS as S_DIAMOND, META as M_DIAMOND } from './engine/v2/diamondstar.js';
import { createGame as mkPirate, SYMBOLS as S_PIRATE, META as M_PIRATE } from './engine/v2/pirates.js';

boot({ nav: 'games' });
installRedHook();

const GAMES = {
  lucky:   { mk: mkLucky,   SYM: S_LUCKY,   META: M_LUCKY,   art: SEVENART,   title: 'LUCKY <span class="em">7s</span>',  payNote: '3×3 · 5 lines' },
  fruit:   { mk: mkFruit,   SYM: S_FRUIT,   META: M_FRUIT,   art: FRUITART,   title: 'FRUIT <span class="em">PARTY</span>', payNote: '5×3 · 20 lines · star wild' },
  diamond: { mk: mkDiamond, SYM: S_DIAMOND, META: M_DIAMOND, art: DIAMONDART, title: 'DIAMOND <span class="em">STAR</span>', payNote: '5×3 · 20 lines · diamond wild ×2' },
  pirate:  { mk: mkPirate,  SYM: S_PIRATE,  META: M_PIRATE,  art: PIRATEART,  title: 'PIRATES <span class="em">GOLD</span>', payNote: '5×3 · 20 lines · parrot wild' },
};
const ORDER = ['lucky', 'fruit', 'diamond', 'pirate'];

// sprite defs (shared)
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${CLDEFS}</defs>${
  Object.entries({ ...SEVENART, ...FRUITART, ...DIAMONDART, ...PIRATEART })
    .map(([k, v]) => `<symbol id="clc-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')
}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#clc-${k}"/></svg>`;

let cur = 'lucky';
const SYMOF = id => symMap(GAMES[id].SYM);
let game = GAMES[cur].mk();
let gridApi = null;

gameHeader($('#panel'), { title: 'Classic Slots', rules: `<p>Four retro cabinets. Wins pay left to right on fixed paylines. After any win you may <b>Gamble</b> it: red or black, double or nothing, up to 5 steps — or collect.</p><div id="clrules"></div>` });

const bet = BetControl($('#betslot'), { game: 'classics', min: 10, label: 'Total bet', onChange: () => {} });
const turboEl = $('#turbo');
turboEl.checked = localStorage.getItem('afterglow:classics:turbo') === '1';
turboEl.onchange = () => { sfx('tap'); localStorage.setItem('afterglow:classics:turbo', turboEl.checked ? '1' : '0'); };
let autoLeft = 0, busy = false, autoN = 10;

const gridEl = $('#grid'), stage = $('#stage');
const winbox = $('#winbox'), winamt = $('#winamt');
const msg = m => { $('#msg').textContent = m || ''; };

function dims() { return cur === 'lucky' ? [3, 3] : [5, 3]; }

function selectGame(id) {
  cur = id; game = GAMES[id].mk();
  const [W, H] = dims();
  gridApi = buildGrid(gridEl, W, H, icon);
  // idle backdrop: blank cells
  for (let r = 0; r < W; r++) for (let c = 0; c < H; c++) gridApi.set(r, c, 'seven', null);
  $('#gtitle').innerHTML = GAMES[id].title;
  $('#winmsg').textContent = GAMES[id].payNote;
  winamt.textContent = '0'; winbox.classList.remove('on');
  $('#gamblebar').classList.remove('on');
  $$('#gseg button').forEach(b => b.classList.toggle('on', b.dataset.g === id));
  msg('');
}
{
  const seg = $('#gseg');
  ORDER.forEach(id => {
    const b = h(`<button data-g="${id}">${GAMES[id].title.replace(/<[^>]*>/g, ' ')}</button>`);
    b.onclick = () => { if (!busy && !autoLeft) { sfx('tap'); selectGame(id); } };
    seg.appendChild(b);
  });
}
selectGame('lucky');

$('#aseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy || autoLeft) return; sfx('tap'); autoN = +b.dataset.n; $$('#aseg button').forEach(x => x.classList.toggle('on', x === b)); };

const paint = makeSpinner({
  spinBtn: $('#spin'), autoBtn: $('#auto'), segBtns: [...$$('#aseg button'), ...$$('#gseg button')],
  isBusy: () => busy, getAuto: () => autoLeft, setAuto: n => { autoLeft = n; },
});

function payTableHTML() {
  const G = GAMES[cur];
  const rows = Object.entries(symMap(G.SYM)).map(([id, m]) => {
    const p = m.pays || {};
    const cells = ['5', '4', '3'].filter(n => p[n]).map(n => `<i>${n}×</i>${p[n]}×`).join('<br>');
    const extra = m.wild ? `<br><span style="color:var(--s2-gold)">WILD${m.mult ? ' ×' + m.mult : ''}</span>` : '';
    return `<div class="pr">${icon(id)}<div class="pv">${cells}${extra}</div></div>`;
  }).join('');
  return `<p class="faint" style="font-size:12px;margin:0">Line pays are multiples of the line bet (total bet ÷ ${cur === 'lucky' ? 5 : 20}).</p><div class="s2-ptable">${rows}
  <div class="pr wide"><div class="pv txt"><b style="color:var(--s2-gold)">GAMBLE</b> — after any win: red or black doubles it, up to 5 steps, capped at 1000× your bet. Fair 50/50.</div></div></div>`;
}
$('#ptbtn').onclick = () => { sfx('tap'); modal(`<h2>Paytable</h2>${payTableHTML()}`); };

async function showWins(res) {
  gridApi.clearMarks();
  if (!res.lineWins.length) return;
  const allCells = [];
  for (const w of res.lineWins) for (const c of w.cells) { gridApi.mark(c[0], c[1], 'win'); allCells.push(c); }
  gridApi.dimExcept(allCells);
  sfx('win'); buzz(15);
  if (!RED()) await sleep(650);
}

async function spinOnce() {
  const stake = bet.value;
  const r = await startRound('classics', stake);
  if (!r) { msg('Not enough Glow'); return 'broke'; }
  busy = true; paint(); msg('');
  $('#gamblebar').classList.remove('on');
  winamt.textContent = '0'; winbox.classList.remove('on');
  sfx('bet');
  const res = game.spin(stake);
  // paint final grid, then a cheap stagger
  gridApi.clearMarks();
  gridApi.paintGrid(res.grid);
  await reelStops([...gridEl.children], [...Array(res.grid.length).keys()], { turbo: turboEl.checked, onStop: () => sfx('stop') });
  await showWins(res);
  const won = Math.floor(res.totalWin);
  let msg2 = '';
  if (res.lineWins.length) {
    const best = res.lineWins.slice().sort((a, b) => b.coins - a.coins)[0];
    msg2 = `${best.count}× ${SYMOF(cur)[best.symbol].name}${res.lineWins.length > 1 ? ` +${res.lineWins.length - 1} more` : ''}`;
  }
  await countWin(winbox, winamt, msg2, won);
  const settled = r.settle(won, { detail: cur });
  // gamble offer
  let finalWon = won;
  if (won > 0 && !autoLeft) {
    $('#gwamt').textContent = fmtFull(won);
    $('#gamblebar').classList.add('on');
    msg('Gamble your win — or spin again to keep it.');
  }
  busy = false; paint();
  return settled;
}

$('#gamblebtn').onclick = async () => {
  if (busy) return;
  const won = parseInt($('#gwamt').textContent.replace(/[^0-9]/g, ''), 10) || 0;
  if (!won) return;
  $('#gamblebar').classList.remove('on');
  busy = true; paint();
  const res = await gambleModal(won, { maxSteps: 5, capMult: 1000, bet: bet.value });
  if (res.lost) {
    debit(won, 'gamble');
    await countWin(winbox, winamt, 'Gamble lost', 0);
    msg('The house takes it this time.');
  } else {
    const gain = res.collected - won;
    if (gain > 0) credit(gain, 'gamble');
    await countWin(winbox, winamt, res.steps ? `Gamble ×${res.steps} — collected` : 'Collected', res.collected);
    msg(res.steps ? `Doubled ${res.steps}× — nice nerve.` : '');
  }
  sfx(res.lost ? 'lose' : 'win');
  busy = false; paint();
};

async function loop() {
  while (autoLeft > 0) {
    const s = await spinOnce();
    if (s === 'broke') { autoLeft = 0; break; }
    autoLeft--;
    paint();
    if (autoLeft <= 0) break;
    await sleep(500);
  }
  autoLeft = 0; paint();
}
$('#spin').onclick = () => { sfx('tap'); if (autoLeft) { autoLeft = 0; paint(); return; } if (!busy) return spinOnce(); };
$('#auto').onclick = () => { sfx('tap'); if (autoLeft) { autoLeft = 0; paint(); } else if (!busy) { autoLeft = autoN; paint(); loop(); } };
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.target.closest?.('input,textarea,select') && !$('.scrim')) { e.preventDefault(); $('#spin').click(); }
});
paint();
