/* slots-v2 presentation helper — shared by all v2 slot pages.
 * DOM-node reuse: grids are built once; spins only swap <use> hrefs and classes.
 * All animation is transform/opacity, cancellable, reduced-motion aware.
 */
import { $, $$, h, sleep, tween, sfx, buzz, modal, fmtFull } from '../../core/ag.js';
import { createGamble } from './engine/v2/gamble.js';
export const RED = () =>
  document.body.classList.contains('red') ||
  (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* Engines export SYMBOLS either as {id: def} or [{id, ...def}]. Normalize to {id: def}. */
export function symMap(SYMBOLS) {
  if (Array.isArray(SYMBOLS)) {
    const m = {};
    for (const d of SYMBOLS) if (d && d.id) m[d.id] = d;
    return m;
  }
  return SYMBOLS || {};
}

export function installRedHook() {
  if (RED()) document.body.classList.add('red');
}

/* Build a WxH grid of reusable cells. icon(id) -> svg inner markup string.
 * Returns {wrap, set(r,c,id,cls), get(r,c), cells, clearMarks(), dimAll(), undim()}.
 * Each cell keeps ONE inner .fill div; spins replace its innerHTML + class.
 */
export function buildGrid(wrap, W, H, icon) {
  wrap.innerHTML = '';
  wrap.style.gridTemplateColumns = `repeat(${W},1fr)`;
  const cells = [];
  for (let r = 0; r < W; r++) {
    const col = h(`<div class="s2-col"></div>`);
    const colCells = [];
    for (let c = 0; c < H; c++) {
      const cell = h(`<div class="s2-cell"><div class="fill"></div></div>`);
      col.appendChild(cell);
      colCells.push(cell);
    }
    wrap.appendChild(col);
    cells.push(colCells);
  }
  const fillOf = (r, c) => cells[r][c].firstChild;
  return {
    wrap, cells,
    set(r, c, id, anim) {
      const cell = cells[r][c], fill = fillOf(r, c);
      fill.innerHTML = icon(id);
      cell.className = 's2-cell' + (anim ? ' ' + anim : '');
      cell.dataset.sym = id;
    },
    mark(r, c, cls) { cells[r][c].classList.add(cls); },
    clearMarks() {
      for (const col of cells) for (const cell of col)
        cell.classList.remove('win', 'dim', 'lock', 'new', 'drop', 'pop');
    },
    dimExcept(keys) {
      const keep = new Set(keys.map(k => k[0] + ',' + k[1]));
      for (let r = 0; r < cells.length; r++)
        for (let c = 0; c < cells[r].length; c++)
          if (!keep.has(r + ',' + c)) cells[r][c].classList.add('dim');
    },
    paintGrid(grid, anim) {
      for (let r = 0; r < grid.length; r++)
        for (let c = 0; c < grid[r].length; c++)
          this.set(r, c, grid[r][c], anim);
    },
  };
}

/* Count-up win display. */
export function countWin(box, amtEl, msg, coins, ms = 600) {
  box.classList.toggle('on', coins > 0);
  $('#winmsg').textContent = msg;
  if (RED() || ms <= 0) { amtEl.textContent = fmtFull(coins); return Promise.resolve(); }
  return tween(0, coins, ms, v => { amtEl.textContent = fmtFull(v); }).catch(() => {});
}

/* Full-stage overlay banner. Returns a promise resolving on tap/timeout. */
export function banner(stage, { kicker, title, sub, foot = 'Tap to continue', ms = 1600, picks = null, wheel = null }) {
  const ov = $('.s2-overlay', stage);
  let inner = `<div><div class="k">${kicker}</div><div class="t">${title}</div>`;
  if (sub) inner += `<div class="s">${sub}</div>`;
  if (picks) inner += `<div class="s2-picks">${picks}</div>`;
  if (wheel) inner += `<div class="s2-wheel"><div class="ptr"></div>${wheel}</div>`;
  inner += `<div class="f">${foot}</div></div>`;
  ov.innerHTML = inner;
  ov.classList.add('on');
  return new Promise(res => {
    let done = false;
    const end = () => { if (done) return; done = true; ov.classList.remove('on'); ov.onclick = null; res(); };
    ov.onclick = end;
    if (!picks) sleep(ms).then(end);
  });
}
export function hideBanner(stage) {
  const ov = $('.s2-overlay', stage);
  ov.classList.remove('on'); ov.onclick = null;
}

/* Spin-button + autoplay state painter. */
export function makeSpinner({ spinBtn, autoBtn, segBtns, isBusy, getAuto, setAuto }) {
  return function paint() {
    const n = getAuto();
    if (n > 0) {
      spinBtn.textContent = `STOP · ${n}`;
      spinBtn.classList.add('auto'); spinBtn.disabled = false;
      if (autoBtn) { autoBtn.textContent = 'Stop'; autoBtn.disabled = false; }
    } else {
      spinBtn.textContent = 'SPIN'; spinBtn.classList.remove('auto');
      spinBtn.disabled = isBusy();
      if (autoBtn) { autoBtn.textContent = 'Auto'; autoBtn.disabled = isBusy(); }
    }
    if (segBtns) segBtns.forEach(b => { b.disabled = isBusy() || n > 0; });
  };
}

/* Staggered reel-stop animation using WAAPI on the column elements.
 * onStop(r) called as each reel lands. Cheap: one transform per column.
 */
export async function reelStops(cols, order, { turbo = false, stagger = 130, dur = 260, onStop = null } = {}) {
  const red = RED();
  const jobs = order.map((r, i) => (async () => {
    const el = cols[r];
    if (!red) {
      const d = dur + (turbo ? 0 : i * stagger);
      el.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(14px)' }, { transform: 'translateY(0)' }],
        { duration: d, easing: 'cubic-bezier(.3,.7,.4,1)' }
      );
      await sleep(turbo ? 120 + i * 40 : 200 + i * stagger);
    } else {
      await sleep(60 + i * 30);
    }
    if (onStop) onStop(r);
  })());
  await Promise.all(jobs);
}

/* Gamble modal (shared). onPick(win:boolean) resolves the round.
 * Returns a promise resolving true if the player gambled and won, false if lost or declined.
 */
export function gambleModal(currentWin, { maxSteps = 5, capMult = 1000, bet = 0 } = {}) {
  let amount = Math.floor(currentWin), step = 0, done = false;
  const cap = bet > 0 ? bet * capMult : Infinity;
  const gamble = createGamble();
  return modal(`<h2 style="margin-top:0">Gamble your win?</h2><div class="s2-gamble" id="gbox"></div>`,
    { actions: [], dismiss: false,
      onOpen: (m, close) => {
        const box = m.querySelector('#gbox');
        const finish = v => { if (!done) { done = true; close(v); } };
        function render(msg, reveal) {
          const can = step < maxSteps && amount * 2 <= cap;
          box.innerHTML = `
            <div style="font:800 12px system-ui;letter-spacing:.25em;color:var(--s2-gold)">GAMBLE</div>
            <div style="font:900 30px ui-monospace,monospace">${fmtFull(amount)}</div>
            <div style="font:600 13px system-ui;color:var(--s2-dim)">${msg}</div>
            ${reveal ? `<div style="font:900 22px system-ui;color:${reveal.win ? '#3ddc97' : '#ff5a5a'}">${reveal.win ? 'WON' : 'LOST'} · ${reveal.card}</div>` : ''}
            <div class="cards">
              <button class="s2-gcard red" data-c="red" ${can ? '' : 'disabled'}><span>RED</span><small>double or nothing</small></button>
              <button class="s2-gcard black" data-c="black" ${can ? '' : 'disabled'}><span>BLACK</span><small>double or nothing</small></button>
            </div>
            <button class="btn" data-c="collect" style="min-height:48px">Collect ${fmtFull(amount)}</button>
            ${!can && !reveal ? '<div style="font:600 12px system-ui;color:var(--s2-faint)">Limit reached — collect your win</div>' : ''}`;
          box.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => pick(b.dataset.c)));
        }
        function pick(c) {
          if (done) return;
          if (c === 'collect') { finish({ collected: amount, steps: step }); return; }
          const win = gamble.flip();
          const suit = win ? (c === 'red' ? '♥' : '♠') : (c === 'red' ? '♠' : '♥');
          const card = suit + ' ' + ['A', 'K', 'Q', 'J', '10', '9'][Math.floor(Math.random() * 6)];
          if (win) { amount *= 2; step++; sfx('win'); render(`Step ${step} — go again?`, { win: true, card }); }
          else { sfx('lose'); render('', { win: false, card }); setTimeout(() => finish({ collected: 0, steps: step, lost: true }), 950); }
        }
        render('Red or black — double it, or collect.');
      } });
}
