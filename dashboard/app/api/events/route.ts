import { NextRequest, NextResponse } from "next/server";
import {
  getAllUpcomingEvents,
  getRsvpdEvents,
  getPastEvents,
} from "@backend/agents/airtable-agent";

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab") ?? "upcoming";

  try {
    let events;
    if (tab === "rsvpd") {
      events = await getRsvpdEvents();
    } else if (tab === "past") {
      events = await getPastEvents();
    } else {
      events = await getAllUpcomingEvents();
    }
    return NextResponse.json({ events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
