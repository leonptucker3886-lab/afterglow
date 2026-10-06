import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, confetti, pushRecent, fmtFull, fmtX, unlock, sleep, state } from '/core/ag.js';
import { PAYTABLE, RANKS, SUITS, rankOf, suitOf, isRed, cardName, drawDeck, evaluate, hint, draw } from '/games/poker-engine.js';

boot({ nav: 'games' });
gameHeader($('#panel'), { title: 'Synth Poker', rules: `<p>Jacks or Better video poker with a single 52-card deck, freshly shuffled every hand.</p>
<ol style="padding-left:18px"><li>Place your bet and <b>Deal</b> five cards.</li><li>Tap the cards you want to <b>HOLD</b>.</li><li>Press <b>Draw</b>: every card you didn't hold is replaced from the deck. Your final hand is paid from the table.</li></ol>
<p>9/6 full-pay table, paid per 1 bet (stake included): Royal Flush 800, Straight Flush 50, Four of a Kind 25, Full House 9, Flush 6, Straight 4, Three of a Kind 3, Two Pair 2, Jacks or Better (a pair of J, Q, K or A) 1. A-2-3-4-5 counts as a straight.</p>
<p>Perfect strategy returns about 99.54%. The optional auto-hold hint uses a simpler strategy (about 97.5%).</p>
<p>Keys: <b>1–5</b> toggle holds · <b>Space</b> / <b>Enter</b> deal or draw.</p>` });
const bet = BetControl($('#panel'), { game: 'poker' });
$('#panel').insertBefore(bet.el, $('#panel .hintrow'));

const SHORT = { royal: 'Royal', sf: 'Str Flush', quads: 'Quads', fh: 'Full House', flush: 'Flush', straight: 'Straight', trips: 'Trips', twopair: 'Two Pair', jacks: 'Jacks+' };
const RM = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const HK = 'afterglow:poker-hint';
let round = null, deck = null, hand = null, held = [false, false, false, false, false], phase = 'idle', busy = false;
const sess = { hands: 0, best: -1, net: 0 };
const hintEl = $('#hint');
try { hintEl.checked = localStorage.getItem(HK) === '1'; } catch (e) {}
hintEl.onchange = () => {
  sfx('tap'); try { localStorage.setItem(HK, hintEl.checked ? '1' : '0'); } catch (e) {}
  if (phase === 'hold' && hintEl.checked) held = hint(hand);
  paint();
};

/* ---------- paytable ---------- */
const pt = $('#pt');
PAYTABLE.forEach(p => pt.appendChild(h(`<div data-k="${p.key}" class="${p.key === 'royal' ? 'royal' : ''}"><span>${p.name}</span><b>${p.pay}×</b></div>`)));
function paintTable(key, final) {
  $$('div', pt).forEach(d => { d.classList.toggle('hit', !final && d.dataset.k === key); d.classList.toggle('win', !!final && d.dataset.k === key); });
}

/* ---------- cards ---------- */
const row = $('#row');
const slots = [0, 1, 2, 3, 4].map(i => {
  const s = h(`<button class="slot" type="button" disabled aria-pressed="false"><div class="pc down" role="img" aria-label="Face-down card"><div class="in"><div class="fc"></div><div class="bk"></div></div></div><span class="hold">HOLD<kbd>${i + 1}</kbd></span></button>`);
  s.onclick = () => toggle(i);
  row.appendChild(s); return s;
});
const pcOf = i => $('.pc', slots[i]);
function faceHTML(c) {
  const r = RANKS[rankOf(c)], s = SUITS[suitOf(c)], fig = rankOf(c) >= 9 && rankOf(c) <= 11;
  return `<span class="cn tl">${r}<i>${s}</i></span>${fig ? `<span class="face">${r}<small>${s}</small></span>` : `<span class="pip">${s}</span>`}<span class="cn br">${r}<i>${s}</i></span>`;
}
function setFace(i, c) { const el = pcOf(i); el.classList.toggle('red', isRed(c)); $('.fc', el).innerHTML = faceHTML(c); el.setAttribute('aria-label', cardName(c)); }
async function flipDown(idx) {
  idx.forEach(i => { pcOf(i).classList.add('down'); pcOf(i).setAttribute('aria-label', 'Face-down card'); });
  if (idx.length) await sleep(260);
}
async function reveal(i, c) {
  setFace(i, c); pcOf(i).classList.remove('down'); sfx('card');
  if (!RM()) pcOf(i).animate([{ transform: 'translateY(-14px) scale(1.04)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
  await sleep(110);
}

/* ---------- paint ---------- */
const msg = (t, w) => { const m = $('#msg'); m.textContent = t; m.classList.toggle('w', !!w); };
function paint() {
  const holding = phase === 'hold' && !busy;
  const sug = hintEl.checked && phase === 'hold' ? hint(hand) : null;
  slots.forEach((s, i) => {
    s.disabled = !holding;
    s.classList.toggle('held', phase === 'hold' && held[i]);
    s.classList.toggle('sug', !!sug && sug[i] && phase === 'hold');
    s.setAttribute('aria-pressed', String(phase === 'hold' && held[i]));
    s.setAttribute('aria-label', `Card ${i + 1}${hand && !pcOf(i).classList.contains('down') ? ', ' + cardName(hand[i]) : ''}${phase === 'hold' && held[i] ? ', held' : ''}`);
    $('.hold', s).firstChild.textContent = phase === 'hold' && held[i] ? 'HELD' : 'HOLD';
  });
  const go = $('#go');
  go.disabled = busy;
  go.firstChild.textContent = phase === 'hold' ? 'DRAW ' : 'DEAL ';
  go.className = 'btn big ' + (phase === 'hold' ? 'pink' : 'pri');
  bet.disable(busy || phase === 'hold');
  $('#sHands').textContent = sess.hands;
  $('#sBest').textContent = sess.best >= 0 ? PAYTABLE[sess.best].name : '-';
  const n = $('#sNet'); n.textContent = (sess.net > 0 ? '+' : '') + fmtFull(sess.net); n.style.color = sess.net > 0 ? 'var(--l)' : sess.net < 0 ? 'var(--r)' : '';
}

function toggle(i) {
  if (phase !== 'hold' || busy) return;
  held[i] = !held[i]; sfx(held[i] ? 'chip' : 'tap'); buzz(8); paint();
}

/* ---------- round flow ---------- */
async function deal() {
  if (busy || phase === 'hold') return;
  busy = true; paint();
  const r = await startRound('poker', bet.value);
  if (!r) { busy = false; paint(); return; }
  round = r; sfx('bet'); buzz(8);
  deck = drawDeck(await r.floats(10), 10); // 5 dealt + up to 5 draws
  hand = deck.slice(0, 5); held = [false, false, false, false, false];
  $$('.ban', row).forEach(b => b.remove());
  row.classList.remove('done'); slots.forEach(s => s.classList.remove('wc'));
  paintTable(null); msg('');
  await flipDown([0, 1, 2, 3, 4].filter(i => !pcOf(i).classList.contains('down')));
  for (let i = 0; i < 5; i++) await reveal(i, hand[i]);
  const e = evaluate(hand);
  paintTable(e.key, false);
  if (hintEl.checked) held = hint(hand);
  msg(e.pay ? `Dealt: ${e.name}` : 'Tap cards to hold, then draw', !!e.pay);
  if (e.pay) sfx('tick');
  phase = 'hold'; busy = false; paint();
}

async function drawCards() {
  if (busy || phase !== 'hold') return;
  busy = true; sfx('tap'); paint();
  const swap = [0, 1, 2, 3, 4].filter(i => !held[i]);
  const fin = draw(deck, held);
  await flipDown(swap);
  for (const i of swap) await reveal(i, fin[i]);
  hand = fin;
  const e = evaluate(fin), payout = round.bet * e.pay;
  phase = 'idle';
  paintTable(e.key, true);
  const big = e.pay >= 9;
  // Exactly one settle per hand. The shell's BIG WIN overlay handles 10×+ (quads and up).
  const out = round.settle(payout, { mult: e.pay, detail: `${e.name} · ${fin.map(c => RANKS[rankOf(c)] + SUITS[suitOf(c)]).join(' ')} · held ${held.filter(Boolean).length}` });
  sess.hands++; sess.net += payout - round.bet;
  if (e.pay) { const k = PAYTABLE.findIndex(p => p.key === e.key); if (sess.best < 0 || k < sess.best) sess.best = k; }
  if (e.pay) {
    row.classList.add('done');
    slots.forEach((s, i) => s.classList.toggle('wc', e.mask[i]));
    row.appendChild(h(`<div class="ban${big ? ' big' : ''}">${e.name.toUpperCase()}</div>`));
    msg(`${e.name} pays ${fmtFull(payout)}`, true);
    const rc = row.getBoundingClientRect();
    if (big) {
      unlock('poker'); buzz([20, 30, 20, 30, 60]);
      burst(rc.left + rc.width / 2, rc.top + rc.height / 2, { count: 90, colors: ['#b8ff3b', '#22f0ff', '#ffd84d', '#ff3dc8'], speed: 10, gravity: 0.18 });
      if (e.pay < 10) { confetti(); sfx('big'); }
    } else {
      buzz(20);
      if (e.pay > 1) burst(rc.left + rc.width / 2, rc.top + rc.height / 2, { count: 26, colors: ['#22f0ff', '#b8ff3b'], speed: 6, gravity: 0.15 });
      else sfx('tick');
    }
  } else {
    msg('No win · deal again');
    sfx('lose'); buzz([40, 30, 40]);
    row.classList.add('shake'); setTimeout(() => row.classList.remove('shake'), 400);
  }
  pushRecent($('#recent'), e.pay ? `${SHORT[e.key]} ${fmtX(e.pay)}` : fmtX(0), big ? 'b' : e.pay > 1 ? 'w' : '');
  round = null; busy = false; paint();
  return out;
}

/* ---------- input ---------- */
$('#go').onclick = () => (phase === 'hold' ? drawCards() : deal());
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || $('.scrim')) return;
  if (e.target.closest?.('input,textarea,select')) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (e.target.closest?.('a')) return;
    e.preventDefault(); if (e.repeat) return;
    phase === 'hold' ? drawCards() : deal();
    return;
  }
  if (/^[1-5]$/.test(e.key) && !e.repeat) { e.preventDefault(); toggle(+e.key - 1); }
});
addEventListener('keyup', e => { if (e.key === ' ' && e.target.closest?.('button')) e.preventDefault(); });
msg('Place your bet and deal');
paint();
