"use client";

import { useEffect } from "react";
import { GroupBadge, StatusBadge } from "./StatusBadge";
import type { EventRow } from "./EventCard";

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export function EventDrawer({
  event,
  onClose,
  onRsvp,
  onCancel,
  isPast,
  isOwner,
}: {
  event: EventRow | null;
  onClose: () => void;
  onRsvp: (id: string) => Promise<void>;
  onCancel: (id: string, calId?: string) => Promise<void>;
  isPast: boolean;
  isOwner: boolean;
}) {
  useEffect(() => {
    if (!event) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [event, onClose]);

  if (!event) return null;

  const status = isPast ? "past" : event.rsvpFlag ? "rsvpd" : "upcoming";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl animate-slide-in-right overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 pt-8 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <GroupBadge name={event.groupName} />
            <StatusBadge status={status} />
            {event.calendarEventId && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                📅 On Calendar
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 leading-snug pr-8">
            {event.eventName}
          </h2>

          {/* Date & Location */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">🕐</span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatDateFull(event.eventDate)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Eastern Time</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">📍</span>
              <p className="text-sm text-gray-700">{event.eventLocation}</p>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-100" />

          {/* Full description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">About this event</h3>
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {event.eventDescription || "No description available."}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <a
              href={event.eventURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Open on Meetup
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {!isPast && isOwner && (
              event.rsvpFlag ? (
                <button
                  onClick={() => onCancel(event.id, event.calendarEventId)}
                  className="w-full px-4 py-2.5 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Cancel RSVP
                </button>
              ) : (
                <button
                  onClick={() => onRsvp(event.id)}
                  className="w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  RSVP
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
