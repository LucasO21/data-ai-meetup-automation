# New Features & Improvements

Pick and choose what to work on. Check off items as they're completed.

Top-level goal: take this from a laptop-only project to a **deployed, publicly shareable portfolio piece** that showcases AI + automation skills, with RSVP/admin actions restricted to the owner.

> **Note:** Items referencing a Telegram bot or digest predate its removal from the project. Current scope is documented in [README.md](README.md); items below are kept as historical planning context.

---

## Phase 1 — Deployment & Portfolio (do these first)

These three sections unlock the "publicly shareable" goal. Everything else is polish on top.

### A. Deploy the app

- [x] **A1. Deploy dashboard to Vercel** — live at https://dcdataandai.com

- [ ] **A2. Deploy bot + cron to Railway (or Fly.io / Render)**
  PM2-style always-on host for `meetup-bot` and `meetup-cron`. ~$5/mo. Railway supports Dockerfile or Node buildpack.
  **Acceptance**: `pm2 list` on the server shows both processes online; Sunday 8 AM cron fires without your laptop being on.

- [ ] **A3. Move secrets out of `.envrc` and `.credentials/`**
  Platform env vars only. Serialize the Google OAuth refresh token into an env var (e.g. `GOOGLE_OAUTH_TOKEN_JSON`) and have calendar-agent/email-agent read from env instead of disk when deployed.
  **Acceptance**: No `.credentials/` directory needed in the deployed container.

### B. Owner-only RSVP (Google SSO)

- [x] **B1. Add NextAuth with Google provider**
  `npm install next-auth` in `dashboard/`. Create `app/api/auth/[...nextauth]/route.ts`. Reuse the existing Google Cloud project (already has Calendar/Gmail APIs enabled). Add a new OAuth 2.0 Web Application credential for the dashboard.
  **Env vars**: `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OWNER_EMAIL=<owner-email>`.
  **Acceptance**: `/api/auth/signin` redirects to Google, back to the app with a session.

- [x] **B2. Persistent header with Sign in / Sign out**
  Add to `app/layout.tsx` so it shows on every page. Top-right corner. When signed in, show `Signed in as <email> · Sign out`.
  **Acceptance**: Button visible on `/`, `/events`, and any future page.

- [x] **B3. Gate write routes on owner email**
  Add `isOwner()` helper. Return 401 from `POST /api/rsvp`, `DELETE /api/rsvp`, and `POST /api/scrape` unless `session.user.email === OWNER_EMAIL`.
  **Acceptance**: Signed-out or non-owner users get 401; hitting the endpoints from `curl` without a session also gets 401.

- [x] **B4. Hide / disable owner-only UI for visitors**
  On `EventCard`: hide RSVP and Cancel buttons when not signed in as owner. On the Upcoming tab: hide the "Trigger scrape" button.
  **Acceptance**: An incognito visitor sees a clean read-only dashboard — no dead buttons, no 401s triggered by clicking.

### C. Portfolio presentation

- [x] **C1. Landing page at `/`**
  New page (not a redirect). Hero section explaining what the project does, a "What it showcases" bullet list (GraphQL scraping, Airtable as backing store, Google Calendar/Gmail OAuth, Claude-backed Telegram bot, Next.js dashboard, cron orchestration), a tech-stack row, a Mermaid architecture diagram, screenshots or a short GIF, CTAs to `/events` and the GitHub repo.
  **Acceptance**: A recruiter landing cold on `/` understands what the project is and what skills it demonstrates within 15 seconds.

- [x] **C2. Public `/admin/health` observability page**
  Read-only stats page (visible to everyone — it's a portfolio asset, not sensitive): last scrape timestamp, event counts per group, total upcoming events, total RSVPs, bot uptime (last heartbeat), last digest sent timestamp.
  **Acceptance**: Page loads in under 2s, numbers reflect live Airtable data.
  **Implementation note**: Add a `scrape_log` table in Airtable (timestamp, group, event_count, status). Bot writes a heartbeat row every 5 min to a `bot_heartbeat` table. Dashboard reads both.

---

## Phase 2 — Infrastructure (needed before or during deploy)

- [x] **13. Workflow failure alerting**
  Wrap `runWeeklyWorkflow()` in a top-level `try/catch` that sends a Telegram message on failure. Critical once deployed — a silently missed Sunday scrape on a remote server is invisible without this.

- [x] **14. Scrape health check**
  If the weekly scrape returns fewer than ~5 events total (suggesting a Meetup GraphQL API change), send a Telegram alert: *"⚠️ Scraper returned only N events — check the API."*

- [x] **15. Fix stale comment in `weekly-workflow.ts`**
  Line 29 still says `// 2. Scrape all 6 URLs` — update to reflect the current 8 groups.

- [ ] **17. Switch Telegram bot from polling to webhooks**
  Polling doesn't survive serverless and is fragile on Railway restarts. Webhooks require a public HTTPS endpoint — which you'll have after A1/A2.
  **Do this as part of A2** — it's the natural time.

---

## Phase 3 — AI / Showcase Features (post-deploy, high portfolio value)

- [ ] **9. Personalized recommendations in Sunday digest**
  Extend the weekly digest system prompt with past RSVP history so Claude can append a *"you'd probably like these 3 events"* section to the Sunday message. Visible AI feature — great talking point.

- [ ] **11. Post-event attendance + rating**
  Add `attended` (boolean) and `rating` (1–5) fields to Airtable. Bot asks the day after an RSVP'd event: *"Did you make it to [Event]? How was it? (1–5)"* Builds a personal dataset that feeds #9 over time.

- [ ] **12. Monthly recap digest**
  On the first Sunday of each month, send a short Telegram summary before the regular digest: *"Last month: attended 4 events, top-rated: [X]."* Derived from Airtable data + a small Claude call.

- [ ] **7. Day-before reminders**
  A nightly cron job that checks for RSVP'd events happening tomorrow and sends a Telegram message: *"🔔 Reminder: [Event Name] tomorrow at 7 PM – [Location]."* One new file, ~20 lines.

---

## Phase 4 — Nice-to-haves

- [ ] **10. Mid-week scrape**
  Add a second cron entry (e.g. Wednesday noon) to catch events posted mid-week.

- [ ] **16. Group management UI in the dashboard**
  Settings page to add/remove meetup group URLs without editing `urls.ts`. Owner-only (gated by B3). Config stored in Airtable.

- [ ] **18. Export RSVP'd events to `.ics`**
  Dashboard button to download an `.ics` file of all upcoming RSVP'd events.

---

## Done ✓

- [x] **1. Replace `alert()` with toast notifications**
- [x] **2. Group filter chips**
- [x] **3. Search bar**
- [x] **4. Event detail drawer / modal**
- [x] **5. RSVP count badge on tabs**
- [x] **6. Event conflict detection**
- [x] **8. Smarter RSVP cancellation**
- [x] **B1. NextAuth with Google provider** — sign-in via Google SSO
- [x] **B2. Persistent NavBar** — sign in/out on every page
- [x] **B3. API-level owner guards** — 401 on write routes for non-owners
- [x] **B4. Owner-only UI** — RSVP/Cancel/Scrape buttons hidden for visitors
- [x] **C1. Landing page at `/`** — hero, features, architecture flow, tech stack
- [x] **C2. `/admin/health` observability page** — live scrape stats, event counts per group, RSVP count
- [x] **13. Workflow failure alerting** — Telegram alert on Sunday workflow crash
- [x] **14. Scrape health check** — Telegram alert if scraper returns < 5 events
- [x] **15. Stale comment fix** — weekly-workflow.ts already reflected 8 groups
- [x] **A1. Deploy dashboard to Vercel** — live at https://dcdataandai.com
