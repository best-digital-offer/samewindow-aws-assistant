# SameWindow AWS Assistant

Firefox-first browser extension that detects visible AWS Console errors locally and helps users investigate them through an explicit, consent-based cloud workflow.

## Status

Early scaffold. Local error detection and the side-panel UI are the first milestone. Cloud diagnosis, authentication, persisted history, and production deployment must be configured and tested before use with real workloads.

## Local development

- Node.js 20+
- `npm install`
- `npm run dev:firefox`
- `npm run typecheck`
- `npm run build:firefox`

## Privacy principles

- Detection runs in the browser against visible page text.
- Cloud sharing is opt-in and must be shown before any diagnostic context leaves the device.
- Redact likely credentials, account identifiers, tokens, and request headers before storage or transmission.
- Never place Groq API keys or Supabase service-role keys in extension code. Keep them in server-side Vercel environment variables.

## Planned architecture

- WXT + React + TypeScript Firefox extension
- Supabase Auth and row-level-secured investigation history
- Vercel serverless diagnosis endpoint
- Groq model access from the server only

See [architecture](docs/architecture.md) and [database migration](supabase/migrations/001_investigations.sql).
