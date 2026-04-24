# DC Meetup Automation

An automated system that tracks Data & AI meetup events in the DC Metro Area. It scrapes eight Meetup.com groups on a weekly schedule, stores events in Airtable, and surfaces them through a Next.js dashboard with one-click RSVP, Google Calendar sync, and Gmail confirmations.

Built as a hands-on learning project using **Cursor** and **Claude** to explore what's possible when AI tools are used end-to-end to build real, working software.

---

## Motivation

Keeping up with DC's tech scene means manually checking 8+ Meetup.com group pages each week. This project automates that entirely: every Sunday morning the scraper runs, new events land in Airtable, and the dashboard reflects them instantly. Owner RSVPs create Google Calendar events and send a confirmation email to the Gmail inbox.

---

## How It Works

**Backend automation** — a weekly cron job runs the scraper against Meetup.com's GraphQL endpoint, deduplicates against existing rows, inserts new events into Airtable, and archives past events that were never RSVP'd. A scrape log row is written for every run (success or failure) for observability.

**Web dashboard** — a Next.js app with Google SSO. Visitors can browse Upcoming and Past events across all groups, search and filter, and view event details. The authenticated owner gets extra tabs — RSVP'd and Scrape Logs — plus one-click RSVP, one-click cancel, and a manual scrape trigger.

**RSVP flow** — clicking RSVP on the dashboard calls the backend agents: Google Calendar creates the event on the owner's calendar, Gmail sends a confirmation, and Airtable flips the `rsvpFlag`. Cancel reverses all three.

---

## Meetup Groups Tracked

| Group | Focus |
|-------|-------|
| Generative AI DC | LLMs, AI products |
| AI in Practice | Applied ML/AI |
| Data Science DC | Data science, analytics |
| Data Visualization DC | Dataviz, storytelling |
| AI Safety Awareness DC | AI alignment, safety |
| ProductTank DC | Product management |
| DC Code & Coffee | General software |
| Bitcoin District | Web3, crypto |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (ESM) |
| Dashboard | Next.js 16 (App Router, webpack), Tailwind 4 |
| Auth | NextAuth + Google OAuth |
| Database | Airtable |
| Calendar + Email | Google Calendar & Gmail APIs (OAuth2) |
| Scraping | Meetup.com GraphQL (`/gql2`) |
| Scheduling | node-cron (PM2) + Vercel Cron |

---

## Project Structure

```
src/
  agents/       scraper, airtable, calendar, email
  config/       env vars, meetup group URLs
  cron/         Sunday 8 AM scheduler (node-cron)
  workflows/    weekly orchestrator
  test.ts       smoke tests per agent

dashboard/      Next.js web UI + API routes
docs/           requirements and reference docs
```

The dashboard imports backend agents directly via a webpack alias (`@backend`) — one codebase, two surfaces.

---

## Key Concepts Learned

- **Meetup.com's GraphQL endpoint** (`/gql2`) returns structured event data without authentication, so no headless browser is needed.
- **Next.js + shared backend agents**: the dashboard imports TypeScript agents directly via a webpack path alias (`@backend`), which required staying on webpack instead of Turbopack.
- **Google OAuth token expiry**: tokens issued to apps in "Testing" mode expire every 7 days. A simple reauth script (`reauth.py`) handles refresh.
- **Owner vs visitor surface**: NextAuth + an `OWNER_EMAIL` env check gates the RSVP and scrape-log tabs server-side (middleware) and hides the mutating UI for everyone else.

---

## Setup Overview

1. Install dependencies: `npm install` (root) and `cd dashboard && npm install`
2. Set environment variables in `.envrc` (backend) and `dashboard/.env.local`
3. Authenticate Google APIs: `python3 reauth.py`
4. Build and start the weekly cron: `npx tsc && pm2 start ecosystem.config.cjs`
5. Run the dashboard: `cd dashboard && npm run dev`

See `CLAUDE.md` for the full command reference, Airtable schema, and troubleshooting guide.
