// Sun N Fun: 3×3, 5 paylines, scatter free spins, progressive jackpot. Pure logic, shared with the sim.
export const SYMS = [
  { id: 'cigarette', e: '🚬', name: 'Lucky Strike', w: 28, p3: 2.5 },
  { id: 'needle', e: '💉', name: 'Needle', w: 22, p3: 4 },
  { id: 'beer', e: '🍺', name: 'Cold One', w: 16, p3: 7 },
  { id: 'dog', e: '🐕', name: "Ol' Hound Dog", w: 12, p3: 12 },
  { id: 'cops', e: '🚔', name: 'Cops & Robbers', w: 10, p3: 20 },
  { id: 'camper', e: '🏕️', name: 'Pop-Up Camper', w: 6, p3: 40 },
  { id: 'truck', e: '🛻', name: 'Rusty Beater Truck', w: 4, p3: 80 },
  { id: 'bra', e: '👙', name: 'Bra (Scatter)', w: 2, p3: 0, scatter: true },
];
export const PAYLINES = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
export const FS_AWARD = 10, JP_CHANCE = 0.10, JP_RATE = 0.02, JP_SEED = 25000;
const TOTAL_W = SYMS.reduce((a, s) => a + s.w, 0);

export function pick(f) {
  let x = f * TOTAL_W;
  for (const s of SYMS) { if ((x -= s.w) < 0) return s; }
  return SYMS[SYMS.length - 1];
}
// 9 floats -> grid[reel][row]
export const gridFrom = f => [0, 1, 2].map(r => [0, 1, 2].map(row => pick(f[r * 3 + row])));

export function evaluate(grid, bet) {
  let total = 0, scatter = 0, fs = 0, truckLine = false;
  const lines = [];
  PAYLINES.forEach((pl, i) => {
    const [a, b, c] = pl.map((row, reel) => grid[reel][row]);
    if (!a.scatter && a.id === b.id && b.id === c.id) { total += bet * a.p3; lines.push(i); if (a.id === 'truck') truckLine = true; }
  });
  for (const reel of grid) for (const s of reel) if (s.scatter) scatter++;
  if (scatter >= 3) { total += bet * 10; fs = FS_AWARD; } else if (scatter === 2) total += bet * 2;
  return { total, lines, scatter, fs, truckLine };
}
