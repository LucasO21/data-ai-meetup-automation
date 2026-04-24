# Product Requirements Document
## Meetup Event Tracker & RSVP Automation

**Version:** 1.0  
**Date:** March 8, 2026  
**Status:** Draft  

---

## 1. Overview

### 1.1 Purpose
An automated, agent-driven workflow that scrapes meetup events weekly, surfaces them to the user via Telegram, handles RSVP confirmation, syncs confirmed events to Google Calendar, and supports natural language queries about upcoming calendar events — all orchestrated by Claude Code.

### 1.2 Goals
- Eliminate manual effort in discovering and tracking local tech meetup events
- Create a persistent, queryable record of all events (past and upcoming) in Airtable
- Provide a conversational RSVP experience entirely through Telegram
- Ensure confirmed events are automatically reflected in Google Calendar and email

### 1.3 Non-Goals
- Automatically RSVP on Meetup.com on the user's behalf
- Track attendance or post-event notes
- Support multiple users (single-user system)
- Mobile or web UI (Telegram is the sole interface)

---

## 2. User Stories

| ID | As a user I want to… | So that… |
|---|---|---|
| US-01 | Have meetup events automatically scraped every Sunday | I don't have to manually check 6 URLs |
| US-02 | Receive a Telegram digest of new events each week | I get a clear summary without opening any apps |
| US-03 | Reply to the digest with my preferred events in priority order | The system knows which ones to add to my calendar |
| US-04 | Have confirmed events added to Google Calendar automatically | I don't have to create calendar entries manually |
| US-05 | Receive a confirmation email for each RSVP'd event | I have a paper trail in my inbox |
| US-06 | Have the Airtable RSVP flag updated on confirmation | The database stays as the source of truth |
| US-07 | Ask the Telegram bot about my upcoming meetup events | I can query my schedule conversationally at any time |

---

## 3. System Architecture

### 3.1 Component Overview

| Component | Type | Technology | Responsibility |
|---|---|---|---|
| Weekly Orchestrator | Claude Code workflow | `weekly-workflow.ts` | Chains all Sunday agents in sequence |
| Scraper Agent | Claude Agent + MCP | Puppeteer MCP | Scrapes JS-rendered Meetup pages |
| Airtable Agent | Claude Agent + MCP | Airtable MCP | Deduplication, read/write operations |
| Telegram Agent | Claude Agent + MCP | Telegram MCP | Sends digests, handles RSVP replies |
| Calendar Agent | Claude Agent + MCP | Google Calendar MCP | Creates confirmed events |
| Email Agent | Claude Agent + MCP | Gmail MCP | Sends confirmation emails |
| Telegram Chat Bot | Long-running process | `telegram-bot.ts` | Answers ad-hoc event queries |
| Scheduler | System process | node-cron / crontab | Triggers Sunday workflow at defined time |
| Process Manager | System process | pm2 | Keeps Telegram bot alive persistently |

### 3.2 MCP Dependencies

| MCP | Purpose | Auth Required |
|---|---|---|
| Puppeteer MCP | Headless browser scraping of Meetup.com | None |
| Airtable MCP | Event table CRUD operations | Airtable API Key + Base ID |
| Telegram MCP | Send/receive messages via bot | Bot Token (from @BotFather) |
| Google Calendar MCP | Create calendar events | OAuth 2.0 (already connected) |
| Gmail MCP | Send confirmation emails | OAuth 2.0 (already connected) |

---

## 4. Data Model

### 4.1 Airtable Table: `meetup_events`

| Field | Type | Description | Notes |
|---|---|---|---|
| `eventUrl` | URL | Meetup.com event URL | **Primary dedup key** — must be unique |
| `groupName` | Single line text | Name of the meetup group | e.g. "AWS User Group DC" |
| `eventName` | Single line text | Title of the event | |
| `eventDescription` | Long text | Full event description | Truncated to 5000 chars if needed |
| `eventDate` | Date/Time | Date and start time of event | ISO 8601 format |
| `eventLocation` | Single line text | Venue name and address | |
| `rsvpFlag` | Checkbox | Whether user has confirmed attendance | Default: `false` |
| `createdAt` | Date/Time | When the record was inserted | Auto-set on creation |
| `calendarEventId` | Single line text | Google Calendar event ID | Set after calendar sync |

---

## 5. Functional Requirements

### 5.1 Phase 1 — Scrape & Store (Sunday Trigger)

**FR-01:** The system SHALL scrape all 6 configured Meetup URLs every Sunday at a configured time (default: 8:00 AM local time).

**FR-02:** The Scraper Agent SHALL use a headless browser (Puppeteer MCP) to render JavaScript before extracting event data.

**FR-03:** The Scraper Agent SHALL extract the following fields from each page: `groupName`, `eventName`, `eventDescription`, `eventDate`, `eventLocation`, `eventUrl`.

**FR-04:** If a Meetup page lists multiple upcoming events, ALL upcoming events SHALL be extracted in a single scrape.

**FR-05:** The Airtable Agent SHALL query existing `eventUrl` values before inserting any records.

**FR-06:** Only events with URLs not already present in Airtable SHALL be inserted (incremental/append-only table).

**FR-07:** All new events SHALL be inserted with `rsvpFlag = false`.

---

### 5.2 Phase 2 — Weekly Telegram Digest

**FR-08:** After the scrape and store phase completes, the Telegram Agent SHALL send a formatted digest message listing all newly added events.

**FR-09:** The digest SHALL include for each event: event number, group name, event name, location, and date/time.

**FR-10:** The digest SHALL prompt the user to reply with their preferred events in priority order (e.g. `"1, 3"`) or `"none"` if not attending any.

**FR-11:** The system SHALL store a pending RSVP state (in Airtable or local state file) so the Telegram bot knows it is awaiting a reply.

**FR-12:** If no new events exist that week, the Telegram Agent SHALL send a message informing the user there are no new events.

---

### 5.3 Phase 3 — RSVP Processing

**FR-13:** The Telegram bot SHALL listen for the user's reply and parse it as a comma-separated list of event numbers or the string `"none"`.

**FR-14:** For each confirmed event, the Calendar Agent SHALL create a Google Calendar event containing: event name (title), location, start date/time, and event URL in the notes/description field.

**FR-15:** For each confirmed event, the Email Agent SHALL send a confirmation email to the user's Gmail address containing: event name, group name, date/time, location, and event URL.

**FR-16:** For each confirmed event, the Airtable Agent SHALL set `rsvpFlag = true` and store the returned `calendarEventId`.

**FR-17:** After processing all confirmed events, the Telegram Agent SHALL send a summary confirmation message (e.g. "✅ Added 2 events to your calendar!").

**FR-18:** If the user replies `"none"`, no calendar events or emails SHALL be created and the workflow SHALL end gracefully.

---

### 5.4 Phase 4 — Telegram Chat Agent (Always-On)

**FR-19:** A persistent Telegram bot process SHALL run continuously and respond to natural language queries from the user.

**FR-20:** The chat agent SHALL be able to answer at minimum the following query types:
  - "What meetups do I have this week?" → returns events where `rsvpFlag = true` and `eventDate` is within the current 7-day window
  - "What meetups are coming up?" → returns all future events where `rsvpFlag = true`
  - "Tell me about [event name]" → returns full description, location, and date for the matched event

**FR-21:** The chat agent SHALL maintain conversational context within a single session (multi-turn).

**FR-22:** The chat agent SHALL query Airtable in real time on each relevant query (not cache).

---

## 6. Non-Functional Requirements

### 6.1 Reliability
**NFR-01:** The weekly workflow SHALL implement per-URL error handling so that one failed scrape does not abort the entire run.

**NFR-02:** The system SHALL log all scrape results, Airtable writes, and RSVP actions with timestamps for debugging.

**NFR-03:** The Telegram bot process SHALL be managed by `pm2` with auto-restart on crash.

### 6.2 Performance
**NFR-04:** The full Sunday workflow (scrape → store → Telegram digest) SHALL complete within 10 minutes.

**NFR-05:** The Telegram chat agent SHALL respond to queries within 15 seconds.

### 6.3 Maintainability
**NFR-06:** The 6 source URLs SHALL be stored in a single configuration file (`config/urls.ts`) for easy modification without code changes.

**NFR-07:** Each agent SHALL be independently testable in isolation via Claude Code without triggering the full workflow.

### 6.4 Security
**NFR-08:** All API keys and tokens (Airtable, Telegram, Google OAuth) SHALL be stored in environment variables, never hardcoded.

**NFR-09:** The Telegram bot SHALL only respond to messages from the configured owner chat ID.

---

## 7. File Structure

```
meetup-tracker/
├── agents/
│   ├── scraper-agent.ts          # Puppeteer MCP scraping logic
│   ├── airtable-agent.ts         # Airtable read/write/dedup
│   ├── telegram-agent.ts         # Send digests, format messages
│   ├── calendar-agent.ts         # Google Calendar via MCP
│   └── email-agent.ts            # Gmail confirmation via MCP
├── workflows/
│   └── weekly-workflow.ts        # Sunday orchestrator entry point
├── bot/
│   └── telegram-bot.ts           # Long-running conversational agent
├── config/
│   ├── urls.ts                   # 6 Meetup source URLs
│   └── constants.ts              # Telegram chat ID, timing config
├── state/
│   └── rsvp-pending.json         # Transient RSVP state (cleared post-processing)
├── logs/
│   └── workflow.log              # Execution logs
├── cron/
│   └── schedule.ts               # node-cron Sunday trigger
├── .env                          # Environment variables (gitignored)
└── README.md
```

---

## 8. Environment Variables

```
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_NAME=meetup_events

TELEGRAM_BOT_TOKEN=
TELEGRAM_OWNER_CHAT_ID=

GOOGLE_CLIENT_ID=           # Handled by existing MCP connection
GOOGLE_CLIENT_SECRET=       # Handled by existing MCP connection

CRON_SCHEDULE=0 8 * * 0    # Every Sunday at 8AM
LOG_LEVEL=info
```

---

## 9. Error Handling & Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Meetup URL is unreachable | Log error, skip URL, continue with remaining URLs |
| Event already exists in Airtable | Skip insert silently (dedup by `eventUrl`) |
| User does not reply to Telegram digest | Pending state expires after 24 hours, workflow resets |
| User replies with invalid format | Bot prompts again with formatting instructions |
| Google Calendar API failure | Log error, notify user via Telegram, skip email step |
| Airtable write failure | Log error, do not set rsvpFlag, notify user via Telegram |
| Puppeteer fails to render page | Retry once after 30s delay, then skip with error log |
| No new events found this week | Send "No new events this week" Telegram message and exit |

---

## 10. Build & Deployment Sequence

| Step | Task | Dependency |
|---|---|---|
| 1 | Create Airtable base and table with schema | None |
| 2 | Create Telegram bot via @BotFather, note token and chat ID | None |
| 3 | Install and configure Airtable MCP | Step 1 |
| 4 | Install and configure Telegram MCP | Step 2 |
| 5 | Install Puppeteer MCP | None |
| 6 | Build and test `scraper-agent.ts` against one URL | Step 5 |
| 7 | Build and test `airtable-agent.ts` (insert + dedup) | Steps 3, 6 |
| 8 | Build and test `telegram-agent.ts` (send digest) | Step 4 |
| 9 | Build and test `calendar-agent.ts` and `email-agent.ts` | Existing MCPs |
| 10 | Wire `weekly-workflow.ts` with all agents | Steps 6–9 |
| 11 | Build `telegram-bot.ts` chat agent | Steps 3, 7 |
| 12 | Configure `schedule.ts` cron | Step 10 |
| 13 | Deploy with `pm2` — start both cron and bot processes | Steps 11, 12 |
| 14 | End-to-end test with live URLs | All steps |

---

## 11. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| OQ-01 | What are the 6 Meetup source URLs? Required before build can start. | User | High |
| OQ-02 | What time on Sunday should the workflow trigger? | User | Medium |
| OQ-03 | Should the digest include events from ALL 6 groups or only new events from the current week? | User | High |
| OQ-04 | Should the confirmation email go to the Gmail account tied to the existing MCP, or a different address? | User | Medium |
| OQ-05 | Should events that pass (date is now in the past, rsvpFlag still false) be archived or left as-is? | User | Low |
| OQ-06 | Is there a maximum number of events per digest before it gets truncated? | User | Low |
