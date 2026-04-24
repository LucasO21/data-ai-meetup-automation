"use client";

import { useState } from "react";
import { StatusBadge, GroupBadge } from "./StatusBadge";

export interface EventRow {
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export function EventCard({
  event,
  onRsvp,
  onCancel,
  isPast,
  onClick,
  isOwner,
}: {
  event: EventRow;
  onRsvp: (id: string) => Promise<void>;
  onCancel: (id: string, calId?: string) => Promise<void>;
  isPast: boolean;
  onClick?: () => void;
  isOwner: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleRsvp = async () => {
    setLoading(true);
    await onRsvp(event.id);
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    await onCancel(event.id, event.calendarEventId);
    setLoading(false);
  };

  const status = isPast ? "past" : event.rsvpFlag ? "rsvpd" : "upcoming";

  return (
    <div
      className={`bg-white rounded-xl border ${isPast ? "border-gray-200 opacity-75" : "border-gray-200"} p-5 shadow-sm hover:shadow-md transition-shadow ${onClick ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        onClick?.();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <GroupBadge name={event.groupName} />
            <StatusBadge status={status} />
            {event.calendarEventId && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                📅 On Calendar
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 text-base leading-snug">
            <a href={event.eventURL} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
              {event.eventName}
            </a>
          </h3>
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            <p>🕐 {formatDate(event.eventDate)}</p>
            <p>📍 {event.eventLocation}</p>
          </div>
          {event.eventDescription && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-2">{event.eventDescription}</p>
          )}
        </div>

        {!isPast && isOwner && (
          <div className="shrink-0">
            {event.rsvpFlag ? (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {loading ? "…" : "Cancel RSVP"}
              </button>
            ) : (
              <button
                onClick={handleRsvp}
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "…" : "RSVP"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
