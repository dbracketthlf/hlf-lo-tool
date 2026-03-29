const https = require('https');

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = async function(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

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

  // Build Anthropic request — strip pwd before forwarding
  const { pwd, ...anthropicBody } = parsed;

  const postData = JSON.stringify({
    model: anthropicBody.model || 'claude-sonnet-4-6',
    max_tokens: anthropicBody.max_tokens || 3000,
    system: anthropicBody.system || '',
    messages: anthropicBody.messages || []
  });

  try {
    const result = await httpsRequest({
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    }, postData);

    res.status(result.status)
       .setHeader('Content-Type', 'application/json')
       .end(result.body);

  } catch(err) {
    res.status(500).json({ error: { message: err.message } });
  }
};
