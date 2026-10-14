/* Slot engine — one generic engine, per-game JSON config.
 * Pure logic, no DOM. Works in browser (script tag) and Node.
 *
 * Config schema:
 *   id, name, rtpTarget, volatility
 *   reels, rows (5x3), paylines: "PAYLINES_30"
 *   symbols: { id: { wild?, scatter?, expand?, pays: {"3":n,"4":n,"5":n} (line-bet multiples),
 *                      awardBetMult: {"3":n,...} (total-bet multiples), freeSpins: {"3":n,...} } }
 *   reelStrips: 5 arrays of symbol ids (weighted by repetition)
 *   freeSpins: { choices: [[spins, mult], ...], retrigger: true }
 *   pity: { deadSpins: 25, baseChance: 0.10, perSpin: 0.05 }   // invisible, retention-positive
 *   newGameBoost: { spins: 20, rerollChance: 0.35 }            // first-session dopamine
 *
 * API:
 *   var g = SlotEngine.createGame(config);
 *   var r = g.spin(bet);            // base spin, bet = total bet in coins
 *   g.chooseFreeSpins(i);           // after a trigger with pendingChoice
 *   var f = g.spinFree();           // one free spin (no wager)
 */
(function (root) {
  'use strict';

  var PAYLINES = root.PAYLINES_30;
  if (!PAYLINES) throw new Error('slot-engine needs PAYLINES_30 loaded first');

  function rnd() { return Math.random(); }

  function createGame(cfg) {
    var strips = cfg.reelStrips;
    var syms = cfg.symbols;
    var lineBet = function (bet) { return bet / PAYLINES.length; };

    var state = {
      spinCount: 0,
      deadSpins: 0,
      fsRemaining: 0,
      fsMult: 1,
      fsTotal: 0
    };

    function stopReel(reel) {
      var strip = strips[reel];
      var idx = Math.floor(rnd() * strip.length);
      return [strip[idx], strip[(idx + 1) % strip.length], strip[(idx + 2) % strip.length]];
    }

    // Force a scatter into the middle row of one reel (pity nudge).
    function forceScatter(reel) {
      var strip = strips[reel];
      var ids = [];
      for (var i = 0; i < strip.length; i++) {
        if (syms[strip[i]] && syms[strip[i]].scatter) ids.push(i);
      }
      if (!ids.length) return null;
      var idx = ids[Math.floor(rnd() * ids.length)];
      // middle row (row 1) = strip[idx+1] -> stop at idx
      return [strip[idx], strip[(idx + 1) % strip.length], strip[(idx + 2) % strip.length]];
    }

    // Standard line eval: left-to-right, wilds substitute, highest win per line.
    function evalLine(grid, line, lb) {
      var target = null, count = 0;
      for (var r = 0; r < 5; r++) {
        var s = grid[r][line[r]];
        var def = syms[s] || {};
        if (target === null) {
          if (def.wild) { count++; continue; }
          target = s; count++; continue;
        }
        if (s === target || def.wild) count++;
        else break;
      }
      if (count < 3) return null;
      if (target === null) target = 'wild'; // all-wild line pays as wild
      var pays = (syms[target] && symDefs(target).pays) || {};
      var mult = pays[String(count)];
      if (!mult) return null;
      return { symbol: target, count: count, coins: mult * lb };
    }

    function symDefs(id) { return syms[id] || {}; }

    function evalSpin(grid, bet, mult) {
      var lb = lineBet(bet) * mult;
      var lineWins = [];
      var winCoins = 0;
      for (var li = 0; li < PAYLINES.length; li++) {
        var w = evalLine(grid, PAYLINES[li], lb);
        if (w) {
          w.line = li + 1;
          lineWins.push(w);
          winCoins += w.coins;
        }
      }
      // Scatters pay anywhere, in total-bet multiples.
      var sc = 0;
      for (var r = 0; r < 5; r++)
        for (var row = 0; row < 3; row++)
          if (symDefs(grid[r][row]).scatter) sc++;
      var scatterAward = 0, fsAward = 0;
      if (sc >= 3) {
        var key = String(Math.min(sc, 5));
        var sdef = null;
        for (var id in syms) if (syms[id].scatter) sdef = syms[id];
        if (sdef) {
          scatterAward = bet * ((sdef.awardBetMult && sdef.awardBetMult[key]) || 0) * mult;
          fsAward = (sdef.freeSpins && sdef.freeSpins[key]) || 0;
        }
      }
      winCoins += scatterAward;
      return { lineWins: lineWins, scatterCount: sc, scatterAward: scatterAward,
               fsAward: fsAward, totalWin: winCoins };
    }

    function tierOf(totalWin, bet) {
      if (bet <= 0 || totalWin <= 0) return 'none';
      var x = totalWin / bet;
      if (x >= 25) return 'mega';
      if (x >= 10) return 'big';
      return 'small';
    }

    function doSpin(bet, mult, isFree) {
      var grid = [stopReel(0), stopReel(1), stopReel(2), stopReel(3), stopReel(4)];
      var ev = evalSpin(grid, bet, mult);
      return { grid: grid, lineWins: ev.lineWins, scatterCount: ev.scatterCount,
               scatterAward: ev.scatterAward, fsAward: ev.fsAward,
               totalWin: ev.totalWin, tier: tierOf(ev.totalWin, bet) };
    }

    return {
      config: cfg,
      state: state,
      paylines: PAYLINES,

      spin: function (bet) {
        state.spinCount++;
        var res = doSpin(bet, 1, false);
        // Boost re-roll: one quiet second chance.
        var boosted = false;
        if (res.totalWin === 0) {
          var nb = cfg.newGameBoost;
          if (nb && state.spinCount <= nb.spins && rnd() < nb.rerollChance) {
            boosted = true;
            res = doSpin(bet, 1, false);
          }
        }
        res.boosted = boosted;
        // Pity
        var pityUsed = false;
        if (res.totalWin === 0) {
          state.deadSpins++;
          var p = cfg.pity;
          if (p && state.deadSpins >= p.deadSpins) {
            var chance = Math.min(0.5, p.baseChance + (state.deadSpins - p.deadSpins) * p.perSpin);
            if (rnd() < chance) {
              var reel = Math.floor(rnd() * 5);
              var grid = res.grid.slice();
              var forced = forceScatter(reel);
              if (forced) {
                grid[reel] = forced;
                var ev = evalSpin(grid, bet, 1);
                res = { grid: grid, lineWins: ev.lineWins, scatterCount: ev.scatterCount,
                        scatterAward: ev.scatterAward, fsAward: ev.fsAward,
                        totalWin: ev.totalWin, tier: tierOf(ev.totalWin, bet),
                        boosted: boosted, pityUsed: true };
                state.deadSpins = 0;
                pityUsed = true;
              }
            }
          }
        } else {
          state.deadSpins = 0;
        }
        res.pityUsed = pityUsed;

        // Free-spins trigger -> choice pending
        if (res.fsAward > 0 && cfg.freeSpins && cfg.freeSpins.choices) {
          res.pendingChoice = cfg.freeSpins.choices.map(function (c, i) {
            return { index: i, spins: c[0], mult: c[1] };
          });
        }
        return res;
      },

      chooseFreeSpins: function (i) {
        var c = cfg.freeSpins.choices[i];
        state.fsRemaining = c[0];
        state.fsMult = c[1];
        state.fsTotal = 0;
      },

      spinFree: function (bet) {
        if (state.fsRemaining <= 0) return { done: true, totalWin: 0 };
        state.fsRemaining--;
        var res = doSpin(bet, state.fsMult, true);
        state.fsTotal += res.totalWin;
        // Retrigger
        if (res.fsAward > 0 && cfg.freeSpins.retrigger !== false) {
          state.fsRemaining += res.fsAward;
          res.retriggered = res.fsAward;
        }
        res.fsRemaining = state.fsRemaining;
        res.fsMult = state.fsMult;
        res.fsTotal = state.fsTotal;
        res.done = state.fsRemaining <= 0;
        return res;
      },

      // Exposed for sim/testing
      _evalLine: evalLine,
      _symDefs: symDefs
    };
  }

  root.SlotEngine = { createGame: createGame };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.SlotEngine;
}
