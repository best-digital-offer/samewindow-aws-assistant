# Architecture

1. **Content script:** observes AWS Console DOM changes and classifies visible error text locally.
2. **Background worker:** stores user preferences and can issue a non-sensitive notification.
3. **Side panel:** shows a local investigation timeline, the detected error summary, and an explicit cloud-sharing consent step.
4. **Vercel API:** authenticates the user, validates consent, redacts submitted context again, calls Groq using a server-only key, and persists the investigation.
5. **Supabase:** stores each investigation under the authenticated user; row-level security prevents cross-user reads and writes.

## Security requirements before production

- Do not send page content, account IDs, resource ARNs, request headers, or stack traces to cloud by default.
- Require a deliberate user action for every cloud diagnosis and display the exact context to be shared.
- Validate Supabase JWT server-side. Never trust a user ID supplied in JSON.
- Add rate limits, request size limits, retention controls, and audit logging.
- Keep service-role and Groq keys only in Vercel server environment variables.
