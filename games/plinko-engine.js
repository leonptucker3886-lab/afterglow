// Starfall Plinko: pure game logic shared by the browser game and the node RTP check.
// Each table is symmetric: index = number of "right" bounces (0..rows). Edges hot, centre cold.
// Every table's RTP (binomial expectation) sits in the 98.5-99.5% band; run `node games/plinko-engine.js` to verify.
export const ROWS_MIN = 8, ROWS_MAX = 16;
export const RISKS = ['low', 'medium', 'high'];

export const TABLES = {
  low: {
    8: [5.6, 3.2, 1.4, 0.7, 0.5, 0.7, 1.4, 3.2, 5.6],
    9: [6, 3.6, 1.9, 1, 0.5, 0.5, 1, 1.9, 3.6, 6],
    10: [8, 4.9, 2.6, 1.2, 0.6, 0.5, 0.6, 1.2, 2.6, 4.9, 8],
    11: [9, 5.8, 3.3, 1.6, 0.8, 0.5, 0.5, 0.8, 1.6, 3.3, 5.8, 9],
    12: [10, 6.4, 3.8, 2, 1.1, 0.6, 0.5, 0.6, 1.1, 2, 3.8, 6.4, 10],
    13: [11, 7.4, 4.4, 2.7, 1.5, 0.7, 0.5, 0.5, 0.7, 1.5, 2.7, 4.4, 7.4, 11],
    14: [12, 8.2, 5.3, 3.1, 1.9, 0.9, 0.6, 0.5, 0.6, 0.9, 1.9, 3.1, 5.3, 8.2, 12],
    15: [14, 9.8, 6.5, 3.9, 2.4, 1.2, 0.7, 0.5, 0.5, 0.7, 1.2, 2.4, 3.9, 6.5, 9.8, 14],
    16: [16, 11, 7.6, 4.9, 2.8, 1.6, 0.8, 0.6, 0.5, 0.6, 0.8, 1.6, 2.8, 4.9, 7.6, 11, 16],
  },
  medium: {
    8: [13, 4.4, 1.3, 0.5, 0.4, 0.5, 1.3, 4.4, 13],
    9: [17, 6.7, 2.1, 0.6, 0.4, 0.4, 0.6, 2.1, 6.7, 17],
    10: [21, 8.8, 3.2, 1, 0.4, 0.4, 0.4, 1, 3.2, 8.8, 21],
    11: [26, 12, 4.7, 1.5, 0.5, 0.4, 0.4, 0.5, 1.5, 4.7, 12, 26],
    12: [33, 16, 6.5, 2.4, 0.7, 0.4, 0.4, 0.4, 0.7, 2.4, 6.5, 16, 33],
    13: [42, 22, 8.9, 3.2, 1.1, 0.5, 0.4, 0.4, 0.5, 1.1, 3.2, 8.9, 22, 42],
    14: [56, 28, 13, 4.9, 1.6, 0.6, 0.4, 0.4, 0.4, 0.6, 1.6, 4.9, 13, 28, 56],
    15: [80, 40, 18, 7.2, 2.5, 0.8, 0.4, 0.4, 0.4, 0.4, 0.8, 2.5, 7.2, 18, 40, 80],
    16: [110, 56, 26, 10, 3.7, 1.1, 0.5, 0.4, 0.4, 0.4, 0.5, 1.1, 3.7, 10, 26, 56, 110],
  },
  high: {
    8: [29, 6.4, 1, 0.2, 0.2, 0.2, 1, 6.4, 29],
    9: [42, 11, 1.7, 0.3, 0.2, 0.2, 0.3, 1.7, 11, 42],
    10: [70, 18, 3.1, 0.4, 0.2, 0.2, 0.2, 0.4, 3.1, 18, 70],
    11: [110, 29, 5.4, 0.8, 0.2, 0.2, 0.2, 0.2, 0.8, 5.4, 29, 110],
    12: [170, 46, 9.4, 1.3, 0.3, 0.2, 0.2, 0.2, 0.3, 1.3, 9.4, 46, 170],
    13: [260, 73, 16, 2.5, 0.4, 0.2, 0.2, 0.2, 0.2, 0.4, 2.5, 16, 73, 260],
    14: [400, 115, 27, 4.7, 0.6, 0.2, 0.2, 0.2, 0.2, 0.2, 0.6, 4.7, 27, 115, 400],
    15: [620, 180, 44, 7.9, 1.1, 0.3, 0.2, 0.2, 0.2, 0.2, 0.3, 1.1, 7.9, 44, 180, 620],
    16: [1000, 295, 73, 14, 2, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 2, 14, 73, 295, 1000],
  },
};

export const table = (rows, risk) => TABLES[risk][rows];

// floats: one fair float per row. f < 0.5 -> left (0), otherwise right (1). Slot = number of rights.
export function pathOf(floats) {
  const dirs = floats.map(f => (f < 0.5 ? 0 : 1));
  return { dirs, slot: dirs.reduce((a, b) => a + b, 0) };
}

export function resolve(floats, rows, risk) {
  const { dirs, slot } = pathOf(floats.slice(0, rows));
  const mult = TABLES[risk][rows][slot];
  return { dirs, slot, mult, edge: slot === 0 || slot === rows };
}

// Total returned to the player (stake included). Rounded first to dodge float noise (100 * 0.7 etc).
export const payoutFor = (bet, mult) => Math.floor(Math.round(bet * mult * 1e6) / 1e6);

export function binom(n) {
  const p = []; let c = 1;
  for (let k = 0; k <= n; k++) { p.push(c / 2 ** n); c = (c * (n - k)) / (k + 1); }
  return p;
}
export const rtpOf = (rows, risk) => binom(rows).reduce((a, p, k) => a + p * TABLES[risk][rows][k], 0);

// node games/plinko-engine.js  -> binomial RTP table + Monte Carlo of the exact payout logic.
if (typeof process !== 'undefined' && process.argv?.[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const { randomBytes } = await import('node:crypto');
  console.log('rows | ' + RISKS.map(r => r.padStart(8)).join(' | ') + ' | edge×');
  let ok = true;
  for (let n = ROWS_MIN; n <= ROWS_MAX; n++) {
    const cells = RISKS.map(r => {
      const t = TABLES[r][n], x = rtpOf(n, r) * 100;
      const sym = t.every((v, i) => v === t[n - i]);
      const mono = t.slice(0, Math.floor(n / 2) + 1).every((v, i, a) => !i || v <= a[i - 1]);
      if (x < 98.5 || x > 99.5 || !sym || !mono || t.length !== n + 1) ok = false;
      return (x.toFixed(3) + '%').padStart(8);
    });
    console.log(String(n).padStart(4) + ' | ' + cells.join(' | ') + ' | ' + RISKS.map(r => TABLES[r][n][0]).join('/'));
  }
  console.log(ok ? 'All 27 tables symmetric, monotonic, RTP in 98.5-99.5%.' : 'FAIL: a table is out of band.');
  // Monte Carlo: 1M rounds per risk at random rows, bet 100, crypto floats, exact payoutFor.
  const N = +(process.argv[2] || 1e6);
  for (const risk of RISKS) {
    let bet = 0, paid = 0; const buf = randomBytes(N * 16 * 4);
    for (let i = 0; i < N; i++) {
      const rows = ROWS_MIN + (i % 9), fl = [];
      for (let j = 0; j < rows; j++) fl.push(buf.readUInt32LE((i * 16 + j) * 4) / 4294967296);
      bet += 100; paid += payoutFor(100, resolve(fl, rows, risk).mult);
    }
    console.log(`Monte Carlo ${risk.padEnd(6)} ${N.toLocaleString()} rounds: RTP ${(paid / bet * 100).toFixed(3)}%`);
  }
}
