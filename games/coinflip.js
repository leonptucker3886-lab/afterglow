import { boot, $, $$, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, state } from '/core/ag.js';
import { MAX_FLIPS, LADDER, sideOf, multAt, payoutFor } from '/games/coinflip-engine.js';

boot({ nav: 'games' });

gameHeader($('#panel'), {
  title: 'Heads or Tails',
  rules: `<p>Call <b>Heads</b> or <b>Tails</b>, set your bet and flip. A correct call pays <b>1.96×</b>.</p>
  <p><b>Chain it:</b> after a win you can <b>Cash out</b> or <b>Double it</b>: flip again, risking your current winnings for another 1.96×. Up to ${MAX_FLIPS} flips per round (top of the ladder is ${fmtX(multAt(MAX_FLIPS))}). A wrong call loses the whole chain.</p>
  <p>You can switch sides between flips. Win 5 flips in a row (in one chain or across rounds) to unlock <i>Lucky streak</i>.</p>
  <p>Each flip uses its own fair float from the round: heads if it is below 0.5. 98% RTP per flip; every extra chained flip applies the 2% edge again.</p>
  <p class="faint">Keys: H / T pick a side, Space flips, C cashes out.</p>`,
});
const bet = BetControl($('#panel'), { game: 'coinflip' });
$('#panel').insertBefore(bet.el, $('#panel .field'));

/* ---------- coin art ---------- */
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const ticks = (r1, r2, n, col) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); return `<line x1="${100 + c * r1}" y1="${100 + s * r1}" x2="${100 + c * r2}" y2="${100 + s * r2}" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`; }).join('');
const face = (k, col, deep, mid, emblem, letter) => `<svg viewBox="0 0 200 200" aria-hidden="true"><defs>
  <radialGradient id="cf${k}" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="${mid}"/><stop offset=".55" stop-color="${deep}"/><stop offset="1" stop-color="#05050a"/></radialGradient>
  <linearGradient id="cs${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <circle cx="100" cy="100" r="97" fill="url(#cf${k})" stroke="${col}" stroke-width="5"/>
  <circle cx="100" cy="100" r="84" fill="none" stroke="${col}" stroke-width="2" opacity=".75"/>
  <g opacity=".55">${ticks(74, 80, 40, col)}</g>
  ${emblem}
  <text x="100" y="128" font-size="78" font-weight="900" font-family="system-ui,sans-serif" text-anchor="middle" fill="${col}" style="filter:drop-shadow(0 0 6px ${col})">${letter}</text>
  <path d="M30 70A80 80 0 0 1 120 22" stroke="url(#cs${k})" stroke-width="10" fill="none" stroke-linecap="round"/>
</svg>`;
const SUN = `<g opacity=".35" stroke="#ffd84d" stroke-width="3" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${100 + Math.cos(a) * 44}" y1="${100 + Math.sin(a) * 44}" x2="${100 + Math.cos(a) * 60}" y2="${100 + Math.sin(a) * 60}"/>`; }).join('')}</g><circle cx="100" cy="100" r="38" fill="#ffd84d14" stroke="#ffd84d" stroke-width="1.5" opacity=".6"/>`;
const MOON = `<path d="M128 46a56 56 0 1 0 26 84a46 46 0 1 1-26-84z" fill="#22f0ff18" stroke="#22f0ff" stroke-width="1.5" opacity=".7"/><g fill="#22f0ff" opacity=".7"><circle cx="58" cy="62" r="2.5"/><circle cx="146" cy="58" r="2"/><circle cx="150" cy="140" r="2.5"/><circle cx="52" cy="138" r="1.8"/></g>`;
const coin = $('#coin'), toss = $('#toss'), shadow = $('#shadow');
const EDGE_N = 12;
coin.innerHTML = Array.from({ length: EDGE_N }, (_, i) => `<div class="cf-edge" style="transform:translateZ(calc(var(--cs) * ${(-0.042 + (0.084 * i) / (EDGE_N - 1)).toFixed(4)}))"></div>`).join('')
  + `<div class="cf-face h">${face('h', '#ffd84d', '#3a2c05', '#6b5410', SUN, 'H')}</div><div class="cf-face t">${face('t', '#22f0ff', '#06303a', '#0d5866', MOON, 'T')}</div>`;

/* ---------- ladder ---------- */
const ladder = $('#ladder');
LADDER.forEach((m, i) => ladder.insertAdjacentHTML('beforeend', `<div class="cf-step"><small>${i + 1}</small><b>${fmtX(m)}</b></div>`));
const steps = $$('.cf-step', ladder);

/* ---------- state ---------- */
let pick = 'H', round = null, wins = 0, busy = false, rot = 0, streak = 0, best = 0, bustAt = -1;
const flips = []; // sides landed this round

function setPick(s) {
  pick = s;
  $$('.cf-pick').forEach(b => { const on = b.dataset.s === s; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}
function msg(text, sub = '', kind = 'n') {
  const m = $('#msg'); m.className = 'cf-msg ' + kind; m.innerHTML = ''; m.append(text);
  if (sub) { const s = document.createElement('small'); s.textContent = sub; m.append(s); }
  void m.offsetWidth; m.classList.add('pop');
}

function paint() {
  const chain = !!round && wins > 0;
  const cur = round ? round.bet * multAt(wins) : 0;
  $('#chain').textContent = `${wins} / ${MAX_FLIPS}`;
  $('#win').textContent = chain ? fmtFull(cur) : '0';
  $('#streak').textContent = streak;
  $('#streak').classList.toggle('hot', streak >= 3);
  $('#best').textContent = best;
  const pips = $('#pips'); pips.classList.toggle('done', !!state.ach.flip);
  $$('i', pips).forEach((p, i) => p.classList.toggle('on', i < Math.min(streak, 5)));
  $('#nextv').textContent = wins < MAX_FLIPS ? `${fmtX(multAt(wins + 1))}${round ? ' = ' + fmtFull(round.bet * multAt(wins + 1)) : ''}` : '-';
  steps.forEach((s, i) => {
    s.classList.toggle('done', i < wins); s.classList.toggle('cur', chain && i === wins - 1);
    s.classList.toggle('next', !busy && i === wins && wins < MAX_FLIPS && bustAt < 0);
    s.classList.toggle('bust', i === bustAt);
  });
  $('#ladlab').textContent = chain ? `Next: ${fmtX(multAt(wins + 1))}` : 'Win to climb';
  const go = $('#go'), cash = $('#cash');
  $('#acts').classList.toggle('chain', chain);
  cash.hidden = !chain;
  $('#cashv').textContent = fmtFull(cur);
  cash.disabled = busy || !chain;
  if (chain) { go.className = 'btn big pink'; go.innerHTML = `Double it<small>${fmtFull(payoutFor(round.bet, wins + 1))}</small>`; }
  else { go.className = 'btn big pri'; go.textContent = busy ? 'Flipping…' : 'Flip'; }
  go.disabled = busy;
  $$('.cf-pick').forEach(b => (b.disabled = busy));
  bet.disable(busy || !!round);
}

/* ---------- animation ---------- */
const center = () => { const r = coin.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
async function animateFlip(side) {
  const base = rot - (((rot % 360) + 360) % 360);
  const turns = 4 + Math.floor(Math.random() * 3); // cosmetic only
  const target = base + 360 * turns + (side === 'H' ? 0 : 180);
  coin.classList.remove('glow-h', 'glow-t', 'lose');
  if (reduced()) { rot = target; coin.style.transform = `rotateX(${rot}deg)`; await sleep(60); return; }
  const D = 1350, H = Math.round(coin.offsetHeight * 1.25);
  sfx('spin'); buzz(12);
  toss.animate([
    { transform: 'translateY(0) scale(1)', easing: 'cubic-bezier(.15,.7,.35,1)' },
    { transform: `translateY(${-H}px) scale(1.18)`, offset: 0.48, easing: 'cubic-bezier(.6,0,.85,.4)' },
    { transform: 'translateY(0) scale(1)' },
  ], { duration: D });
  shadow.animate([
    { transform: 'translateX(-50%) scale(1)', opacity: 1, easing: 'cubic-bezier(.15,.7,.35,1)' },
    { transform: 'translateX(-50%) scale(.45)', opacity: 0.25, offset: 0.48, easing: 'cubic-bezier(.6,0,.85,.4)' },
    { transform: 'translateX(-50%) scale(1)', opacity: 1 },
  ], { duration: D });
  const spin = coin.animate([{ transform: `rotateX(${rot}deg)` }, { transform: `rotateX(${target}deg)` }], { duration: D, easing: 'cubic-bezier(.25,.4,.4,1)', fill: 'forwards' });
  let tk = 0; const tick = setInterval(() => { if (++tk < 7) sfx('tick'); }, 150);
  await spin.finished; clearInterval(tick);
  rot = target; coin.style.transform = `rotateX(${rot}deg)`; spin.cancel();
  // landing: bounce, wobble, sparks
  sfx('stop'); buzz(18);
  const [x, y] = center();
  burst(x, y + coin.offsetHeight * 0.45, { count: 26, colors: side === 'H' ? ['#ffd84d', '#fff3b0', '#ff3dc8'] : ['#22f0ff', '#b6fbff', '#8b5cff'], speed: 6, spread: 1.6, angle: -Math.PI / 2, gravity: 0.22 });
  toss.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' });
  shadow.animate([{ transform: 'translateX(-50%) scale(1)' }, { transform: 'translateX(-50%) scale(.85)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 300 });
  const w = coin.animate([0, 16, -11, 7, -4, 2, 0].map((a, i) => ({ transform: `rotateX(${rot + a}deg) rotateY(${[0, -8, 6, -4, 2, -1, 0][i]}deg)` })), { duration: 700, easing: 'ease-out' });
  await w.finished;
}

/* ---------- play ---------- */
// On phones the panel sits under the stage: if the coin is off screen when a flip starts, bring the stage up.
function keepCoinInView() {
  const c = coin.getBoundingClientRect(), top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top')) || 58;
  if (c.top >= top && c.bottom <= innerHeight - 70) return;
  scrollBy({ top: $('.stage').getBoundingClientRect().top - top - 8, behavior: reduced() ? 'auto' : 'smooth' });
}
async function flip() {
  if (busy || (round && wins >= MAX_FLIPS)) return;
  busy = true;
  if ($('#rnd').checked) setPick(Math.random() < 0.5 ? 'H' : 'T'); // cosmetic side pick, odds unaffected
  paint();
  if (!round) {
    const r = await startRound('coinflip', bet.value);
    if (!r) { busy = false; paint(); return; }
    round = r; wins = 0; bustAt = -1; flips.length = 0;
    sfx('bet');
  }
  keepCoinInView();
  const call = pick;
  msg(call === 'H' ? 'Heads…' : 'Tails…', wins ? `Flip ${wins + 1} of ${MAX_FLIPS} · riding ${fmtFull(round.bet * multAt(wins))}` : `You called ${call === 'H' ? 'heads' : 'tails'}`);
  const side = sideOf(await round.float());
  flips.push(side);
  await animateFlip(side);
  const won = side === call;
  pushRecent($('#recent'), side, (side === 'H' ? 'h' : 't') + (won ? ' w' : ' x'));
  if (won) {
    wins++; streak++; best = Math.max(best, streak);
    coin.classList.add(side === 'H' ? 'glow-h' : 'glow-t');
    if (streak >= 5) unlock('flip');
    const [x, y] = center();
    burst(x, y, { count: 34 + wins * 4, colors: ['#b8ff3b', side === 'H' ? '#ffd84d' : '#22f0ff', '#ffffff'], speed: 7, gravity: 0.18 });
    buzz([10, 30, 20]);
    if (wins >= MAX_FLIPS) { busy = false; return cashOut(true); }
    sfx(wins >= 3 ? 'rise' : 'gem');
    msg(side === 'H' ? 'Heads!' : 'Tails!', `${fmtX(multAt(wins))} · Cash out ${fmtFull(round.bet * multAt(wins))} or double it`, 'w');
    busy = false; paint();
  } else {
    streak = 0; bustAt = wins;
    coin.classList.add('lose');
    sfx('lose'); buzz([60, 40, 90]);
    $('#arena').classList.add('shake'); setTimeout(() => $('#arena').classList.remove('shake'), 400);
    const lost = wins ? round.bet * multAt(wins) : round.bet;
    round.settle(0, { mult: 0, detail: `called ${call} · ${flips.join('')} · lost at flip ${wins + 1}` });
    msg(side === 'H' ? 'Heads' : 'Tails', wins ? `Chain broken at ${wins + 1}. ${fmtFull(lost)} lost` : `You called ${call === 'H' ? 'heads' : 'tails'}. -${fmtFull(lost)}`, 'l');
    end();
  }
}

function cashOut(top = false) {
  if (busy || !round || !wins) return;
  busy = true;
  const m = multAt(wins), pay = payoutFor(round.bet, wins);
  sfx('cash');
  const [x, y] = center();
  burst(x, y, { count: 70, colors: ['#b8ff3b', '#ffd84d', '#22f0ff', '#ff3dc8'], speed: 10, gravity: 0.2 });
  round.settle(pay, { mult: m, detail: `${wins} flip${wins > 1 ? 's' : ''} · ${flips.join('')} · ${top ? 'max chain' : 'cashed out'}` });
  msg(top ? 'Max chain!' : 'Cashed out', `${fmtX(m)} · +${fmtFull(pay)}`, 'w');
  end();
}

function end() { round = null; wins = 0; busy = false; paint(); }

$('#picks').onclick = e => { const b = e.target.closest('.cf-pick'); if (!b || busy) return; sfx('tap'); setPick(b.dataset.s); };
$('#go').onclick = () => flip();
$('#cash').onclick = () => cashOut();
$('#rnd').onchange = () => sfx('tap');

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.target.closest?.('input,textarea,select') || document.querySelector('.scrim')) return;
  const k = e.key.toLowerCase();
  if (k === 'h' || k === 't') { if (!busy) { sfx('tap'); setPick(k.toUpperCase()); } }
  else if (e.code === 'Space') { e.preventDefault(); document.activeElement?.blur?.(); flip(); }
  else if (k === 'c') cashOut();
});

paint();
