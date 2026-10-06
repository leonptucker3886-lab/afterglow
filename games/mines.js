import { boot, $, $$, BetControl, gameHeader, startRound, shuffle, sfx, buzz, burst, pushRecent, fmtFull, fmtX, unlock, sleep } from '/core/ag.js';

boot({ nav: 'games' });
const EDGE = 0.99, N = 25;
const GEM = '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="#22f0ff" style="filter:drop-shadow(0 0 6px #22f0ff)"/><path d="M2 9h20M9 3l3 18 3-18" stroke="#0b3a44" stroke-width="1.2" fill="none"/></svg>';
const VOID = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#0b0b18" stroke="#ff4d6d" stroke-width="2.5" style="filter:drop-shadow(0 0 8px #ff4d6d)"/><circle cx="12" cy="12" r="3" fill="#ff4d6d"/></svg>';

gameHeader($('#panel'), { title: 'Void Mines', rules: `<p>Pick how many voids hide in the 5×5 grid, place your bet, then flip tiles.</p><p>Every gem raises your multiplier. Cash out any time to bank it. Hit a void and the round is lost.</p><p>Multiplier after <i>k</i> gems with <i>m</i> voids = 0.99 × the inverse odds of surviving <i>k</i> picks. House edge 1% (99% RTP).</p>` });
const bet = BetControl($('#panel'), { game: 'mines' });
$('#panel').insertBefore(bet.el, $('#panel .field'));

let mines = 3, round = null, layout = null, picks = 0, busy = false;
const grid = $('#grid');
for (let i = 0; i < N; i++) grid.insertAdjacentHTML('beforeend', `<button class="tile idle" data-i="${i}" aria-label="Tile ${i + 1}" disabled></button>`);
const tiles = $$('.tile', grid);

export const multAt = (k, m) => { let x = EDGE; for (let i = 0; i < k; i++) x *= (N - i) / (N - m - i); return x; };

function paint() {
  const cur = picks ? multAt(picks, mines) : 1;
  $('#mult').textContent = fmtX(cur);
  $('#cash').textContent = round && picks ? fmtFull(round.bet * cur) : '0';
  $('#found').textContent = picks;
  $('#nextm').textContent = picks < N - mines ? fmtX(multAt(picks + 1, mines)) : '-';
  const go = $('#go');
  if (round) { go.textContent = picks ? `Cash out ${fmtFull(round.bet * cur)}` : 'Pick a tile'; go.className = 'btn big lime'; go.disabled = !picks || busy; }
  else { go.textContent = 'Bet'; go.className = 'btn big pri'; go.disabled = false; }
  $('#rand').disabled = !round || busy;
  $$('#mseg button').forEach(b => (b.disabled = !!round));
  bet.disable(!!round);
}

$('#mseg').onclick = e => { const b = e.target.closest('button'); if (!b || round) return; sfx('tap'); mines = +b.dataset.m; $$('#mseg button').forEach(x => x.classList.toggle('on', x === b)); paint(); };

$('#go').onclick = async () => {
  if (busy) return;
  if (round) return cashOut();
  busy = true;
  const r = await startRound('mines', bet.value);
  busy = false;
  if (!r) return;
  sfx('bet');
  round = r; picks = 0;
  const order = shuffle([...Array(N).keys()], await r.floats(N - 1));
  layout = new Set(order.slice(0, mines));
  tiles.forEach(t => { t.className = 'tile'; t.innerHTML = ''; t.disabled = false; });
  paint();
};

grid.onclick = e => { const t = e.target.closest('.tile'); if (t && !t.disabled) reveal(+t.dataset.i); };
$('#rand').onclick = () => { const open = tiles.filter(t => !t.disabled); if (open.length) reveal(+open[Math.floor(Math.random() * open.length)].dataset.i); };

async function reveal(i) {
  if (!round || busy) return;
  const t = tiles[i]; t.disabled = true;
  if (layout.has(i)) {
    busy = true; t.className = 'tile void'; t.innerHTML = VOID; sfx('boom'); buzz([60, 40, 90]);
    $('#grid').classList.add('shake'); setTimeout(() => $('#grid').classList.remove('shake'), 400);
    await sleep(350); showAll(i);
    round.settle(0, { mult: 0, detail: `${mines} voids · ${picks} gems · hit void` });
    pushRecent($('#recent'), '0.00×'); end(); return;
  }
  picks++; t.className = 'tile gem'; t.innerHTML = GEM; sfx('gem'); buzz(10);
  const r = t.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, { count: 14, colors: ['#22f0ff', '#b8ff3b'], speed: 5, gravity: 0.15 });
  if (picks >= 10) unlock('mines');
  paint();
  if (picks === N - mines) cashOut();
}

function cashOut() {
  if (!round || !picks) return;
  const m = multAt(picks, mines);
  sfx('cash'); showAll(-1);
  round.settle(round.bet * m, { mult: m, detail: `${mines} voids · ${picks} gems · cashed out` });
  pushRecent($('#recent'), fmtX(m), m >= 10 ? 'b' : 'w'); end();
}

function showAll(hit) {
  tiles.forEach((t, j) => { t.disabled = true; if (t.classList.contains('gem') || j === hit) return; t.className = 'tile dim ' + (layout.has(j) ? 'void' : 'gem'); t.innerHTML = layout.has(j) ? VOID : GEM; });
}
function end() { round = null; busy = false; paint(); }
paint();
