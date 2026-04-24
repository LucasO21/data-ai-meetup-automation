import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllUpcomingEvents, getPastEvents, confirmRsvp, cancelRsvp, checkConflicts } from "@backend/agents/airtable-agent";
import { createCalendarEvent, deleteCalendarEvent } from "@backend/agents/calendar-agent";

function isOwner(email?: string | null) {
  return !!email && email === process.env.OWNER_EMAIL;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isOwner(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordId } = await req.json() as { recordId: string };

  try {
    const [upcoming, past] = await Promise.all([getAllUpcomingEvents(), getPastEvents()]);
    const event = [...upcoming, ...past].find((e) => e.id === recordId);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const conflicts = await checkConflicts(event.eventDate, event.id);

    const calendarEventId = await createCalendarEvent(event);
    await confirmRsvp(recordId, calendarEventId);

    return NextResponse.json({
      success: true,
      calendarEventId,
      conflicts: conflicts.map((c) => ({ eventName: c.eventName, eventDate: c.eventDate })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isOwner(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordId, calendarEventId } = await req.json() as { recordId: string; calendarEventId?: string };

  try {
    if (calendarEventId) {
      await deleteCalendarEvent(calendarEventId);
    }
    await cancelRsvp(recordId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
