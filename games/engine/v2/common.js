/* slots-v2 common engine core — pure logic, no DOM.
 * Works in browser (ES module) and Node.
 * Contains: seeded RNG, payline tables, reel-stop helper,
 * line evaluator (left-to-right, wild substitution), cluster evaluator.
 */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 30 paylines, 5 reels x 3 rows. Row indexes: 0=top,1=mid,2=bot.
export const PAYLINES_30 = [
  [0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],
  [0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,2,2],[2,2,1,0,0],[0,1,1,1,0],[2,1,1,1,2],
  [1,0,0,0,1],[1,2,2,2,1],[0,1,0,1,0],[2,1,2,1,2],
  [1,0,1,0,1],[1,2,1,2,1],[0,0,1,0,0],[2,2,1,2,2],
  [0,1,2,2,2],[2,1,0,0,0],[2,2,2,1,0],[0,0,0,1,2],
  [1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],
  [1,0,2,0,1],[1,2,0,2,1],[0,2,2,2,0],[2,0,0,0,2],[0,1,1,2,2]
];

// Standard 20-line set for the classic 5x3 games.
export const PAYLINES_20 = [
  [0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],
  [0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,2,2],[2,2,1,0,0],[0,1,1,1,0],[2,1,1,1,2],
  [1,0,0,0,1],[1,2,2,2,1],[0,1,0,1,0],[2,1,2,1,2],
  [1,0,1,0,1],[1,2,1,2,1],[0,0,1,0,0],[2,2,1,2,2],
  [0,1,2,2,2],[2,1,0,0,0],[1,1,0,2,2]
];

/* Stop one reel: returns `rows` symbols from a weighted strip.
 * strip: array of symbol ids (weight = repetition).
 */
export function stopReel(strip, rows, rnd) {
  var idx = Math.floor(rnd() * strip.length);
  var out = [];
  for (var r = 0; r < rows; r++) out.push(strip[(idx + r) % strip.length]);
  return out;
}

// grid: grid[reel][row]. syms: {id:{wild?,pays:{'3':m,'4':m,'5':m}}}, pays are LINE-BET multiples.
// Left-to-right, wilds substitute, HIGHEST win per line pays.
// Win: {line, symbol, count, coins, cells:[[reel,row],...]}
export function evalLines(grid, lines, lineBet, syms) {
  var wildId = null;
  for (var id in syms) if (syms[id].wild) { wildId = id; break; }
  var wins = [], total = 0;
  function consider(lineNo, line, symbol, count) {
    if (count < 3 || symbol === null) return;
    var mult = (syms[symbol] && syms[symbol].pays && syms[symbol].pays[String(count)]) || 0;
    if (!mult) return;
    var coins = mult * lineBet;
    var cells = [];
    for (var r = 0; r < count; r++) cells.push([r, line[r]]);
    return { line: lineNo, symbol: symbol, count: count, coins: coins, cells: cells };
  }
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li];
    var seq = [];
    for (var r = 0; r < 5; r++) seq.push(grid[r][line[r]]);
    var best = null;
    if (wildId) {
      var wildRun = 0;
      while (wildRun < 5 && seq[wildRun] === wildId) wildRun++;
      var w = consider(li + 1, line, wildId, wildRun);
      if (w) best = w;
    }
    var target = null, count = 0;
    for (var rr = 0; rr < 5; rr++) {
      var s = seq[rr];
      if (target === null) {
        if (wildId && s === wildId) { count++; continue; }
        target = s; count++; continue;
      }
      if (s === target || (wildId && s === wildId)) count++;
      else break;
    }
    var t = consider(li + 1, line, target, count);
    if (t && (!best || t.coins > best.coins)) best = t;
    if (best) { wins.push(best); total += best.coins; }
  }
  return { wins: wins, total: total };
}

// Count scatter symbols anywhere on a grid. grid[reel][row].
export function countScatter(grid, syms) {
  var n = 0;
  for (var r = 0; r < grid.length; r++)
    for (var row = 0; row < grid[r].length; row++)
      if (syms[grid[r][row]] && syms[grid[r][row]].scatter) n++;
  return n;
}

/* Ways evaluation (variable rows per reel, left-to-right, no lines).
 * grid[reel] = array of symbol ids, top row first; rows may vary per reel.
 * syms: {id:{wild?, pays:{'2':m,'3':m,...}}} — pays in TOTAL-BET multiples per way.
 * maxWays: normalization constant (e.g. 117649).
 * Returns {wins:[{symbol,length,ways,coins,cells:[[reel,row],...]}], total}.
 * Convention: wilds substitute; all-wild runs pay the wild table.
 */
export function evalWays(grid, syms, bet, maxWays, wildId) {
  var W = grid.length;
  var counts = {}; // counts[reel][symbolId] = n
  var ids = [];
  for (var id in syms) ids.push(id);
  for (var r = 0; r < W; r++) {
    counts[r] = {};
    for (var i = 0; i < grid[r].length; i++) {
      var s = grid[r][i];
      counts[r][s] = (counts[r][s] || 0) + 1;
    }
  }
  function matchCount(r, s) {
    return (counts[r][s] || 0) + (wildId && s !== wildId ? (counts[r][wildId] || 0) : 0);
  }
  var wins = [], total = 0;
  for (var k = 0; k < ids.length; k++) {
    var s = ids[k];
    if (syms[s].scatter) continue;
    var pays = syms[s].pays || {};
    var run = 0, ways = 1;
    for (var rr = 0; rr < W; rr++) {
      var mc = matchCount(rr, s);
      if (mc <= 0) break;
      run++; ways *= mc;
      var mult = pays[String(run)];
      if (run >= 2 && mult) {
        var coins = mult * bet * ways / maxWays;
        var cells = [];
        for (var cr = 0; cr < run; cr++)
          for (var cc = 0; cc < grid[cr].length; cc++) {
            var cs = grid[cr][cc];
            if (cs === s || (wildId && cs === wildId)) cells.push([cr, cc]);
          }
        wins.push({ symbol: s, length: run, ways: ways, coins: coins, cells: cells });
        total += coins;
      }
    }
  }
  return { wins: wins, total: total };
}

/* Cells participating in ways wins (for cascade removal): all cells on reels
 * 0..maxLen-1 that are the winning symbol or wild. wins: from evalWays.
 * Returns a Set of "r,c" keys (union across all wins).
 */
export function waysWinCells(grid, wins, wildId) {
  var set = new Set();
  for (var i = 0; i < wins.length; i++) {
    var w = wins[i];
    for (var r = 0; r < w.length; r++) {
      for (var c = 0; c < grid[r].length; c++) {
        var s = grid[r][c];
        if (s === w.symbol || (wildId && s === wildId)) set.add(r + ',' + c);
      }
    }
  }
  return set;
}

/* Remove cells (Set of "r,c") from each reel column, collapse downward,
 * refill from the top via fill(r, i). Returns the new grid (arrays top-first).
 */
export function removeAndDrop(grid, removedSet, fill) {
  var ng = [];
  for (var r = 0; r < grid.length; r++) {
    var col = [];
    for (var c = 0; c < grid[r].length; c++)
      if (!removedSet.has(r + ',' + c)) col.push(grid[r][c]);
    var need = grid[r].length - col.length;
    var top = [];
    for (var i = 0; i < need; i++) top.push(fill(r, i));
    ng.push(top.concat(col));
  }
  return ng;
}

/* Cluster evaluation on a WxH grid: grid[reel][row], 8+ orthogonal-adjacent
 * matching symbols pay. pays: {symbolId: {8: m, 9: m, ...}} in TOTAL-BET multiples
 * where the key is minimum cluster size and the value steps by size bucket.
 * Returns {clusters:[{symbol,size,coins,cells:[[r,row],...]}], total}.
 */
export function evalClusters(grid, pays, bet, wildId) {
  var W = grid.length, H = grid[0].length;
  var seen = [], clusters = [], total = 0;
  for (var i = 0; i < W; i++) { seen.push([]); for (var j = 0; j < H; j++) seen[i].push(false); }
  function symAt(r, c) { return grid[r][c]; }
  for (var r = 0; r < W; r++) for (var c = 0; c < H; c++) {
    if (seen[r][c]) continue;
    var s = symAt(r, c);
    if (wildId && s === wildId) continue;
    // flood fill
    var cells = [], stack = [[r, c]], q = [[r, c]];
    seen[r][c] = true;
    while (stack.length) {
      var cell = stack.pop();
      var cr = cell[0], cc = cell[1];
      cells.push([cr, cc]);
      var nb = [[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]];
      for (var k = 0; k < 4; k++) {
        var nr = nb[k][0], nc = nb[k][1];
        if (nr < 0 || nr >= W || nc < 0 || nc >= H || seen[nr][nc]) continue;
        var ns = symAt(nr, nc);
        if (ns === s || (wildId && ns === wildId)) { seen[nr][nc] = true; stack.push([nr, nc]); }
      }
    }
    if (cells.length >= 8) {
      var p = pays[s] || {};
      var m = p['8'] || 0;
      if (cells.length >= 10) m = p['10'] || m;
      if (cells.length >= 12) m = p['12'] || m;
      if (cells.length >= 15) m = p['15'] || m;
      if (cells.length >= 20) m = p['20'] || m;
      if (m > 0) {
        var coins = m * bet;
        clusters.push({ symbol: s, size: cells.length, coins: coins, cells: cells });
        total += coins;
      }
    }
  }
  return { clusters: clusters, total: total };
}
