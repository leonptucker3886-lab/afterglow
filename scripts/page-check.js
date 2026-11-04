#!/usr/bin/env node
// scripts/page-check.js — WIP smoke check for Afterglow pages.
// Usage: node scripts/page-check.js <baseUrl> [paths...]
// Fetches each page and reports HTTP status, plus whether the HTML is empty.
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) { console.error('usage: node scripts/page-check.js <baseUrl> [paths...]'); process.exit(2); }
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/', '/games/lion-link.html', '/games/roulette3d.html'];
(async () => {
  let fail = 0;
  for (const p of paths) {
    try {
      const r = await fetch(base + p, { redirect: 'follow' });
      const body = await r.text();
      const ok = r.ok && body.trim().length > 0;
      if (!ok) fail++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${r.status} ${p} (${body.length} bytes)`);
    } catch (e) { fail++; console.log(`FAIL ERR ${p} ${e.message}`); }
  }
  console.log(`${paths.length - fail}/${paths.length} pages OK`);
  process.exit(fail ? 1 : 0);
})();
