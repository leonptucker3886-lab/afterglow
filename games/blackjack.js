import { boot, $, $$, h, BetControl, gameHeader, startRound, shuffle, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, toast, state, COIN } from '/core/ag.js';
import { Game, freshShoe, score, label, basic, RANKS, SUITS, rankOf, suitOf, isRed } from '/games/blackjack-engine.js';

boot({ nav: 'games' });
gameHeader($('#panel'), { title: 'Neon 21', rules: `<p>Beat the dealer without going over 21. Number cards count their value, J Q K count 10, Aces count 1 or 11.</p>
<ul style="padding-left:18px"><li>6 decks, freshly shuffled every hand.</li><li>Blackjack pays <b>3 to 2</b>. Other wins pay 1 to 1, ties push.</li>
<li>Dealer stands on all 17s and peeks for blackjack with an Ace or 10 showing. No insurance.</li>
<li><b>Double</b> on any first two cards (one more card, bet doubled), including after a split.</li>
<li><b>Split</b> a pair once into two hands. Split Aces get one card each. 21 after a split is not a blackjack.</li></ul>
<p>Keys: <b>H</b> hit · <b>S</b> stand · <b>D</b> double · <b>P</b> split · <b>Enter</b> deal.</p>
<p>Basic strategy returns about 99.5% (house edge about 0.5%).</p>` });
const bet = BetControl($('#panel'), { game: 'blackjack' });

const RM = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const HK = 'afterglow:bj-hint';
let g = null, round = null, busy = false, last = 0, hw = [], dEls = [];
const sess = { hands: 0, bj: 0, net: 0 };
const hintEl = $('#hint');
try { hintEl.checked = localStorage.getItem(HK) === '1'; } catch (e) {}
hintEl.onchange = () => { sfx('tap'); try { localStorage.setItem(HK, hintEl.checked ? '1' : '0'); } catch (e) {} paint(); };

/* ---------- cards ---------- */
function faceHTML(c) {
  const r = RANKS[rankOf(c)], s = SUITS[suitOf(c)], fig = rankOf(c) >= 10;
  return `<span class="cn tl">${r}<i>${s}</i></span>${fig ? `<span class="face">${r}<small>${s}</small></span>` : `<span class="pip">${s}</span>`}<span class="cn br">${r}<i>${s}</i></span>`;
}
function paintFace(el, c) { el.classList.toggle('red', isRed(c)); $('.fc', el).innerHTML = faceHTML(c); el.setAttribute('aria-label', `${RANKS[rankOf(c)]} of ${['spades', 'hearts', 'clubs', 'diamonds'][suitOf(c)]}`); }
function cardEl(c, down) {
  const el = h(`<div class="pc${down ? ' down' : ''}" role="img" aria-label="Face-down card"><div class="in"><div class="fc"></div><div class="bk"></div></div></div>`);
  if (!down) paintFace(el, c);
  return el;
}
// FLIP: animate every card on the table from where it was before a DOM change.
function flip(mutate) {
  const all = $$('#tbl .pc'), before = all.map(e => e.getBoundingClientRect());
  mutate();
  if (RM()) return;
  all.forEach((e, i) => {
    if (!e.isConnected) return;
    const b = e.getBoundingClientRect(), dx = before[i].left - b.left, dy = before[i].top - b.top;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) e.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
}
async function place(container, c, down = false) {
  const el = cardEl(c, down);
  flip(() => container.appendChild(el));
  sfx('card');
  if (!RM()) {
    const s = $('#shoe').getBoundingClientRect(), r = el.getBoundingClientRect();
    const dx = s.left + s.width / 2 - (r.left + r.width / 2), dy = s.top + s.height / 2 - (r.top + r.height / 2);
    el.animate([{ transform: `translate(${dx}px,${dy}px) rotate(-40deg) scale(.5)`, opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1)' });
  }
  await sleep(320);
  return el;
}
async function revealHole() {
  const el = dEls[1];
  if (!el || !el.classList.contains('down')) return;
  paintFace(el, g.dealer[1]); el.classList.remove('down'); sfx('reveal');
  await sleep(480); paint();
}
async function clearTable() {
  const all = $$('#tbl .pc');
  if (all.length && !RM()) {
    all.forEach((e, i) => e.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-40px,-30px) rotate(-12deg) scale(.8)', opacity: 0 }], { duration: 240, delay: i * 18, easing: 'ease-in', fill: 'forwards' }));
    await sleep(240 + all.length * 18);
  }
  $('#dealer').innerHTML = ''; $('#hands').innerHTML = ''; $('#hands').className = 'hands';
  $('#dtot').textContent = ''; $('#dtot').className = 'tot mono'; hw = []; dEls = [];
}
function mkWrap(at) {
  const w = h(`<div class="hwrap"><span class="tot mono"></span><div class="cards"></div><span class="hbet"></span></div>`);
  at ? at.after(w) : $('#hands').appendChild(w);
  return { w, cards: $('.cards', w), tot: $('.tot', w), bet: $('.hbet', w) };
}
const msg = t => ($('#msg').textContent = t);

/* ---------- painting ---------- */
function paint() {
  const inRound = !!round, play = !!g && g.phase === 'play' && inRound;
  if (g && hw.length) {
    g.hands.forEach((hd, i) => {
      const v = hw[i]; if (!v) return;
      const shown = hd.cards.slice(0, v.cards.children.length), t = score(shown).t;
      const nat = i === 0 && g.hands.length === 1 && g.playerBJ && shown.length === 2;
      v.tot.textContent = shown.length ? (nat ? 'BLACKJACK' : t > 21 ? `${t} BUST` : label(shown)) : '';
      v.tot.className = 'tot mono' + (nat ? ' bj' : t > 21 ? ' bust' : '');
      v.bet.innerHTML = `${COIN}${fmtFull(hd.bet)}${hd.doubled ? ' · doubled' : ''}`;
      v.w.classList.toggle('on', play && i === g.active);
    });
    $('#hands').classList.toggle('split', g.hands.length > 1);
    $('#hands').classList.toggle('fin', !play);
    const vis = g.dealer.filter((c, i) => dEls[i] && !dEls[i].classList.contains('down')), dt = score(vis).t;
    const dnat = vis.length === 2 && g.dealerBJ;
    $('#dtot').textContent = vis.length ? (dnat ? 'BLACKJACK' : dt > 21 ? `${dt} BUST` : label(vis)) : '';
    $('#dtot').className = 'tot mono' + (dnat ? ' bj' : dt > 21 ? ' bust' : '');
  }
  const can = { H: play && !busy && g.canHit(), S: play && !busy && g.canStand(), D: play && !busy && g.canDouble(), P: play && !busy && g.canSplit() };
  let tip = null;
  if (hintEl.checked && play && !busy) {
    tip = basic(g.hand.cards, g.dealer[0], { dbl: can.D, split: can.P });
    if (tip === 'D' && !can.D) tip = 'H';
  }
  $$('#acts button').forEach(b => { b.disabled = !can[b.dataset.a]; b.classList.toggle('hint', tip === b.dataset.a); });
  $('#deal').disabled = busy || inRound;
  $('#deal').textContent = inRound ? 'Hand in play' : 'Deal';
  bet.disable(busy || inRound);
  const rb = $('#rebet'); rb.hidden = !last || inRound;
  $('#rb1').textContent = `Rebet ${fmtFull(last)}`; $('#rb2').textContent = `Rebet ×2 · ${fmtFull(last * 2)}`;
  $('#rb1').disabled = $('#rb2').disabled = busy || inRound;
  $('#sHands').textContent = sess.hands; $('#sBj').textContent = sess.bj;
  const n = $('#sNet'); n.textContent = (sess.net > 0 ? '+' : '') + fmtFull(sess.net); n.style.color = sess.net > 0 ? 'var(--l)' : sess.net < 0 ? 'var(--r)' : '';
}

/* ---------- round flow ---------- */
async function deal(amount) {
  if (busy || round) return;
  if (amount) bet.value = amount;
  busy = true; paint();
  const r = await startRound('blackjack', bet.value);
  if (!r) { busy = false; paint(); return; }
  round = r; last = r.bet; sfx('chip'); buzz(8);
  const shoe = shuffle(freshShoe(), await r.floats(311));
  g = new Game(shoe, r.bet);
  await clearTable();
  msg('');
  const { p, d } = g.deal();
  hw = [mkWrap()]; paint();
  await place(hw[0].cards, p[0]); paint();
  dEls.push(await place($('#dealer'), d[0])); paint();
  await place(hw[0].cards, p[1]); paint();
  dEls.push(await place($('#dealer'), d[1], true)); paint();
  if (g.peeks) {
    msg('Dealer checks for blackjack…');
    if (!RM()) dEls[1].animate([{ transform: 'none' }, { transform: 'translateY(-8px) rotate(-5deg)' }, { transform: 'none' }], { duration: 650, easing: 'ease-in-out' });
    await sleep(750);
    msg(g.dealerBJ ? 'Dealer has blackjack' : 'No dealer blackjack');
  }
  if (g.phase === 'over') { await revealHole(); return finish(); }
  await advance();
}

// Deal pending split cards, skip finished hands; hand control back to the player or run the dealer.
async function advance() {
  for (;;) {
    if (g.needsCard()) { paint(); await sleep(140); await place(hw[g.active].cards, g.fill()); paint(); continue; }
    if (!g.next()) break;
    if (g.needsCard()) continue;
    busy = false; paint(); return;
  }
  busy = true; paint();
  await dealerTurn();
}

async function dealerTurn() {
  await sleep(200);
  await revealHole();
  if (!g.anyLive()) msg('All hands bust');
  while (g.dealerMustDraw()) { await sleep(220); dEls.push(await place($('#dealer'), g.dealerHit())); paint(); }
  finish();
}

const BAN = { bj: 'BLACKJACK', win: 'WIN', push: 'PUSH', bust: 'BUST', lose: 'LOSE' };
async function finish() {
  const res = g.results();
  paint();
  const d = res.dealer, nat = res.hands[0].res === 'bj';
  if (!g.dealerBJ && !g.playerBJ) msg(d > 21 ? `Dealer busts with ${d}` : `Dealer stands on ${d}`);
  else if (g.dealerBJ && !g.playerBJ) msg('Dealer blackjack');
  else if (g.dealerBJ && g.playerBJ) msg('Blackjack vs blackjack: push');
  else msg('Blackjack pays 3 to 2!');
  // Exactly one settle for the whole hand (all split hands, doubles included).
  const out = round.settle(res.payout, { detail: `${res.hands.map(x => `${x.res.toUpperCase()} ${x.t}`).join(' / ')} vs dealer ${g.dealerBJ ? 'BJ' : d}` });
  res.hands.forEach((x, i) => { const w = hw[i]?.w; if (w) w.appendChild(h(`<div class="ban ${x.res}">${BAN[x.res]}</div>`)); });
  const net = res.payout - res.staked;
  sess.hands++; sess.net += Math.floor(res.payout) - res.staked;
  if (nat) {
    sess.bj++; unlock('bj'); buzz([20, 30, 20, 30, 60]);
    const r = hw[0].w.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: 70, colors: ['#b8ff3b', '#22f0ff', '#ffd84d', '#ff3dc8'], speed: 9, gravity: 0.18 });
  } else if (net > 0) {
    buzz(20);
    hw.forEach((v, i) => { if (res.hands[i].res === 'win') { const r = v.w.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, { count: 18, colors: ['#22f0ff', '#b8ff3b'], speed: 5, gravity: 0.15 }); } });
  } else if (net === 0) sfx('tick');
  else { sfx('lose'); buzz([40, 30, 40]); $('#pzone').classList.add('shake'); setTimeout(() => $('#pzone').classList.remove('shake'), 400); }
  pushRecent($('#recent'), nat ? 'BJ ' + fmtX(2.5) : fmtX(out ? out.mult : 0), nat ? 'b' : net > 0 ? 'w' : '');
  round = null; busy = false; paint();
}

async function act(a) {
  if (busy || !round || !g || g.phase !== 'play') return;
  const v = hw[g.active];
  if (a === 'H' && g.canHit()) {
    busy = true; paint();
    await place(v.cards, g.hit()); paint();
    if (score(g.hand.cards).t > 21) { buzz(30); v.w.classList.add('shake'); setTimeout(() => v.w.classList.remove('shake'), 400); await sleep(250); }
    await advance();
  } else if (a === 'S' && g.canStand()) {
    busy = true; sfx('tap'); g.stand(); paint();
    await advance();
  } else if (a === 'D' && g.canDouble()) {
    if (!round.addBet(g.hand.bet)) { toast(`Not enough Glow to double (needs ${fmtFull(g.hand.bet)}).`, 'r'); buzz(30); sfx('lose'); return; }
    busy = true; sfx('chip'); buzz(8);
    const c = g.double(); paint();
    await place(v.cards, c); paint();
    if (score(g.hand.cards).t > 21) { buzz(30); await sleep(250); }
    await advance();
  } else if (a === 'P' && g.canSplit()) {
    if (!round.addBet(g.bet)) { toast(`Not enough Glow to split (needs ${fmtFull(g.bet)}).`, 'r'); buzz(30); sfx('lose'); return; }
    busy = true; sfx('chip'); buzz(8);
    g.split();
    flip(() => { const n = mkWrap(v.w); n.cards.appendChild(v.cards.lastElementChild); hw.push(n); $('#hands').classList.add('split'); });
    sfx('card'); paint();
    await sleep(320);
    await advance();
  }
}

/* ---------- input ---------- */
$('#deal').onclick = () => deal();
$('#rb1').onclick = () => deal(last);
$('#rb2').onclick = () => deal(last * 2);
$('#acts').onclick = e => { const b = e.target.closest('button'); if (b && !b.disabled) act(b.dataset.a); };
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || $('.scrim')) return;
  if (e.target.closest?.('input,textarea,select')) return;
  const k = e.key.toLowerCase();
  if (k === 'enter') { if (e.target.closest?.('button,a')) return; if (!round && !busy) { e.preventDefault(); deal(); } return; }
  const a = { h: 'H', s: 'S', d: 'D', p: 'P' }[k];
  if (a) { e.preventDefault(); act(a); }
});
msg('Place your bet and deal');
paint();
