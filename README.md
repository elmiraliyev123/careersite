# CareerApple

CareerApple is a youth-focused internships and junior jobs platform for the Azerbaijani market, built with Next.js and a server-backed admin workflow.

## What changed

- Public pages now read from SQLite instead of the old JSON-only demo path.
- Admin login uses an environment-configured password and signed HTTP-only session cookie.
- Admin can create, update, and delete companies and jobs through protected CRUD APIs.
- Featured listings are derived from featured companies and youth-role jobs in live storage.
- Health, sitemap, and robots endpoints are included for deployment readiness.

## Stack

- Next.js App Router
- React 19
- Node built-in SQLite (`node:sqlite`)
- Tailwind is not used in the app runtime; styling is handled in the existing CSS system

## Local setup

1. Copy `.env.example` to `.env.local`
2. Set strong values for:
   - `ADMIN_LOGIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. Open:
   - `/` for the public product
   - `/adminlog` for admin login

## Production run

```bash
npm run build
ADMIN_LOGIN_PASSWORD="strong-password" ADMIN_SESSION_SECRET="strong-secret" npm start
```

## Key routes

- `/adminlog`: separate admin entry
- `/admin`: protected admin management UI
- `/api/health`: runtime health check
- `/api/companies`: public list, protected create
- `/api/companies/[slug]`: public fetch, protected update/delete
- `/api/jobs`: public list, protected create
- `/api/jobs/[slug]`: public fetch, protected update/delete

## Storage

- SQLite file: `data/careerapple.sqlite`
- Legacy JSON store: `data/platform-store.json`
  - This is imported once for migration compatibility.
  - New writes go to SQLite.

## Deployment notes

- Point `adminlog.your-domain.com` at the same app and keep `NEXT_PUBLIC_ADMIN_SUBDOMAIN=adminlog`.
- Set `NEXT_PUBLIC_SITE_URL` for correct sitemap and robots output.
- For larger multi-instance production, the next infrastructure step is replacing local SQLite with managed Postgres.
