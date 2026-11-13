// Vercel serverless function: saves a guest's RSVP for a customer's invite.
// Uses the same SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY settings as /api/subscribe.

const EVENT_ID = /^[a-z0-9-]{6,64}$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const eventId = String(body.event || '');
  if (!EVENT_ID.test(eventId)) return res.status(400).json({ error: 'Unknown invitation.' });

  const raw = JSON.stringify(body.details || {});
  if (raw.length > 5000) return res.status(413).json({ error: 'Reply is too long.' });
  const details = JSON.parse(raw);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'RSVPs are temporarily unavailable.' });

  try {
    const response = await fetch(`${url}/rest/v1/rsvps`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        event_id: eventId,
        invite: String(body.invite || '').slice(0, 80),
        guest_name: String(details.name || '').slice(0, 120),
        attending: String(details.attending || '').slice(0, 20),
        details
      })
    });
    if (!response.ok) {
      console.error('RSVP insert failed', response.status, await response.text());
      return res.status(500).json({ error: 'Could not save your RSVP. Please try again.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('RSVP error', err);
    return res.status(500).json({ error: 'Could not save your RSVP. Please try again.' });
  }
};
