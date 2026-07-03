export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-passphrase');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL) {
    return res.status(500).json({ error: 'Vercel KV not connected. Add KV storage to this project in the Vercel dashboard.' });
  }

  const pp = req.headers['x-passphrase'];
  if (!pp) return res.status(401).json({ error: 'No passphrase' });

  const key = 'mowgli_' + Buffer.from(pp).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  const auth = { Authorization: `Bearer ${KV_REST_API_TOKEN}` };

  if (req.method === 'GET') {
    const r = await fetch(`${KV_REST_API_URL}/get/${key}`, { headers: auth });
    const { result } = await r.json();
    return res.status(200).json({ state: result ? JSON.parse(result) : null });
  }

  if (req.method === 'POST') {
    await fetch(`${KV_REST_API_URL}/pipeline`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', key, JSON.stringify(req.body)]])
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
