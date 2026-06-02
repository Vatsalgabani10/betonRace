# Apex Ledger

Private Formula 1 P1-P10 prediction app with:

- multi-page frontend flow
- login / signup screen
- Node + Express backend
- Turso / libSQL-ready auth, sessions, and entries API
- database-backed user balance and reserved entries
- email verification and password reset flows

## Current stack

- Frontend: static HTML, CSS, JavaScript
- Backend: [server.js](/Users/vg/Desktop/betonRace/server.js)
- Database client: `@libsql/client`
- Auth: password hashing with Node `crypto`, session cookie stored in database

## Environment

Create `.env` from `.env.example` and fill in:

```bash
TURSO_DATABASE_URL=libsql://betonrace-betonrace.aws-us-east-1.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
SESSION_SECRET=replace_with_a_long_random_secret
APP_ORIGIN=http://localhost:4173
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@example.com
PORT=4173
```

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:4173`.

## What is real now

- frontend login no longer uses browser `localStorage` for accounts
- signup creates a user in the database
- login creates a secure `HttpOnly` session cookie
- login requires verified email
- verification and reset tokens are stored in the database
- verification and reset links can be delivered by SMTP
- when SMTP is not configured, development links are shown in the UI and logged by the server
- protected pages redirect to login when signed out
- wallet balance and reserved entries are stored per user in the database

## Still not production-safe for real betting

This repo still does **not** include:

- licensed gambling compliance
- KYC / identity verification
- payment processor integration
- tax withholding and reporting
- responsible gambling controls
- geofencing
- fraud scoring / device fingerprinting
- legal policy enforcement workflows

Those pieces need separate implementation before a real-money launch.
