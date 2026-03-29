// This function only handles two things:
// 1. Auth check + return API key to browser (browser calls Anthropic directly)
// 2. Guidelines chat (text only, no size issue)

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const LO_PASSWORD = process.env.LO_PASSWORD || 'HLF-LO-2026!';

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body); } catch(e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (parsed.pwd !== LO_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Return the API key securely to authenticated LOs
  // The browser will call Anthropic directly with this key
  return res.status(200).json({ apiKey: ANTHROPIC_API_KEY });
};
