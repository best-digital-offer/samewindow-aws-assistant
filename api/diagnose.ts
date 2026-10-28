import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type Severity = 'low' | 'medium' | 'high';
const allowedServices = new Set(['IAM','CloudFormation','Lambda','EC2','S3','Networking','AWS Console','Data Services','Deployment']);
function redact(input: string): string {
  return input
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_ACCESS_KEY]')
    .replace(/\bASIA[0-9A-Z]{16}\b/g, '[REDACTED_TEMP_ACCESS_KEY]')
    .replace(/(aws_secret_access_key|secretAccessKey|password|token|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\b\d{12}\b/g, '[REDACTED_ACCOUNT_ID]')
    .replace(/arn:aws:[^\s,;]+/gi, '[REDACTED_RESOURCE_ARN]');
}
function responseError(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ error });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return responseError(res, 405, 'Method not allowed');
  }

  const authHeader = req.headers.authorization;
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return responseError(res, 401, 'Sign in is required for cloud diagnosis.');

  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  if (body.consent !== true) return responseError(res, 400, 'Explicit cloud-sharing consent is required.');
  const service = typeof body.service === 'string' && allowedServices.has(body.service) ? body.service : '';
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';
  const summary = typeof body.errorSummary === 'string' ? redact(body.errorSummary).trim().slice(0, 2500) : '';
  const severity: Severity = body.severity === 'high' || body.severity === 'medium' ? body.severity : 'low';
  if (!service || !title || summary.length < 8) return responseError(res, 400, 'A supported service, title, and error summary are required.');

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!supabaseUrl || !anonKey || !groqKey) return responseError(res, 503, 'Cloud diagnosis is not configured on the server.');

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: 'Bearer ' + token } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return responseError(res, 401, 'Your session is invalid or expired.');

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + groqKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: 'system', content: 'You are a careful AWS troubleshooting assistant. Use only the supplied redacted error context. Return valid JSON with keys diagnosis (string), likely_causes (array of strings), resolution_steps (array of strings), and caution (string). Do not claim you inspected the user account or live AWS resources. Never request credentials, secret keys, or full account IDs. Prefer safe, reversible diagnostic steps.' },
          { role: 'user', content: JSON.stringify({ service, title, severity, error_summary: summary }) },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!groqResponse.ok) {
      const detail = await groqResponse.text().catch(() => '');
      console.error('Groq diagnosis failed', groqResponse.status, detail.slice(0, 300));
      return responseError(res, 502, 'The AI diagnosis provider failed. Please try again later.');
    }
    const groqData = await groqResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = groqData.choices?.[0]?.message?.content;
    if (!raw) return responseError(res, 502, 'The AI provider returned an empty diagnosis.');
    let result: { diagnosis?: string; likely_causes?: string[]; resolution_steps?: string[]; caution?: string };
    try { result = JSON.parse(raw); } catch { return responseError(res, 502, 'The AI provider returned an invalid response.'); }
    const diagnosis = typeof result.diagnosis === 'string' ? result.diagnosis.slice(0, 2500) : 'No diagnosis was returned.';
    const causes = Array.isArray(result.likely_causes) ? result.likely_causes.filter((x): x is string => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 300)) : [];
    const steps = Array.isArray(result.resolution_steps) ? result.resolution_steps.filter((x): x is string => typeof x === 'string').slice(0, 8).map(x => x.slice(0, 500)) : [];
    const caution = typeof result.caution === 'string' ? result.caution.slice(0, 500) : 'Verify each step in your own AWS environment before applying changes.';
    const { data: saved, error: saveError } = await supabase.from('aws_investigations').insert({
      user_id: authData.user.id, service, title, severity,
      error_summary: summary, diagnosis: JSON.stringify({ diagnosis, likely_causes: causes, resolution_steps: steps, caution }),
      resolution_steps: steps, cloud_shared: true,
    }).select('id, created_at').single();
    if (saveError) {
      console.error('Investigation history save failed', saveError.message);
      return responseError(res, 500, 'Diagnosis completed, but secure history storage failed.');
    }
    return res.status(200).json({ investigationId: saved.id, createdAt: saved.created_at, diagnosis, likelyCauses: causes, resolutionSteps: steps, caution });
  } catch (error) {
    console.error('Diagnosis request failed', error instanceof Error ? error.message : 'Unknown error');
    return responseError(res, 500, 'Diagnosis failed unexpectedly.');
  }
}
