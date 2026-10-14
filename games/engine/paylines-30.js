/* Shared 30-payline table for 5x3 slots.
 * A payline = 5 row indexes (0=top, 1=mid, 2=bot), one per reel.
 * Lines 1-3: straights. Lines 4-5: full V's. Lines 6-30: zigzag/diagonal mixes.
 * Every game references this table; games differentiate by symbols/strips/paytable,
 * not by line geometry. Plain script, no modules: works from file:// and in Node.
 */
(function (root) {
  var L = [
    [0,0,0,0,0], // 1
    [1,1,1,1,1], // 2
    [2,2,2,2,2], // 3
    [0,1,2,1,0], // 4
    [2,1,0,1,2], // 5
    [0,0,1,2,2], // 6
    [2,2,1,0,0], // 7
    [0,1,1,1,0], // 8
    [2,1,1,1,2], // 9
    [1,0,0,0,1], // 10
    [1,2,2,2,1], // 11
    [0,1,0,1,0], // 12
    [2,1,2,1,2], // 13
    [1,0,1,0,1], // 14
    [1,2,1,2,1], // 15
    [0,0,1,0,0], // 16
    [2,2,1,2,2], // 17
    [0,1,2,2,2], // 18
    [2,1,0,0,0], // 19
    [2,2,2,1,0], // 20
    [0,0,0,1,2], // 21
    [1,1,0,1,1], // 22
    [1,1,2,1,1], // 23
    [0,2,0,2,0], // 24
    [2,0,2,0,2], // 25
    [1,0,2,0,1], // 26
    [1,2,0,2,1], // 27
    [0,2,2,2,0], // 28
    [2,0,0,0,2], // 29
    [0,1,1,2,2]  // 30
  ];
  root.PAYLINES_30 = L;
})(typeof window !== 'undefined' ? window : globalThis);
