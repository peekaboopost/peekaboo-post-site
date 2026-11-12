// Vercel serverless function: saves early-access emails to Supabase.
// Needs two environment variables set in Vercel (Project → Settings → Environment Variables):
//   SUPABASE_URL               e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  the service_role key (keep secret — server only)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();

  // Honeypot: real people leave the hidden "website" field empty.
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(503).json({ error: 'Sign-ups open very soon — please check back shortly!' });
  }

  try {
    const response = await fetch(`${url}/rest/v1/waitlist?on_conflict=email`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({ email, source: 'coming-soon' })
    });

    if (!response.ok) {
      console.error('Supabase insert failed', response.status, await response.text());
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Subscribe error', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

function safeParse(text) {
  try { return JSON.parse(text); } catch { return {}; }
}
