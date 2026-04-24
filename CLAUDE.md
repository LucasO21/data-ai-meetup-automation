# CLAUDE.md

This file provides guidance to Claude (Cursor) when working with code in this repository.

## Project Overview

DC meetup event management system with two surfaces:

1. **Backend automation** — Scrapes 8 DC meetup groups via Meetup.com's GraphQL API every Sunday 8 AM ET, stores events in Airtable, and logs every scrape run. RSVP actions create Google Calendar events and send Gmail confirmations.

2. **Dashboard** (`dashboard/`) — Next.js web app for browsing upcoming/past/RSVP'd events, RSVPing with one click, canceling RSVPs, and manually triggering the scraper. Google SSO (NextAuth) gates owner-only features.

## Project Structure

```
src/                        ← Backend TypeScript source
  agents/
    airtable-agent.ts       — Airtable CRUD (insert, RSVP, cancel, fetch, archive, scrape logs)
    scraper-agent.ts        — Meetup GraphQL (/gql2) scraper
    calendar-agent.ts       — Google Calendar create/delete (OAuth2)
    email-agent.ts          — Gmail confirmation emails (OAuth2)
  config/
    constants.ts            — Re-exports all env vars
    urls.ts                 — 8 meetup group URLs
  cron/
    schedule.ts             — node-cron Sunday 8 AM trigger (PM2 entry)
  workflows/
    weekly-workflow.ts      — Sunday orchestrator (archive → scrape → insert → log)
  test.ts                   — Smoke tests

dashboard/                  ← Next.js 16 web dashboard
  app/
    events/page.tsx         — Main UI: 4 tabs (Upcoming / RSVP'd / Past / Logs — last two owner-only)
    api/events/route.ts     — GET events by tab
    api/rsvp/route.ts       — POST (confirm) / DELETE (cancel) RSVP
    api/scrape/route.ts     — POST trigger scraper
    api/cron/route.ts       — Vercel cron entry — runs weekly workflow
    api/logs/route.ts       — GET scrape log rows
    api/auth/[...nextauth]  — Google OAuth sign-in
    admin/health/page.tsx   — Owner-only health page
  components/               — EventCard, EventDrawer, NavBar, StatusBadge, AuthProvider, etc.
  lib/auth.ts               — NextAuth config
  middleware.ts             — Owner-email gate for protected routes
  .env.local                — Env vars + PROJECT_ROOT (not committed)
  next.config.ts            — Webpack config with @backend alias + .js→.ts extension alias

dist/                       ← Compiled backend output (auto-generated)
logs/                       ← workflow.log
docs/                       — Requirements / reference docs
```

## Commands

```bash
# ── Backend ─────────────────────────────────────────────
# Build TypeScript (outputs to dist/)
npx tsc

# Run a specific smoke test
npx tsx src/test.ts <target>
# Targets: airtable | scraper | scraper-one | calendar | email | workflow

# Start the weekly cron process
pm2 start ecosystem.config.cjs

# Restart after backend code changes
pm2 restart meetup-cron

# View logs
pm2 logs meetup-cron    # weekly workflow
pm2 list                # process status

# ── Dashboard ────────────────────────────────────────────
cd dashboard
npm run dev             # http://localhost:3000
npm run build           # production build
npm start               # serve production build
```

### Slash Commands (Claude Code)
- `/logs` — Show last 40 lines of cron logs
- `/status` — Show pm2 status + recent logs
- `/workflow` — Dry-run weekly workflow using existing Airtable data
- `/scraper` — Run scraper across all configured groups and insert into Airtable
- `/test <target>` — Run smoke test for a specific agent

## Architecture

### Backend — PM2 Process

| Process | Entry Point | Role |
|---------|-------------|------|
| `meetup-cron` | `dist/cron/schedule.js` | Triggers Sunday 8 AM ET weekly workflow |

A parallel Vercel Cron route (`dashboard/app/api/cron/route.ts`) runs the same workflow on Vercel's infrastructure — either deployment model works.

### Dashboard — API → Agents

Next.js API routes directly import from `src/agents/` via the `@backend` webpack alias. Each API route calls the relevant agent functions:

- `GET /api/events?tab=upcoming|rsvpd|past` → airtable-agent
- `POST /api/rsvp { recordId }` → calendar-agent + email-agent + airtable-agent
- `DELETE /api/rsvp { recordId, calendarEventId }` → calendar-agent + airtable-agent
- `POST /api/scrape` → scraper-agent + airtable-agent
- `GET /api/cron` → runWeeklyWorkflow (gated by Vercel `CRON_SECRET`)
- `GET /api/logs` → airtable-agent scrape log fetch

### Agent Layer (`src/agents/`)
Each agent is a standalone module with no inter-agent dependencies:
- **scraper-agent.ts** — GraphQL requests to `meetup.com/gql2`, returns `ScrapedEvent[]`
- **airtable-agent.ts** — All Airtable CRUD: `insertNewEvents()`, `confirmRsvp()`, `cancelRsvp()`, `getAllUpcomingEvents()`, `getRsvpdEvents()`, `getPastEvents()`, `archivePastUnrsvpdEvents()`, `insertScrapeLog()`
- **calendar-agent.ts** — `createCalendarEvent()`, `deleteCalendarEvent()` via Google Calendar API (reads PROJECT_ROOT env for credential paths)
- **email-agent.ts** — `sendConfirmationEmail()` via Gmail API (OAuth2, reads PROJECT_ROOT env)

### Workflows
- **weekly-workflow.ts** — Sunday orchestrator: archive past unrsvpd events → scrape → dedup insert → fetch all → write scrape log row

### Auth
- **NextAuth** with the Google provider. `dashboard/middleware.ts` checks the session email against `OWNER_EMAIL` env var and redirects non-owners away from owner-only routes. Owner-only UI (RSVP'd tab, Scrape Logs tab, RSVP buttons, scrape trigger) is also gated client-side.

## Key Config Files

- **src/config/constants.ts** — Re-exports all env vars
- **src/config/urls.ts** — The 8 meetup group URLs to scrape
- **ecosystem.config.cjs** — PM2 process definition for the cron
- **.envrc** — direnv config (run `direnv allow` after changes)
- **.gauth.json** — Google OAuth client credentials (not committed)
- **.credentials/** — Stored OAuth tokens (not committed)
- **dashboard/.env.local** — Dashboard env vars including PROJECT_ROOT, OWNER_EMAIL, NEXTAUTH_SECRET (not committed)

## Airtable Schema

Table: `meetup_events`
- `eventURL` — primary dedup key
- `groupName`, `eventName`, `eventDescription`, `eventDate`, `eventLocation`
- `rsvpFlag` (boolean) — set true after RSVP
- `calendarEventId` — Google Calendar event ID (set after RSVP)

Table: `scrape_logs`
- `timestamp`, `source`, `totalScraped`, `newInserted`, `archived`, `durationMs`, `status`, `error`, `groupBreakdown`

## Important Notes

- **GraphQL scraper**: Uses `meetup.com/gql2` directly — no Firecrawl or Puppeteer needed in production. (The `scraper-one` smoke test uses Puppeteer + Claude as an alternative extraction path for experimentation.)
- **Dashboard webpack config**: Uses `extensionAlias` (.js → .ts) so Next.js can import the Node ESM-style backend agents. Dashboard runs with `--webpack` flag (not Turbopack) because Turbopack lacks extensionAlias support.
- **PROJECT_ROOT env var**: calendar-agent and email-agent read `.gauth.json` and `.credentials/` using `process.env.PROJECT_ROOT` so they resolve correctly whether run from PM2, test.ts, or the dashboard API routes. On Vercel, `GAUTH_JSON` and `GOOGLE_OAUTH_TOKEN_JSON` are set as base64-encoded env vars instead.
- **Owner gate**: `OWNER_EMAIL` env var must be set in both the backend and the dashboard. Non-owners see a visitor-only view with Upcoming and Past tabs.
- **Meetup group count**: Defined in `src/config/urls.ts` — add new groups there as you discover them.

## Troubleshooting

### `invalid_grant` error on RSVP or calendar operations
**Symptom**: RSVP fails with `invalid_grant`, or `npx tsx src/test.ts calendar` throws `GaxiosError: invalid_grant`.
**Cause**: The Google OAuth2 refresh token in `.credentials/.oauth2.<your_email>.json` has expired. Google revokes tokens after ~7 days if the OAuth app is in "Testing" mode, or after ~6 months of inactivity.
**Fix**: Run the re-auth script (requires browser interaction):
```bash
python3 reauth.py
```
Sign in with the Gmail account, grant access, and the script writes a fresh token.

### PM2 process stuck in `errored` state with `EPERM: uv_cwd`
**Symptom**: `pm2 list` shows the process as `errored` with 15+ restarts. Error logs show `Error: EPERM: operation not permitted, uv_cwd`.
**Cause**: The PM2 daemon was started from a directory that no longer exists (e.g. a deleted temp dir or old shell session). Node can't resolve `process.cwd()`.
**Fix**: Kill the daemon entirely and restart fresh:
```bash
pm2 kill
npx tsc
pm2 start ecosystem.config.cjs
```

### PM2 process not picking up code changes
**Symptom**: Backend behavior doesn't reflect recent TypeScript edits.
**Cause**: PM2 runs from `dist/` (compiled JS). Source changes in `src/` aren't reflected until you recompile.
**Fix**:
```bash
npx tsc && pm2 restart meetup-cron
```
