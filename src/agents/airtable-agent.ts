import Airtable from "airtable";
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE, AIRTABLE_LOGS_TABLE } from "../config/constants.js";
import type { ScrapedEvent } from "./scraper-agent.js";

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE);
const logsTable = base(AIRTABLE_LOGS_TABLE);

// NOTE: before Phase 3, add a "calendarEventId" (Single line text) field to the Airtable table.

export interface AirtableEvent {
  id: string;
  eventURL: string;
  groupName: string;
  eventName: string;
  eventDescription: string;
  eventDate: string;
  eventLocation: string;
  rsvpFlag: boolean;
  calendarEventId?: string;
}

// Fetch all existing eventURLs for dedup check
export async function getExistingEventUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  await table.select({ fields: ["eventURL"] }).eachPage((records, next) => {
    records.forEach((r) => {
      const url = r.get("eventURL") as string;
      if (url) urls.add(url);
    });
    next();
  });
  return urls;
}

// Insert only events not already in Airtable (dedup by eventURL)
export async function insertNewEvents(events: ScrapedEvent[]): Promise<number> {
  const existing = await getExistingEventUrls();
  const newEvents = events.filter((e) => !existing.has(e.eventUrl));

  if (newEvents.length === 0) {
    console.log("[airtable] No new events to insert");
    return 0;
  }

  const chunks = chunkArray(newEvents, 10);
  for (const chunk of chunks) {
    await table.create(
      chunk.map((e) => ({
        fields: {
          eventURL: e.eventUrl,
          groupName: e.groupName,
          eventName: e.eventName,
          eventDescription: e.eventDescription.slice(0, 5000),
          eventDate: e.eventDate,
          eventLocation: e.eventLocation,
          rsvpFlag: false,
        },
      }))
    );
  }

  console.log(`[airtable] Inserted ${newEvents.length} new events`);
  return newEvents.length;
}

// Fetch all upcoming events (future date, any rsvpFlag)
export async function getAllUpcomingEvents(): Promise<AirtableEvent[]> {
  const now = new Date().toISOString();
  const records: AirtableEvent[] = [];

  await table
    .select({
      filterByFormula: `IS_AFTER({eventDate}, '${now}')`,
      sort: [{ field: "eventDate", direction: "asc" }],
    })
    .eachPage((page, next) => {
      page.forEach((r) => {
        const calId = r.get("calendarEventId") as string | undefined;
        records.push({
          id: r.id,
          eventURL: r.get("eventURL") as string,
          groupName: r.get("groupName") as string,
          eventName: r.get("eventName") as string,
          eventDescription: r.get("eventDescription") as string,
          eventDate: r.get("eventDate") as string,
          eventLocation: r.get("eventLocation") as string,
          rsvpFlag: (r.get("rsvpFlag") as boolean) ?? false,
          ...(calId ? { calendarEventId: calId } : {}),
        });
      });
      next();
    });

  return records;
}

// Fetch upcoming events where rsvpFlag = true
export async function getRsvpdEvents(): Promise<AirtableEvent[]> {
  const now = new Date().toISOString();
  const records: AirtableEvent[] = [];

  await table
    .select({
      filterByFormula: `AND({rsvpFlag} = TRUE(), IS_AFTER({eventDate}, '${now}'))`,
      sort: [{ field: "eventDate", direction: "asc" }],
    })
    .eachPage((page, next) => {
      page.forEach((r) => {
        const calId = r.get("calendarEventId") as string | undefined;
        records.push({
          id: r.id,
          eventURL: r.get("eventURL") as string,
          groupName: r.get("groupName") as string,
          eventName: r.get("eventName") as string,
          eventDescription: r.get("eventDescription") as string,
          eventDate: r.get("eventDate") as string,
          eventLocation: r.get("eventLocation") as string,
          rsvpFlag: true,
          ...(calId ? { calendarEventId: calId } : {}),
        });
      });
      next();
    });

  return records;
}

// Fetch past events (eventDate < now), sorted most recent first
export async function getPastEvents(): Promise<AirtableEvent[]> {
  const now = new Date().toISOString();
  const records: AirtableEvent[] = [];

  await table
    .select({
      filterByFormula: `IS_BEFORE({eventDate}, '${now}')`,
      sort: [{ field: "eventDate", direction: "desc" }],
    })
    .eachPage((page, next) => {
      page.forEach((r) => {
        const calId = r.get("calendarEventId") as string | undefined;
        records.push({
          id: r.id,
          eventURL: r.get("eventURL") as string,
          groupName: r.get("groupName") as string,
          eventName: r.get("eventName") as string,
          eventDescription: r.get("eventDescription") as string,
          eventDate: r.get("eventDate") as string,
          eventLocation: r.get("eventLocation") as string,
          rsvpFlag: (r.get("rsvpFlag") as boolean) ?? false,
          ...(calId ? { calendarEventId: calId } : {}),
        });
      });
      next();
    });

  return records;
}

// Mark an event as RSVP'd and store its calendar event ID
export async function confirmRsvp(
  recordId: string,
  calendarEventId: string
): Promise<void> {
  await table.update(recordId, { rsvpFlag: true, calendarEventId });
  console.log(`[airtable] Confirmed RSVP for record ${recordId}`);
}

// Cancel RSVP: set rsvpFlag to false and clear calendarEventId
export async function cancelRsvp(recordId: string): Promise<void> {
  await table.update(recordId, { rsvpFlag: false, calendarEventId: "" });
  console.log(`[airtable] Cancelled RSVP for record ${recordId}`);
}

// Archive past events where rsvpFlag is still false
export async function archivePastUnrsvpdEvents(): Promise<number> {
  const now = new Date().toISOString();
  const toArchive: string[] = [];

  await table
    .select({
      filterByFormula: `AND({rsvpFlag} = FALSE(), IS_BEFORE({eventDate}, '${now}'))`,
    })
    .eachPage((records, next) => {
      records.forEach((r) => toArchive.push(r.id));
      next();
    });

  if (toArchive.length === 0) {
    console.log("[airtable] No past events to archive");
    return 0;
  }

  const chunks = chunkArray(toArchive, 10);
  for (const chunk of chunks) {
    await table.destroy(chunk);
  }

  console.log(`[airtable] Archived ${toArchive.length} past unRSVP'd events`);
  return toArchive.length;
}

/**
 * Check if a given event time conflicts with any already-RSVP'd events.
 * Two events "conflict" if their start times are within OVERLAP_HOURS of each other.
 */
const OVERLAP_HOURS = 2;

export async function checkConflicts(eventDate: string, excludeId?: string): Promise<AirtableEvent[]> {
  const rsvpd = await getRsvpdEvents();
  const targetMs = new Date(eventDate).getTime();
  const windowMs = OVERLAP_HOURS * 60 * 60 * 1000;

  return rsvpd.filter((e) => {
    if (e.id === excludeId) return false;
    const diff = Math.abs(new Date(e.eventDate).getTime() - targetMs);
    return diff < windowMs;
  });
}

// ─── Scrape Logs ────────────────────────────────────────────────────────────

export interface ScrapeLog {
  id: string;
  timestamp: string;
  source: string;
  totalScraped: number;
  newInserted: number;
  archived: number;
  durationMs: number;
  status: "success" | "error";
  error?: string;
  groupBreakdown?: string;
}

export async function insertScrapeLog(log: Omit<ScrapeLog, "id">): Promise<void> {
  await logsTable.create([{
    fields: {
      timestamp: log.timestamp,
      source: log.source,
      totalScraped: log.totalScraped,
      newInserted: log.newInserted,
      archived: log.archived,
      durationMs: String(log.durationMs),
      status: log.status,
      error: log.error ?? "",
      groupBreakdown: log.groupBreakdown ?? "",
    },
  }]);
  console.log(`[airtable] Inserted scrape log (${log.source}, ${log.status})`);
}

export async function getScrapeLogs(limit = 50): Promise<ScrapeLog[]> {
  const records: ScrapeLog[] = [];

  await logsTable
    .select({
      sort: [{ field: "timestamp", direction: "desc" }],
      maxRecords: limit,
    })
    .eachPage((page, next) => {
      page.forEach((r) => {
        records.push({
          id: r.id,
          timestamp: (r.get("timestamp") as string) ?? "",
          source: (r.get("source") as string) ?? "",
          totalScraped: (r.get("totalScraped") as number) ?? 0,
          newInserted: (r.get("newInserted") as number) ?? 0,
          archived: (r.get("archived") as number) ?? 0,
          durationMs: Number(r.get("durationMs") ?? 0),
          status: (r.get("status") as "success" | "error") ?? "success",
          ...((r.get("error") as string | undefined) ? { error: r.get("error") as string } : {}),
          ...((r.get("groupBreakdown") as string | undefined) ? { groupBreakdown: r.get("groupBreakdown") as string } : {}),
        });
      });
      next();
    });

  return records;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
