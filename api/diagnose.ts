import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Intentionally disabled until JWT verification, explicit consent validation,
  // server-side redaction, rate limiting, and Groq integration are implemented.
  return res.status(501).json({ error: 'Cloud diagnosis is not configured yet. No data was sent to an AI provider.' });
}
