import { boot, $, $$, h, BetControl, gameHeader, startRound, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep, tween, state, toast } from '/core/ag.js';
import * as E from '/games/diamonds-engine.js';

boot({ nav: 'games' });

/* ---------- persistent Fever meter ---------- */
const KEY = 'afterglow:diamonds';
const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
store.pips = Math.min(E.FEVER_PIPS - 1, Math.max(0, store.pips | 0)); store.sum = +store.sum || 0;
store.lines = E.LINE_OPTS.includes(store.lines) ? store.lines : 1;
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };

/* ---------- original SVG art ---------- */
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
const GEM_COL = { DC: '#22f0ff', DM: '#ff3dc8', DL: '#b8ff3b' };
const gem = (k) => {
  const c = GEM_COL[k], L = mix(c, '#ffffff', 0.65), D = mix(c, '#000000', 0.5), M = mix(c, '#000000', 0.2);
  const others = Object.values(GEM_COL).filter(x => x !== c);
  return `<polygon points="50,94 6,36 24,12 76,12 94,36" fill="${D}" stroke="#ecfdff" stroke-width="2.5" stroke-linejoin="round"/>
  <polygon points="24,12 76,12 66,36 34,36" fill="${L}"/><polygon points="6,36 24,12 34,36" fill="${c}"/><polygon points="94,36 76,12 66,36" fill="${M}"/>
  <polygon points="6,36 34,36 50,94" fill="${c}"/><polygon points="34,36 66,36 50,94" fill="${M}"/><polygon points="66,36 94,36 50,94" fill="${D}"/>
  <polygon points="34,36 44,36 50,94" fill="${others[0]}" opacity=".55"/><polygon points="58,36 66,36 50,94" fill="${others[1]}" opacity=".5"/>
  <polygon points="30,14 44,14 38,30" fill="#fff" opacity=".75"/><path d="M6 36H94M24 12L34 36L50 94L66 36L76 12" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".55"/>
  <circle cx="78" cy="20" r="2.4" fill="#fff"/><path d="M78 13v14M71 20h14" stroke="#fff" stroke-width="1.2" opacity=".9"/>
  <text x="50" y="66" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="22" fill="#fff" stroke="#02060a" stroke-width="4" paint-order="stroke">×${E.BY[k].wild}</text>`;
};
const bar = (n, c) => {
  const hgt = n === 1 ? 32 : n === 2 ? 25 : 21, gap = 4, tot = n * hgt + (n - 1) * gap, y0 = 50 - tot / 2;
  return Array.from({ length: n }, (_, i) => { const y = y0 + i * (hgt + gap); return `<rect x="8" y="${y}" width="84" height="${hgt}" rx="6" fill="#06080e" stroke="${c}" stroke-width="3"/><rect x="11" y="${y + 3}" width="78" height="${hgt * 0.35}" rx="4" fill="#fff" opacity=".1"/><text x="50" y="${y + hgt * 0.76}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="900" font-size="${hgt * 0.78}" letter-spacing="3" fill="#f2fbff" stroke="${c}" stroke-width=".8">BAR</text>`; }).join('');
};
const ART = {
  BL: `<path d="M30 50h40" stroke="#9fd8ea" stroke-width="1.5" opacity=".25" stroke-linecap="round"/>`,
  CH: `<path d="M34 58C38 36 48 22 64 12M66 60C64 40 64 26 64 12" stroke="#7fd61a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M64 12C76 8 88 12 92 22C80 26 70 22 64 12Z" fill="#b8ff3b" stroke="#e8ffc0" stroke-width="1.5"/>
    <circle cx="32" cy="70" r="20" fill="url(#g-ch)" stroke="#ffd0dc" stroke-width="2"/><circle cx="68" cy="72" r="20" fill="url(#g-ch)" stroke="#ffd0dc" stroke-width="2"/><ellipse cx="25" cy="63" rx="6" ry="4" fill="#fff" opacity=".7" transform="rotate(-30 25 63)"/><ellipse cx="61" cy="65" rx="6" ry="4" fill="#fff" opacity=".7" transform="rotate(-30 61 65)"/>`,
  B1: bar(1, '#22f0ff'), B2: bar(2, '#ff3dc8'), B3: bar(3, '#b8ff3b'),
  S7: `<polygon points="14,10 88,10 88,26 52,94 28,94 62,28 14,28" fill="url(#g-7)" stroke="#fff3f3" stroke-width="3.5" stroke-linejoin="round"/><polygon points="19,14 84,14 84,19 19,19" fill="#fff" opacity=".45"/><polygon points="14,10 88,10 88,26 52,94 28,94 62,28 14,28" fill="none" stroke="#ffd84d" stroke-width="1.2" stroke-linejoin="round" transform="translate(3 3)" opacity=".7"/>`,
  DC: gem('DC'), DM: gem('DM'), DL: gem('DL'),
};
const DEFS = `<defs><radialGradient id="g-ch" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffb3c6"/><stop offset=".45" stop-color="#ff2a62"/><stop offset="1" stop-color="#7a0025"/></radialGradient>
<linearGradient id="g-7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a9a"/><stop offset=".45" stop-color="#ff2340"/><stop offset="1" stop-color="#9a0020"/></linearGradient></defs>`;
document.body.appendChild(h(`<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${Object.entries(ART).map(([k, v]) => `<symbol id="dm-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('')}</svg>`));
const icon = k => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#dm-${k}"/></svg>`;
const cellHTML = (k, fz) => `<div class="cell k-${k}${fz ? ' fz' : ''}">${icon(k)}</div>`;

/* ---------- paytable on the glass ---------- */
const ROWS = [
  ['DL3', ['DL', 'DL', 'DL'], 'TOP', E.TOP, 'top'], ['D3', ['DC', 'DM', 'DL'], 'ANY 3', `${E.PAY.D3}×◆`],
  ['S7', ['S7', 'S7', 'S7'], 'RED 7', E.PAY.S7], ['B3', ['B3', 'B3', 'B3'], '3-BAR', E.PAY.B3], ['B2', ['B2', 'B2', 'B2'], '2-BAR', E.PAY.B2],
  ['B1', ['B1', 'B1', 'B1'], '1-BAR', E.PAY.B1], ['ANYBAR', ['B1', 'B3', 'B2'], 'ANY', E.PAY.ANYBAR],
  ['CH3', ['CH', 'CH', 'CH'], '', E.PAY.CH[3]], ['CH2', ['CH', 'CH'], 'ANY 2', E.PAY.CH[2]], ['CH1', ['CH'], 'ANY 1', E.PAY.CH[1]],
];
$('#glass').innerHTML = `<div class="ptg">${ROWS.map(([id, ic, lb, v, cls]) => `<div class="pr ${cls || ''}" data-k="${id}"><span class="ic">${ic.map(icon).join('')}</span><span class="lb">${lb}</span><b>${v}</b></div>`).join('')}</div>
  <div class="wl">◆ WILDS <em class="c">×2</em> · <em class="m">×5</em> · <em class="l">×10</em> · MULTIPLIERS MULTIPLY</div>`;
const litRows = kinds => $$('#glass .pr').forEach(r => r.classList.toggle('lit', kinds.includes(r.dataset.k)));

/* ---------- rules ---------- */
const ptRow = (ic, name, v) => `<tr><td><span class="ic">${ic.map(icon).join('')}</span></td><td>${name}</td><td class="n">${v}</td></tr>`;
gameHeader($('#panel'), {
  title: 'Diamond Fever',
  rules: `<p>A classic 3-reel stepper. Each reel is a weighted physical strip of ${E.STRIPS[0].length} stops (symbols alternate with blanks). Play <b>1 line</b> (centre), <b>3 lines</b> (plus top and bottom rows) or <b>5 lines</b> (plus both diagonals). <b>Total bet = line bet × lines.</b> Every active line pays on its own; pays are multiples of the line bet.</p>
  <table class="pt">
  ${ptRow(['DL', 'DL', 'DL'], '3 Lime diamonds: top award', E.TOP + '×')}
  ${ptRow(['DC', 'DM', 'DL'], '3 any diamonds: 5 × all three multipliers', '40-2,500×')}
  ${ptRow(['S7', 'S7', 'S7'], '3 Red 7s', E.PAY.S7 + '×')}
  ${ptRow(['B3', 'B3', 'B3'], '3 × 3-BAR', E.PAY.B3 + '×')}
  ${ptRow(['B2', 'B2', 'B2'], '3 × 2-BAR', E.PAY.B2 + '×')}
  ${ptRow(['B1', 'B1', 'B1'], '3 × 1-BAR', E.PAY.B1 + '×')}
  ${ptRow(['B1', 'B2', 'B3'], 'Any 3 bars mixed', E.PAY.ANYBAR + '×')}
  ${ptRow(['CH', 'CH', 'CH'], '3 cherries', E.PAY.CH[3] + '×')}
  ${ptRow(['CH', 'CH'], 'Any 2 cherries on the line', E.PAY.CH[2] + '×')}
  ${ptRow(['CH'], 'Any 1 cherry on the line', E.PAY.CH[1] + '×')}
  </table>
  <p><b>Diamond wilds</b> (<span style="color:var(--c)">Cyan ×2</span>, <span style="color:var(--p)">Magenta ×5</span>, <span style="color:var(--l)">Lime ×10</span>) substitute for every symbol and multiply the win. Two wilds in one win multiply together: ×2 × ×5 = ×10, ×10 × ×10 = ×100. Wilds also count as cherries. A lone wild, or wilds with blanks, pays nothing. Only the best win per line pays.</p>
  <p><b>Fever meter:</b> every paid spin with a diamond on the centre row adds a pip (whatever your line count). At 10 pips you get <b>5 Fever spins</b> on the same lines, where every blank becomes a cherry. Fever spins are valued at the average total bet of the spins that filled the meter, play inside the triggering round, and the meter is saved between visits.</p>
  <p><b>Max win:</b> 5,000× the total bet per spin, and no single line can pay more than the ${E.TOP}× top award.</p>
  <p>RTP 96.5% (exact calculation over every reel combination, confirmed by a 20M-spin simulation including Fever). Hit frequency about 15% on 1 line, 46% on 5 lines. Fever triggers about once every 190 spins.</p>`,
});

/* ---------- controls ---------- */
const bet = BetControl($('#panel'), { game: 'diamonds', min: 10, label: 'Line bet', onChange: paintBet });
$('#panel').insertBefore(bet.el, $('#panel .field'));
const SPEEDS = { slow: 1.5, normal: 1, fast: 0.5 };
let speed = 'normal', busy = false;
const lines = () => store.lines;
function paintBet() {
  const t = bet.value * lines();
  $('#tot').textContent = fmtFull(t); $('#totlab').textContent = `total bet ${fmtFull(t)}`;
  $('#topv').textContent = fmtFull(bet.value * E.TOP);
}
function paintLines() {
  $$('#lseg button').forEach(b => b.classList.toggle('on', +b.dataset.n === lines()));
  $$('#lines path').forEach((p, i) => p.classList.toggle('on', i < lines()));
  $$('.lm span').forEach(s => s.classList.toggle('on', +s.dataset.l <= lines()));
  paintBet();
}
function paintBtn(fz) {
  const go = $('#go'); go.disabled = busy; go.textContent = busy ? (fz ? 'FEVER…' : 'SPINNING…') : 'SPIN';
  go.classList.toggle('fz', !!fz);
  $$('#spd button,#lseg button').forEach(b => (b.disabled = busy)); bet.disable(busy);
}
// line markers (numbers = line ids 1..5)
$('#lmL').innerHTML = [[2, 4], [1], [3, 5]].map(r => `<div>${r.map(l => `<span data-l="${l}">${l}</span>`).join('')}</div>`).join('');
$('#lmR').innerHTML = [[2, 5], [1], [3, 4]].map(r => `<div>${r.map(l => `<span data-l="${l}">${l}</span>`).join('')}</div>`).join('');

/* ---------- fever meter ---------- */
$('#pips').innerHTML = '<i></i>'.repeat(E.FEVER_PIPS);
function paintPips(fresh) {
  $$('#pips i').forEach((p, i) => { p.classList.toggle('on', i < store.pips); p.classList.toggle('new', !!fresh && i === store.pips - 1); });
  $('#pipn').textContent = `${store.pips}/${E.FEVER_PIPS}`; $('#pipv').textContent = `${store.pips} / ${E.FEVER_PIPS}`;
}

/* ---------- reels ---------- */
const reelEls = $$('#reels .reel'), strips = reelEls.map(r => $('.strip', r));
const reduced = () => state.settings.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const pos = [0, 1, 2].map(i => (37 + i * 61) % E.STRIPS[i].length);
const shown = [[], [], []];
const keyAt = (r, st, fz) => E.symAt(r, st, fz);
function rest(i, stop, fz) {
  const ks = [-2, -1, 0, 1].map(d => keyAt(i, stop + d, fz));
  shown[i] = ks.slice(1);
  strips[i].getAnimations().forEach(a => a.cancel());
  strips[i].innerHTML = ks.map((k, j) => cellHTML(k, fz && E.symAt(i, stop + j - 2) === 'BL')).join('');
  strips[i].style.transform = 'translateY(-25%)';
}
pos.forEach((p, i) => rest(i, p, false));
const cellAt = (r, row) => strips[r].children[1 + row];

async function spinReels(res, fz, mul) {
  clearWins();
  const red = reduced(), m = (fz ? 0.6 : 1) * mul;
  const base = red ? 150 : 650 * m, gapT = red ? 60 : 260 * m;
  // anticipation: the first two reels already hold diamonds on an active line
  const actLines = E.LINES.slice(0, lines());
  const antic = !red && actLines.some(L => E.BY[res.grid[0][L[0]]].wild && E.BY[res.grid[1][L[1]]].wild);
  const times = [base, base + gapT, base + 2 * gapT + (antic ? 1300 * Math.max(0.7, mul) : 0)];
  sfx('spin');
  const tick = setInterval(() => sfx('spin'), 220);
  const anims = res.stops.map((t, i) => {
    const F = Math.max(6, Math.round(times[i] / (red ? 60 : 38)));
    const seq = [-2, -1, 0, 1].map(d => [keyAt(i, t + d, fz), fz && E.symAt(i, t + d) === 'BL']);
    for (let j = 0; j < F; j++) seq.push([keyAt(i, t + 2 + j, fz), false]);
    shown[i].forEach(k => seq.push([k, false]));
    const N = seq.length;
    strips[i].getAnimations().forEach(a => a.cancel());
    strips[i].innerHTML = seq.map(([k, z]) => cellHTML(k, z)).join('');
    const from = -(N - 3) / N * 100, to = -1 / N * 100;
    return strips[i].animate([{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
      { duration: times[i], easing: red ? 'linear' : 'cubic-bezier(.3,.08,.3,1.09)', fill: 'forwards' });
  });
  for (let i = 0; i < 3; i++) {
    if (i === 2 && antic) {
      await sleep(Math.max(0, times[2] - times[1] - 1300 * Math.max(0.7, mul)));
      reelEls[2].classList.add('antic'); sfx('rise'); buzz(15);
      $('#msg').textContent = 'Two diamonds lined up… come on, third!';
    }
    await anims[i].finished.catch(() => {});
    reelEls[i].classList.remove('antic');
    rest(i, res.stops[i], fz);
    sfx('stop'); buzz(8);
    const gems = res.grid[i].some(k => E.BY[k].wild);
    if (gems) { sfx('gem'); res.grid[i].forEach((k, r) => E.BY[k].wild && cellAt(i, r).classList.add('land')); }
  }
  clearInterval(tick);
}

function clearWins() {
  $('#reels').classList.remove('won');
  $$('#reels .cell.win').forEach(c => c.classList.remove('win'));
  $$('#lines path').forEach(p => p.classList.remove('hit'));
  $$('.lm span').forEach(s => s.classList.remove('hit'));
  litRows([]);
}
function showWins(res) {
  if (!res.lines.length) return;
  $('#reels').classList.add('won');
  const paths = $$('#lines path');
  for (const w of res.lines) {
    paths[w.line].classList.add('hit');
    $$(`.lm span[data-l="${w.line + 1}"]`).forEach(s => s.classList.add('hit'));
    w.cells.forEach(([r, row]) => cellAt(r, row).classList.add('win'));
  }
  litRows(res.lines.map(w => w.kind));
}
function winSay(res) {
  const best = res.lines.slice().sort((a, b) => b.pay - a.pay)[0];
  const name = { DL3: 'THREE LIME DIAMONDS! TOP AWARD!', D3: 'Three diamonds!', S7: 'Triple 7s!', B3: 'Triple 3-BAR!', B2: 'Triple 2-BAR!', B1: 'Triple 1-BAR!', ANYBAR: 'Any bars', CH3: 'Three cherries!', CH2: 'Two cherries', CH1: 'Cherry pays' }[best.kind];
  const mult = best.mult > 1 && best.kind !== 'D3' && best.kind !== 'DL3' ? ` · diamonds ×${best.mult}` : '';
  return `${name}${mult}${res.lines.length > 1 ? ` · ${res.lines.length} lines` : ''}`;
}

const SPIN_MSGS = ['Chrome spinning…', 'Ice cold, here we go.', 'Looking for that Lime…', 'Steppers rolling…', 'Feel the Fever…', 'Clunk, clunk, clunk…'];
const LOSE_MSGS = ['Blank stare. Again?', 'Cold reels. Warm them up.', 'Nothing on the line.', 'So close to frosty.', 'The diamonds are hiding.'];
const pick = a => a[Math.floor(Math.random() * a.length)];

let shownWin = 0;
function setWin(v, fz) {
  const el = $('#win');
  if (v <= 0) { el.className = 'wintxt zero'; el.textContent = fz ? 'FEVER SPIN' : 'NO WIN'; shownWin = 0; return; }
  el.className = 'wintxt';
  const from = shownWin; shownWin = v;
  tween(from, v, Math.min(1400, 300 + v / bet.value * 20), x => (el.textContent = 'WIN ' + fmtFull(x)));
}

async function banner(title, sub, ms) {
  $('#bant').textContent = title; $('#bans').textContent = sub;
  $('#bangems').innerHTML = ['DC', 'DM', 'DL'].map(icon).join('');
  $('#ban').classList.add('on'); await sleep(ms); $('#ban').classList.remove('on');
}

async function play() {
  if (busy) return;
  const n = lines(), lb = bet.value;
  busy = true; paintBtn();
  const round = await startRound('diamonds', lb * n);
  if (!round) { busy = false; paintBtn(); return; }
  const tb = round.bet, mul = SPEEDS[speed];
  let total = 0, best = 0, fsPlayed = 0, hitLines = 0;
  $('#msg').textContent = pick(SPIN_MSGS); setWin(0); $('#win').textContent = '···';

  const res = E.spin(await round.floats(3), n);
  await spinReels(res, false, mul);
  const baseWin = res.total * lb;
  total += baseWin; hitLines += res.lines.length;
  for (const w of res.lines) best = Math.max(best, w.pay * lb);
  showWins(res); setWin(total);
  if (res.lines.length) {
    $('#msg').textContent = winSay(res);
    sfx(res.total >= 10 * n ? 'big' : 'win'); buzz(20);
    const r = $('#reels').getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: res.total >= 5 * n ? 60 : 22, colors: ['#22f0ff', '#ff3dc8', '#b8ff3b', '#ffffff'], speed: 6, gravity: 0.18 });
  } else $('#msg').textContent = pick(LOSE_MSGS);

  if (res.pip) {
    store.pips++; store.sum += tb; paintPips(true); sfx('gem'); keep();
    if (store.pips >= E.FEVER_PIPS) {
      const stake = store.sum / store.pips, lineStake = stake / n;
      store.pips = 0; store.sum = 0; keep();
      await sleep(res.lines.length ? 900 : 500);
      sfx('rise'); buzz([40, 30, 80]);
      $('#stage').classList.add('fev'); paintBtn(true);
      await banner('FEVER!', `5 FEVER SPINS · BLANKS TURN TO CHERRIES · ${fmtFull(stake)} PER SPIN`, 1900);
      paintPips(); $('#fsban').classList.add('on');
      for (let k = 0; k < E.FEVER_SPINS; k++) {
        fsPlayed++; $('#fsn').textContent = fsPlayed;
        $('#msg').textContent = `Fever spin ${fsPlayed} of ${E.FEVER_SPINS}`;
        const fr = E.spin(await round.floats(3), n, true);
        await spinReels(fr, true, mul);
        const w = fr.total * lineStake;
        total += w; hitLines += fr.lines.length;
        for (const x of fr.lines) best = Math.max(best, x.pay * lineStake);
        showWins(fr);
        if (fr.lines.length) { setWin(total); $('#msg').textContent = `Fever spin ${fsPlayed}: ${winSay(fr)} +${fmtFull(w)}`; sfx('win'); buzz(12); }
        await sleep(fr.lines.length ? 900 : 400);
      }
      $('#fsban').classList.remove('on');
      clearWins();
      E.STRIPS.forEach((_, i) => rest(i, res.stops[i], false));
      await banner('FEVER OVER', `Fever spins paid ${fmtFull(Math.floor(total - baseWin))}`, 1500);
      $('#stage').classList.remove('fev');
      $('#msg').textContent = `Fever paid ${fmtFull(Math.floor(total - baseWin))}. Meter reset.`;
    }
  }

  if (best >= 25 * tb) unlock('diamonds');
  const payout = Math.floor(total);
  const out = round.settle(payout, { detail: `${n} line${n > 1 ? 's' : ''} · ${hitLines} winning line${hitLines === 1 ? '' : 's'}${fsPlayed ? ` · ${fsPlayed} fever spins` : ''}` });
  $('#last').textContent = payout ? fmtFull(payout) : '-';
  if (out) pushRecent($('#recent'), payout ? fmtX(out.mult) : '0×', out.mult >= 10 ? 'b' : payout > tb ? 'w' : '');
  busy = false; paintBtn();
}

$('#go').onclick = play;
$('#spd').onclick = e => { const b = e.target.closest('button'); if (!b || busy) return; sfx('tap'); speed = b.dataset.s; $$('#spd button').forEach(x => x.classList.toggle('on', x === b)); };
$('#lseg').onclick = e => { const b = e.target.closest('button'); if (!b || busy) return; sfx('tap'); store.lines = +b.dataset.n; keep(); paintLines(); };
addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName)) { e.preventDefault(); play(); } });

const ice = $('#ice');
for (let i = 0; i < 26; i++) { const s = document.createElement('i'); s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:-${Math.random() * 3}s;animation-duration:${2 + Math.random() * 3}s`; ice.appendChild(s); }
paintLines(); paintPips(); paintBtn();
if (store.pips >= 7) toast(`Fever meter at ${store.pips}/10. Almost there!`, 'p');
