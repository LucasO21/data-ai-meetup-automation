import {
  archivePastUnrsvpdEvents,
  getAllUpcomingEvents,
  insertNewEvents,
  insertScrapeLog,
} from "../agents/airtable-agent.js";
import { runScraperAgent } from "../agents/scraper-agent.js";

export async function runWeeklyWorkflow(): Promise<void> {
  console.log("[workflow] Starting weekly workflow…");
  const startMs = Date.now();
  let archived = 0;
  let totalScraped = 0;
  let inserted = 0;
  let groupBreakdown = "";

  try {
    archived = await archivePastUnrsvpdEvents();
    console.log(`[workflow] Archived ${archived} past events`);

    const scraped = await runScraperAgent();
    totalScraped = scraped.length;
    console.log(`[workflow] Scraped ${totalScraped} events total`);

    if (totalScraped < 5) {
      console.warn(`[workflow] ⚠️ Only ${totalScraped} events scraped — Meetup GraphQL API may have changed`);
    }

    const counts: Record<string, number> = {};
    for (const e of scraped) counts[e.groupName] = (counts[e.groupName] ?? 0) + 1;
    groupBreakdown = JSON.stringify(counts);

    inserted = await insertNewEvents(scraped);
    console.log(`[workflow] Inserted ${inserted} new events`);

    const upcoming = await getAllUpcomingEvents();
    console.log(`[workflow] ${upcoming.length} upcoming events in Airtable`);

    await insertScrapeLog({
      timestamp: new Date().toISOString(),
      source: "weekly-workflow",
      totalScraped,
      newInserted: inserted,
      archived,
      durationMs: Date.now() - startMs,
      status: "success",
      groupBreakdown,
    });

    console.log("[workflow] Weekly workflow complete");
  } catch (err) {
    console.error("[workflow] Error:", err);
    await insertScrapeLog({
      timestamp: new Date().toISOString(),
      source: "weekly-workflow",
      totalScraped,
      newInserted: inserted,
      archived,
      durationMs: Date.now() - startMs,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      groupBreakdown,
    }).catch(() => {});
    throw err;
  }
}
