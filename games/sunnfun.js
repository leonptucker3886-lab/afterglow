import { boot, $, $$, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, state, toast } from '/core/ag.js';
import { SYMS, PAYLINES, gridFrom, evaluate, JP_CHANCE, JP_RATE, JP_SEED, FS_AWARD } from '/games/sunnfun-engine.js';

boot({ nav: 'games' });
const KEY = 'afterglow:snf';
const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
store.jp ||= JP_SEED;
const keep = () => localStorage.setItem(KEY, JSON.stringify(store));
const SPEEDS = { slow: 2200, normal: 1300, fast: 550 };
let speed = 'normal', busy = false;

const pay = SYMS.filter(s => !s.scatter).sort((a, b) => b.p3 - a.p3);
gameHeader($('#panel'), {
  title: 'Sun N Fun Slots',
  rules: `<p>Three reels, three rows, <b>5 paylines</b>: the three rows plus both diagonals. Line-up three matching symbols on a line to win that symbol's multiple of your total bet. Every winning line pays.</p>
  <table class="pt">${pay.map(s => `<tr><td>${s.e}</td><td>${s.name}</td><td class="n">${s.p3}×</td></tr>`).join('')}
  <tr><td>👙</td><td>2 scatters anywhere</td><td class="n">2×</td></tr><tr><td>👙</td><td>3+ scatters: pays 10× + ${FS_AWARD} free spins</td><td class="n">10×</td></tr></table>
  <p><b>Free spins</b> play at your triggering bet and can retrigger. <b>Progressive jackpot:</b> 2% of every bet feeds the pot. Three 🛻 trucks on any line gives a 1-in-10 shot at the whole thing.</p>
  <p>Original Sun N Fun game by Leon. Rebalanced for AFTERGLOW: 96.7% RTP, measured over 5M simulated spins.</p>`,
});
const bet = BetControl($('#panel'), { game: 'sunnfun' });
$('#panel').insertBefore(bet.el, $('#panel .field'));

const reels = [0, 1, 2].map(i => $('#r' + i));
const rnd = () => SYMS[Math.floor(Math.random() * 7.4)] || SYMS[0]; // cosmetic blur only
reels.forEach(r => { for (let i = 0; i < 3; i++) r.insertAdjacentHTML('beforeend', `<div class="cell">${rnd().e}</div>`); });
const cells = r => $$('.cell', reels[r]);
const linePaths = $$('.lines path');

const SPIN_MSGS = ['🐷 Yeah get that pig!!', '💨 Send it!!', '🍺 Here we gooooo!!', '🔥 FIRE IT UP!!', '🐷 Pig pickin time!!', '🛻 Pedal to the metal!!', '🤠 Yeehaw ride it!!', '🐷 Pig pit ACTIVATED!!', '🔥 Git git GIT!!', '💨 LET ER RIP!!', '🤞 Come on, daddy needs Glow!!', '👟 PUNT THAT PIG!!', '🎰 SPIN TO WIN!!'];
const LOSE_MSGS = ['🐷 Oink oink... not today', '🐷 That pig got AWAY', '🔥 Fire still burning tho!', '🛻 Truck wont start either huh', '🐷 Pig laughin at you rn', '🪣 Bucket getting light...', '💀 Dead spin. Dead.', '🐽 Pig said no sir', '🏕️ Camp harder bro', '😤 Close but no corn dog'];
const say = a => ($('#msg').textContent = a[Math.floor(Math.random() * a.length)]);

function paintJp() { $('#jp').textContent = fmtFull(Math.floor(store.jp)); }
function clear() { $$('.cell.win').forEach(c => c.classList.remove('win')); linePaths.forEach(p => p.classList.remove('on')); $('#win').textContent = ''; }

async function spinReels(grid, dur) {
  if (state.settings.reduced) dur = Math.min(dur, 300);
  sfx('spin');
  const timers = reels.map((r, i) => { r.classList.add('spin'); return setInterval(() => cells(i).forEach(c => (c.textContent = rnd().e)), 60); });
  for (let i = 0; i < 3; i++) {
    await sleep(i ? Math.max(120, dur * 0.22) : dur);
    clearInterval(timers[i]); reels[i].classList.remove('spin');
    cells(i).forEach((c, row) => (c.textContent = grid[i][row].e));
    reels[i].classList.remove('bounce'); void reels[i].offsetWidth; reels[i].classList.add('bounce');
    sfx('stop'); buzz(8);
  }
}

function show(grid, res, b) {
  res.lines.forEach(li => { linePaths[li].classList.add('on'); PAYLINES[li].forEach((row, reel) => cells(reel)[row].classList.add('win')); });
  if (res.scatter >= 2) grid.forEach((reel, ri) => reel.forEach((s, row) => s.scatter && cells(ri)[row].classList.add('win')));
  if (res.total > 0) {
    $('#win').textContent = `WIN +${fmtFull(Math.floor(res.total))}`;
    const sub = res.fs ? `🎰 ${res.fs} FREE SPINS!` : res.scatter >= 2 ? `👙 Scatter ×${res.scatter}!` : res.lines.length > 1 ? `🔥 ${res.lines.length} lines hit!` : '💰 Payline win!';
    $('#msg').textContent = sub;
    sfx(res.total >= b * 10 ? 'big' : 'win'); buzz(20);
    const r = $('#reels').getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: res.total >= b * 5 ? 60 : 24, colors: ['#ff8a1f', '#ffc23d', '#ff4d1a', '#ff3dc8'], speed: 6, gravity: 0.2 });
  }
}

async function punt() {
  unlock('pig'); sfx('rise'); buzz([40, 30, 80]);
  const p = $('#punt'); p.classList.add('on');
  await sleep(1800); p.classList.remove('on');
}

function paintBtn() {
  const go = $('#go'); go.disabled = busy; go.textContent = busy ? 'Spinning…' : 'Spin';
  $$('#spd button').forEach(b => (b.disabled = busy)); bet.disable(busy);
}

async function play() {
  if (busy) return;
  busy = true; paintBtn(); clear();
  const round = await startRound('sunnfun', bet.value);
  if (!round) { busy = false; paintBtn(); return; }
  const b = round.bet;
  store.jp += b * JP_RATE; keep(); paintJp();
  say(SPIN_MSGS);
  let total = 0, fsLeft = 0, fsPlayed = 0, jackpot = 0, lines = 0;

  let grid = gridFrom(await round.floats(9));
  await spinReels(grid, SPEEDS[speed]);
  let res = evaluate(grid, b);
  total += res.total; lines += res.lines.length; fsLeft += res.fs;
  show(grid, res, b);
  if (res.truckLine && (await round.float()) < JP_CHANCE) {
    jackpot = Math.floor(store.jp); store.jp = JP_SEED; keep(); paintJp();
    $('#msg').textContent = `🏆 JACKPOT! +${fmtFull(jackpot)} 🏆`; sfx('cash');
    await sleep(900);
  }
  if (!total && !jackpot) say(LOSE_MSGS);

  if (fsLeft) {
    await sleep(700); await punt();
    $('#fsban').classList.add('on');
    while (fsLeft > 0) {
      fsLeft--; fsPlayed++; $('#fsn').textContent = fsLeft;
      clear(); $('#msg').textContent = `🎰 FREE SPIN ${fsPlayed}! OINK OINK!!`;
      grid = gridFrom(await round.floats(9));
      await spinReels(grid, SPEEDS.fast);
      res = evaluate(grid, b);
      total += res.total; lines += res.lines.length;
      if (res.fs) { fsLeft += res.fs; toast(`Retrigger! +${res.fs} free spins`, 'y'); }
      show(grid, res, b);
      await sleep(res.total ? 700 : 300);
    }
    $('#fsban').classList.remove('on');
    $('#msg').textContent = `Free spins paid ${fmtFull(Math.floor(total))} 🔥`;
  }

  const payout = Math.floor(total) + jackpot;
  const detail = `${lines} line${lines === 1 ? '' : 's'}${fsPlayed ? ` · ${fsPlayed} free spins` : ''}${jackpot ? ` · JACKPOT ${jackpot}` : ''}`;
  const out = round.settle(payout, { detail });
  $('#last').textContent = payout ? fmtFull(payout) : '-';
  pushRecent($('#recent'), fmtX(out.mult), out.mult >= 10 ? 'b' : payout > b ? 'w' : '');
  busy = false; paintBtn();
}

$('#go').onclick = play;
$('#spd').onclick = e => { const b = e.target.closest('button'); if (!b || busy) return; sfx('tap'); speed = b.dataset.s; $$('#spd button').forEach(x => x.classList.toggle('on', x === b)); };
addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName)) { e.preventDefault(); play(); } });

const sky = $('#sky');
for (let i = 0; i < 22; i++) {
  const s = 2 + Math.random() * 5, e = document.createElement('i');
  e.className = 'ember';
  e.style.cssText = `left:${5 + Math.random() * 90}%;width:${s}px;height:${s}px;background:${Math.random() < 0.7 ? '#ff8a1fd9' : '#ffdc3ccc'};box-shadow:0 0 6px #ff8a1f;--dx:${(Math.random() - 0.5) * 100}px;animation-duration:${4 + Math.random() * 6}s;animation-delay:-${Math.random() * 8}s`;
  sky.appendChild(e);
}
paintJp(); paintBtn();
