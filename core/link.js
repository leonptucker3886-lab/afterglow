// core/link.js — Glow Link: one Supabase account + one shared Glow balance
// across Afterglow (casino) and Arcadeline.
// Server contract: arc_profiles.tokens IS the shared balance. The casino
// moves it ONLY through the arc_glow_delta(p_delta, p_reason) RPC (deltas
// only, clamped >= 0 server-side, |delta| <= 10,000,000).
// Failure posture: anything that goes wrong -> module goes inert and the
// casino behaves EXACTLY as it does today (guest wallet, local storage).

import { state, on, emit, save, debit, credit } from './store.js';
import { $, h, esc, modal, toast } from './ui.js';

const PROJECT_URL = 'https://cjtutkvhyzjsgclqvylg.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_E48ovT9wWxduLxnzPXL_5g_SnNl2rqz';
const SUPA_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const LINK_FLAG = uid => 'afterglow:link:' + uid;
const FLUSH_MS = 2500;

let sb = null;
let inert = true;            // flipped false only once sync is actually live
let syncing = false;         // true while a signed-in session is being synced
let user = null;
let confirmed = 0;           // last server-confirmed balance
let pending = 0;             // local delta accumulated since last confirmed flush
let flushTimer = 0;
let acctBtn = null;
let readyResolve = () => {};
const ready = new Promise(r => (readyResolve = r));

/* ---------------- public API (game layer calls this for stakes/wins) ------ */
// window.GlowLink = { ready, balance(), applyDelta(n, reason) }
// applyDelta routes through the same debit/credit machinery as every game,
// so the pending/flush machinery picks it up identically.
// Negative n = stake (refused when the balance can't cover it);
// positive n = win/grant. Free gifts (starter pack, daily wheel, refuel)
// go through the same path — they are the casino's free-play equivalent:
// they move Glow but record nothing against accomplishments.
window.GlowLink = {
  ready,
  balance: () => Math.floor(state.coins),
  applyDelta: (n, reason = 'link') => {
    n = Math.floor(n);
    if (!(n > 0) && !(n < 0)) return true;
    return n > 0 ? credit(n, reason) > 0 : debit(-n, reason);
  }
};

/* ---------------- sync machinery ------------------------------------------ */
function paint() {
  try { save(); emit('coins', { delta: 0, why: 'link' }); } catch (e) {}
}

// Adopt a server-confirmed balance. Pending is NOT touched here — callers
// decide what pending means in their context.
function adoptBalance(bal, why) {
  bal = Math.floor(bal);
  if (!Number.isFinite(bal) || bal < 0) return;
  state.coins = bal;
  confirmed = bal;
  paint();
}

async function rpcDelta(delta, reason) {
  const { data, error } = await sb.rpc('arc_glow_delta', {
    p_delta: Math.floor(delta),
    p_reason: String(reason || '').slice(0, 80)
  });
  return { data, error };
}

async function flush(reason) {
  if (!syncing || !sb || pending === 0) return;
  const delta = pending;
  pending = 0;
  try {
    const { data, error } = await rpcDelta(delta, reason || 'flush');
    if (error) {
      if (/out of range/i.test(error.message || '')) {
        // Can't happen from real play; self-heal by re-pulling the server.
        adoptBalance(await pull(true), 'link');
      } else {
        pending = delta; // transient: retry on the next tick
      }
      return;
    }
    if ((typeof data === 'number' || typeof data === 'bigint') && Number.isFinite(Number(data))) {
      adoptBalance(Number(data), 'link');
    } else {
      pending = delta;
    }
  } catch (e) {
    pending = delta; // network blip: retry on the next tick
  }
}

async function pull(quiet) {
  if (!sb || !user) return Math.max(0, Math.floor(confirmed));
  const { data, error } = await sb.from('arc_profiles').select('tokens').eq('id', user.id).maybeSingle();
  if (error) { if (quiet) return Math.max(0, Math.floor(confirmed)); throw error; }
  return Math.max(0, Math.floor(Number(data?.tokens ?? 0)));
}

async function linkFor(u) {
  user = u;
  const server0 = await pull();
  const guest = Math.max(0, Math.floor(state.coins));
  let flag = null;
  try { flag = localStorage.getItem(LINK_FLAG(user.id)); } catch (e) {}
  // Merge when this device never linked this uid, OR when a guest pile earned
  // while signed out exceeds the server (signing in must never destroy value).
  if (!flag || guest > server0) {
    const target = Math.max(server0, guest);
    let server = server0;
    if (target > server0) {
      try {
        const { data, error } = await rpcDelta(target - server0, 'merge');
        if (!error && (typeof data === 'number' || typeof data === 'bigint') && Number.isFinite(Number(data))) {
          server = Number(data);
        } else {
          pending += target - server0; // flush will retry within 2.5s
        }
      } catch (e) { pending += target - server0; }
    }
    state.coins = target;
    confirmed = server;
    paint();
    try { localStorage.setItem(LINK_FLAG(user.id), '1'); } catch (e) {}
  } else {
    // Plain re-link: server is truth.
    adoptBalance(server0, 'link');
  }
  syncing = true;
  inert = false;
  clearInterval(flushTimer);
  flushTimer = setInterval(() => flush('tick'), FLUSH_MS);
  paintAcct();
  toast('Glow linked — your balance syncs with Arcadeline.', 'l');
}

function stopSync() {
  syncing = false;
  clearInterval(flushTimer);
  // Keep the current balance as the local guest pile; nothing is destroyed.
  pending = 0;
  confirmed = 0;
  user = null;
  inert = true;
  paintAcct();
}

/* ---------------- account UI ---------------------------------------------- */
function paintAcct() {
  if (!acctBtn) return;
  if (!user) {
    acctBtn.innerHTML = 'Sign in';
    acctBtn.classList.remove('on');
  } else {
    const who = esc(String(user.user_metadata?.nickname || user.email || 'Account').split('@')[0].slice(0, 14));
    acctBtn.innerHTML = '<i class="dot"></i>' + who;
    acctBtn.classList.add('on');
  }
}

function mountAcctBtn() {
  try {
    const bar = $('.topbar');
    if (!bar || acctBtn) return;
    acctBtn = h('<button class="gacct" aria-label="Account">Sign in</button>');
    acctBtn.style.cssText = 'display:inline-flex;align-items:center;gap:7px;margin-right:10px;padding:8px 14px;border-radius:99px;border:1px solid var(--line,#26263d);background:rgba(255,255,255,.04);color:var(--txt,#fff);font:600 13px/1 inherit;cursor:pointer;white-space:nowrap';
    acctBtn.onclick = openAcctModal;
    const bal = $('.bal', bar);
    bar.insertBefore(acctBtn, bal);
    const st = document.createElement('style');
    st.textContent = '.gacct.on{border-color:#22f0ff}.gacct .dot{width:8px;height:8px;border-radius:99px;background:#3ddc97;box-shadow:0 0 8px #3ddc97}';
    document.head.appendChild(st);
    paintAcct();
  } catch (e) {}
}

function fieldRow(id, label, type) {
  return `<label style="display:block;margin:10px 0 2px;font-size:13px;opacity:.75">${esc(label)}</label>` +
    `<input id="${id}" type="${type}" autocomplete="${type === 'password' ? 'current-password' : 'email'}" ` +
    `style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--line,#26263d);background:rgba(255,255,255,.05);color:var(--txt,#fff);font-size:15px">`;
}

function openAcctModal() {
  if (!sb) { toast('Account sync is unavailable right now — guest play continues.', 'r'); return; }
  if (user) {
    modal(`<h2 style="margin-top:0">Glow linked</h2>
      <p class="dim">Signed in as <b style="color:var(--txt)">${esc(user.email || '')}</b>. One pile across Afterglow and Arcadeline.</p>
      <div class="stat-row"><span>Shared balance</span><b>${Math.floor(state.coins).toLocaleString('en-US')} Glow</b></div>`,
      { actions: [{ label: 'Sign out', value: 'out' }, { label: 'Close', cls: 'pri', value: 'x' }] })
      .then(async v => {
        if (v === 'out') {
          try { await flush('signout'); await sb.auth.signOut(); } catch (e) {}
          stopSync();
          toast('Signed out — playing as guest.', '');
        }
      });
    return;
  }
  modal(`<h2 style="margin-top:0">Link your Glow</h2>
    <p class="dim">One account, one balance: Afterglow and Arcadeline share the same Glow pile. Sign in to sync, or create a free account.</p>
    <div id="amsg" style="min-height:20px;font-size:13.5px;color:#ff8a8a"></div>
    ${fieldRow('aem', 'Email', 'email')}
    ${fieldRow('apw', 'Password', 'password')}
    <p class="faint" style="font-size:12.5px">New accounts need email confirmation — check your inbox, then sign in.</p>`,
    { actions: [], dismiss: true,
      onOpen: (m, close) => {
        const btns = h(`<div class="acts" style="margin-top:14px">
          <button class="btn pri" id="ago">Sign in</button>
          <button class="btn" id="anew">Create account</button>
          <button class="btn ghost" id="ax">Cancel</button></div>`);
        m.appendChild(btns);
        const msg = t => { const e = m.querySelector('#amsg'); if (e) e.textContent = t; };
        m.querySelector('#ax').onclick = () => close(null);
        const go = async create => {
          const email = m.querySelector('#aem').value.trim();
          const pw = m.querySelector('#apw').value;
          if (!email || !pw) { msg('Enter an email and password.'); return; }
          msg('…');
          try {
            const r = create
              ? await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin } })
              : await sb.auth.signInWithPassword({ email, password: pw });
            if (r.error) { msg(r.error.message); return; }
            if (!r.data.session) { msg('Check your email to confirm, then sign in.'); return; }
            close('ok');
            await linkFor(r.data.session.user);
          } catch (e) { msg('Something went wrong — try again.'); }
        };
        m.querySelector('#ago').onclick = () => go(false);
        m.querySelector('#anew').onclick = () => go(true);
      } });
}

/* ---------------- boot ---------------------------------------------------- */
async function bootLink() {
  let createClient;
  try {
    ({ createClient } = await import(SUPA_ESM));
  } catch (e) { return; } // CDN blocked: inert, casino unchanged
  try {
    sb = createClient(PROJECT_URL, PUBLISHABLE_KEY);
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    mountAcctBtn();
    const sessUser = data.session?.user || null;
    try {
      sb.auth.onAuthStateChange(async (ev, sess) => {
        if (ev === 'SIGNED_IN' && sess?.user && !syncing) { try { await linkFor(sess.user); } catch (e) {} }
        if (ev === 'SIGNED_OUT') stopSync();
      });
    } catch (e) {}
    if (sessUser) {
      await linkFor(sessUser);
    }
    try {
      addEventListener('pagehide', () => {
        if (syncing && pending !== 0) {
          const d = pending; pending = 0;
          rpcDelta(d, 'pagehide').then(r => {
            if (!r.error) { const b = Number(r.data); if (Number.isFinite(b)) confirmed = b; }
            else pending = d;
          }).catch(() => { pending = d; });
        }
      });
    } catch (e) {}
    on('coins', ({ delta }) => {
      if (syncing && Number.isFinite(delta) && delta !== 0) pending += Math.floor(delta);
    });
  } catch (e) {
    sb = null; // any auth/network failure: inert, guest play continues untouched
  }
}

export function initLink() {
  bootLink().catch(() => {}).finally(() => { try { readyResolve(true); } catch (e) {} });
}
