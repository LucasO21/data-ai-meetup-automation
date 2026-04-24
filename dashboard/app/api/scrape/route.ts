import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runScraperAgent } from "@backend/agents/scraper-agent";
import { insertNewEvents, insertScrapeLog } from "@backend/agents/airtable-agent";

function isOwner(email?: string | null) {
  return !!email && email === process.env.OWNER_EMAIL;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!isOwner(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startMs = Date.now();
  try {
    const scraped = await runScraperAgent();
    const inserted = await insertNewEvents(scraped);

    const counts: Record<string, number> = {};
    for (const e of scraped) counts[e.groupName] = (counts[e.groupName] ?? 0) + 1;

    await insertScrapeLog({
      timestamp: new Date().toISOString(),
      source: "dashboard",
      totalScraped: scraped.length,
      newInserted: inserted,
      archived: 0,
      durationMs: Date.now() - startMs,
      status: "success",
      groupBreakdown: JSON.stringify(counts),
    });

    return NextResponse.json({ success: true, scraped: scraped.length, inserted });
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : (typeof err === "string" ? err : JSON.stringify(err) ?? "Unknown error");
    console.error("[scrape] Error:", err);
    await insertScrapeLog({
      timestamp: new Date().toISOString(),
      source: "dashboard",
      totalScraped: 0,
      newInserted: 0,
      archived: 0,
      durationMs: Date.now() - startMs,
      status: "error",
      error: message,
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
