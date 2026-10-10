// POST /api/checkout {pack} -> {url, id}
// Creates a Stripe Checkout session for a Glow coin pack. No SDK, plain REST.
const PACKS = {
  p1: { coins: 10000, cents: 99, name: 'Handful of Glow' },
  p2: { coins: 65000, cents: 499, name: 'Stack of Glow' },
  p3: { coins: 160000, cents: 999, name: 'Vault of Glow' },
  p4: { coins: 400000, cents: 1999, name: 'Galaxy of Glow' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Payments not configured yet' });
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (e) {}
  const p = PACKS[body.pack];
  if (!p) return res.status(400).json({ error: 'Unknown pack' });

  const params = new URLSearchParams();
  params.set('payment_method_types[]', 'card');
  params.set('mode', 'payment');
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][unit_amount]', String(p.cents));
  params.set('line_items[0][price_data][product_data][name]', `${p.coins.toLocaleString('en-US')} Glow Coins — ${p.name}`);
  params.set('line_items[0][price_data][product_data][description]', 'Play money for AFTERGLOW social casino. No cash value.');
  params.set('line_items[0][quantity]', '1');
  params.set('metadata[coins]', String(p.coins));
  params.set('metadata[pack]', body.pack);
  params.set('success_url', 'https://afterglow.leonlink.net/store.html?session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url', 'https://afterglow.leonlink.net/store.html');

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const j = await r.json();
  if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'Stripe error' });
  return res.status(200).json({ url: j.url, id: j.id });
}
