# Security policy

## Reporting a vulnerability

If you discover a security vulnerability in KitPay SolutionIA, please **do
not open a public GitHub issue**. Instead, send a private email to:

**security@solutionia.work**

Please include:
- A clear description of the vulnerability and its impact.
- Steps to reproduce, or a proof of concept if possible.
- The affected component (SMS ingest, webhook worker, dashboard, migrations,
  hosted checkout, etc.) and the commit or tag you tested against.
- Your name or handle if you would like credit in the acknowledgements.

We will acknowledge your report within 5 business days and give you an
estimated timeline for a fix. Please give us reasonable time to publish a
patched release before disclosing the issue publicly.

## Scope

In scope:
- The source code in this repository (Next.js app, Supabase SQL migrations,
  webhook worker, HMAC signing library).
- The default `.env.example` values and any hard-coded fallbacks.
- The Postgres schema and RLS policies produced by the migrations.

Out of scope:
- Third-party services this project depends on (Supabase, Netlify, Vercel,
  Resend, Telegram, cron-job.org). Report those directly to the vendor.
- Attacks that require physical access to the merchant phone.
- Vulnerabilities in a merchant's own integration code that consumes KitPay
  webhooks or the REST API.

## Hardening reminders for operators

- Rotate `WEBHOOK_SECRET`, `CRON_SECRET` and `ADMIN_PASSWORD` on a schedule.
- Never expose the Supabase `SUPABASE_SERVICE_ROLE_KEY` to a browser or a
  client bundle.
- Restrict outbound traffic from your Netlify or Vercel account.
- Enable Supabase MFA and IP allowlists on the project used by KitPay.
