// Commit-reveal seeded RNG. Each round uses HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${cursor}`),
// every 32-byte digest yields 8 floats in [0,1). The server seed hash is shown before play; the seed is revealed on rotation.
const FK = 'afterglow:fair';
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
export const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

const keyCache = new Map();
async function hmac(key, msg) {
  let k = keyCache.get(key);
  if (!k) { k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); keyCache.set(key, k); }
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}

export async function floatsFor(server, client, nonce, count, start = 0) {
  const out = [];
  for (let cur = Math.floor(start / 8); out.length < count + (start % 8); cur++) {
    const b = await hmac(server, `${client}:${nonce}:${cur}`);
    for (let i = 0; i < 32; i += 4) out.push(b[i] / 256 + b[i + 1] / 65536 + b[i + 2] / 16777216 + b[i + 3] / 4294967296);
  }
  return out.slice(start % 8, (start % 8) + count);
}

let F;
function persist() { try { localStorage.setItem(FK, JSON.stringify(F)); } catch (e) {} }
async function newPair() { const server = randHex(32); return { server, hash: await sha256(server) }; }

export async function ready() {
  if (F) return F;
  try { F = JSON.parse(localStorage.getItem(FK)); } catch (e) {}
  if (!F || !F.server) { F = { ...(await newPair()), client: randHex(8), nonce: 0, prev: null }; persist(); }
  return F;
}
export async function info() { await ready(); return { hash: F.hash, client: F.client, nonce: F.nonce, prev: F.prev }; }

export async function rotate(client) {
  await ready();
  const prev = { server: F.server, hash: F.hash, client: F.client, nonces: F.nonce };
  F = { ...(await newPair()), client: (client || '').trim().slice(0, 64) || randHex(8), nonce: 0, prev };
  persist();
  return prev;
}

// A per-round stream of floats. Consumes one nonce.
export async function stream() {
  await ready();
  const s = { server: F.server, hash: F.hash, client: F.client, nonce: F.nonce, cursor: 0 };
  F.nonce++; persist();
  return {
    hash: s.hash, client: s.client, nonce: s.nonce,
    async floats(n) { const r = await floatsFor(s.server, s.client, s.nonce, n, s.cursor); s.cursor += n; return r; },
    async float() { return (await this.floats(1))[0]; },
  };
}

/* helpers for turning floats into outcomes */
export const int = (f, n) => Math.floor(f * n);
export function shuffle(arr, floats) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(floats[a.length - 1 - i] * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function weighted(weights, f) {
  const tot = weights.reduce((a, b) => a + b, 0); let x = f * tot;
  for (let i = 0; i < weights.length; i++) { if ((x -= weights[i]) < 0) return i; }
  return weights.length - 1;
}
