/**
 * Quick smoke tests for each agent.
 * Run individual tests:
 *   npx tsx test.ts airtable
 *   npx tsx test.ts scraper
 *   npx tsx test.ts scraper-one
 *   npx tsx test.ts calendar
 *   npx tsx test.ts email
 *   npx tsx test.ts workflow
 */

const target = process.argv[2];

if (!target) {
  console.log("Usage: npx tsx test.ts <airtable|scraper|scraper-one|calendar|email|workflow>");
  process.exit(1);
}

// ── AIRTABLE ────────────────────────────────────────────────────────────────
if (target === "airtable") {
  const { getAllUpcomingEvents, getExistingEventUrls } = await import(
    "./agents/airtable-agent.js"
  );

  console.log("Testing Airtable connection...");
  const urls = await getExistingEventUrls();
  console.log(`✓ Connected. Existing event URLs in table: ${urls.size}`);

  const upcoming = await getAllUpcomingEvents();
  console.log(`✓ Upcoming events (rsvpFlag any): ${upcoming.length}`);
  if (upcoming.length > 0) {
    console.log("  Sample:", upcoming[0]!.eventName, "|", upcoming[0]!.eventDate);
  }
}

// ── SCRAPER (all URLs) ───────────────────────────────────────────────────────
if (target === "scraper") {
  const { runScraperAgent } = await import("./agents/scraper-agent.js");

  console.log("Scraping all Meetup groups (this may take a few minutes)...");
  const events = await runScraperAgent();
  console.log(`✓ Total events scraped: ${events.length}`);
  events.forEach((e, i) =>
    console.log(`  ${i + 1}. [${e.groupName}] ${e.eventName} — ${e.eventDate}`)
  );
}

// ── CALENDAR ─────────────────────────────────────────────────────────────────
if (target === "calendar") {
  const { createCalendarEvent } = await import("./agents/calendar-agent.js");

  const fakeEvent = {
    id: "test-id",
    eventURL: "https://www.meetup.com/test",
    groupName: "Test Group",
    eventName: "Test Meetup Event",
    eventDescription: "This is a test event created by the smoke test.",
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    eventLocation: "Washington, DC",
    rsvpFlag: false,
  };

  console.log("Creating a test Google Calendar event…");
  const calId = await createCalendarEvent(fakeEvent);
  console.log(`✓ Calendar event created: ${calId}`);
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────
if (target === "email") {
  const { sendConfirmationEmail } = await import("./agents/email-agent.js");

  const fakeEvent = {
    id: "test-id",
    eventURL: "https://www.meetup.com/test",
    groupName: "Test Group",
    eventName: "Test Meetup Event",
    eventDescription: "This is a test event.",
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    eventLocation: "Washington, DC",
    rsvpFlag: false,
  };

  console.log("Sending test confirmation email…");
  await sendConfirmationEmail(fakeEvent);
  console.log("✓ Email sent — check your Gmail.");
}

// ── WORKFLOW (dry-run: skip scraper, use existing Airtable events) ────────────
if (target === "workflow") {
  const { getAllUpcomingEvents } = await import("./agents/airtable-agent.js");

  console.log("Dry-run weekly workflow (no scraping, uses existing Airtable data)…");
  const upcoming = await getAllUpcomingEvents();
  console.log(`✓ Fetched ${upcoming.length} upcoming events from Airtable`);
}

// ── SCRAPER (one URL only, fast test) ────────────────────────────────────────
if (target === "scraper-one") {
  const { MEETUP_URLS } = await import("./config/urls.js");
  const puppeteer = (await import("puppeteer")).default;
  const Anthropic = (await import("@anthropic-ai/sdk")).default;

  const { groupName, url } = MEETUP_URLS[0]!;
  console.log(`Scraping single group: ${groupName}`);

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
  const html = await page.content();
  await browser.close();
  console.log(`✓ Page fetched (${html.length} chars)`);

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Extract upcoming events from this Meetup page as a JSON array. Group: ${groupName}. Return only JSON array or []. HTML:\n${html.slice(0, 60_000)}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  const match = text?.type === "text" ? text.text.match(/\[[\s\S]*\]/) : null;
  const events = match ? JSON.parse(match[0]) : [];
  console.log(`✓ Events found: ${events.length}`);
  events.forEach((e: any) => console.log(`  - ${e.eventName} | ${e.eventDate}`));
}
