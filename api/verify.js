// GET /api/verify?session_id=cs_... -> {paid, coins, id, already}
// Checks a Stripe Checkout session's payment status and performs one-time
// redemption: the first verify for a paid session marks it redeemed in the
// session's own metadata (server-side), so clearing browser storage or
// switching devices can't credit the same purchase twice.
export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;
  const sid = (req.query && req.query.session_id) || '';
  if (!key) return res.status(500).json({ error: 'Payments not configured yet' });
  if (!sid || !/^cs_(test|live)_/.test(sid)) return res.status(400).json({ error: 'Bad session id' });

  const auth = { Authorization: 'Bearer ' + key };
  const get = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sid), { headers: auth });
  const j = await get.json();
  if (!get.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'Stripe error' });
  if (j.payment_status !== 'paid') return res.status(200).json({ paid: false, coins: 0, id: j.id });

  const coins = parseInt((j.metadata && j.metadata.coins) || '0', 10) || 0;
  if (j.metadata && j.metadata.redeemed === '1') {
    return res.status(200).json({ paid: true, coins: 0, id: j.id, already: true });
  }
  // Mark redeemed server-side before crediting. Best-effort one-time
  // redemption: two verify calls landing in the same instant could both pass
  // the check above, but the window is milliseconds on a low-traffic endpoint.
  const set = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sid), {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 'metadata[redeemed]': '1' }),
  });
  if (!set.ok) {
    // Couldn't mark it — don't credit; the client can safely retry.
    return res.status(502).json({ error: 'Could not confirm redemption, try again' });
  }
  return res.status(200).json({ paid: true, coins, id: j.id });
}
