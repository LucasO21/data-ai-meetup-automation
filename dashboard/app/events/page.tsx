"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { EventCard, type EventRow } from "../../components/EventCard";
import { EventDrawer } from "../../components/EventDrawer";
import { groupColors } from "../../components/StatusBadge";

type Tab = "upcoming" | "rsvpd" | "past" | "logs";
type DayFilter = 7 | 14 | 21 | 31 | "all";

const ALL_TABS: { id: Tab; label: string; ownerOnly: boolean }[] = [
  { id: "upcoming", label: "Upcoming", ownerOnly: false },
  { id: "rsvpd", label: "RSVP'd", ownerOnly: true },
  { id: "past", label: "Past", ownerOnly: false },
  { id: "logs", label: "Scrape Logs", ownerOnly: true },
];

interface ScrapeLogRow {
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

const DAY_FILTERS: { id: DayFilter; label: string }[] = [
  { id: 7, label: "7 days" },
  { id: 14, label: "14 days" },
  { id: 21, label: "21 days" },
  { id: 31, label: "31 days" },
  { id: "all", label: "All" },
];

export default function EventsPage() {
  const { data: session } = useSession();
  const isOwner = session?.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL;

  const TABS = ALL_TABS.filter((t) => !t.ownerOnly || isOwner);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerEvent, setDrawerEvent] = useState<EventRow | null>(null);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [logs, setLogs] = useState<ScrapeLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json() as { logs?: ScrapeLogRow[] };
      if (res.ok) setLogs(data.logs ?? []);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  }, []);

  const fetchRsvpCount = useCallback(async () => {
    try {
      const res = await fetch("/api/events?tab=rsvpd");
      const data = await res.json() as { events?: EventRow[] };
      if (res.ok) setRsvpCount(data.events?.length ?? 0);
    } catch { /* ignore */ }
  }, []);

  const fetchEvents = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events?tab=${t}`);
      const data = await res.json() as { events?: EventRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch events");
      setEvents(data.events ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "logs") {
      void fetchLogs();
    } else {
      void fetchEvents(tab);
    }
  }, [tab, fetchEvents, fetchLogs]);

  useEffect(() => {
    void fetchRsvpCount();
  }, [fetchRsvpCount]);

  const handleRsvp = async (id: string) => {
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: id }),
    });
    if (res.ok) {
      const d = await res.json() as { conflicts?: { eventName: string; eventDate: string }[] };
      toast.success("RSVP confirmed! Added to your calendar.");
      if (d.conflicts?.length) {
        const names = d.conflicts.map((c) => `"${c.eventName}"`).join(", ");
        toast(`⚠️ Time conflict with ${names}`, { icon: "⚠️", duration: 6000 });
      }
      void fetchEvents(tab);
      void fetchRsvpCount();
    } else {
      const d = await res.json() as { error?: string };
      toast.error(`RSVP failed: ${d.error ?? "unknown error"}`);
    }
  };

  const handleCancel = async (id: string, calendarEventId?: string) => {
    const res = await fetch("/api/rsvp", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: id, calendarEventId }),
    });
    if (res.ok) {
      toast.success("RSVP cancelled.");
      void fetchEvents(tab);
      void fetchRsvpCount();
    } else {
      const d = await res.json() as { error?: string };
      toast.error(`Cancel failed: ${d.error ?? "unknown error"}`);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapeMsg(null);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const d = await res.json() as { scraped?: number; inserted?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Scrape failed");
      setScrapeMsg(`Done — scraped ${d.scraped} events, ${d.inserted} new added.`);
      if (tab === "logs") void fetchLogs();
      else void fetchEvents(tab);
    } catch (e: unknown) {
      setScrapeMsg(`Error: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setScraping(false);
    }
  };

  const uniqueGroups = tab === "upcoming"
    ? [...new Set(events.map((e) => e.groupName))].sort()
    : [];

  const filteredEvents = events.filter((e) => {
    if (tab === "upcoming" && dayFilter !== "all") {
      const cutoff = Date.now() + dayFilter * 24 * 60 * 60 * 1000;
      if (new Date(e.eventDate).getTime() > cutoff) return false;
    }
    if (activeGroup && e.groupName !== activeGroup) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !e.eventName.toLowerCase().includes(q) &&
        !e.eventDescription.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">DC Data & AI Meetup Events Board</h1>
            <p className="text-xs text-gray-500 mt-0.5">8 groups · updated every Sunday</p>
          </div>
          {isOwner && (
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {scraping ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  Scraping…
                </>
              ) : (
                "↻ Refresh Events"
              )}
            </button>
          )}
        </div>
        {scrapeMsg && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-3">
            <p className="text-sm text-gray-600 bg-gray-100 rounded-lg px-3 py-2">{scrapeMsg}</p>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Search bar */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search events…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.id === "rsvpd" && rsvpCount > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                  tab === "rsvpd"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {rsvpCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Day filter + group chips + summary — only on Upcoming tab */}
        {tab === "upcoming" && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 mr-1">Show next:</span>
              {DAY_FILTERS.map((f) => (
                <button
                  key={String(f.id)}
                  onClick={() => setDayFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    dayFilter === f.id
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {uniqueGroups.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500 mr-1">Group:</span>
                <button
                  onClick={() => setActiveGroup(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeGroup === null
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
                  }`}
                >
                  All
                </button>
                {uniqueGroups.map((g) => (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(activeGroup === g ? null : g)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeGroup === g
                        ? (groupColors[g] ?? "bg-slate-200 text-slate-800") + " ring-2 ring-offset-1 ring-gray-400"
                        : (groupColors[g] ?? "bg-slate-100 text-slate-700") + " opacity-70 hover:opacity-100"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            {!loading && !error && (
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">{filteredEvents.length}</span> event{filteredEvents.length !== 1 ? "s" : ""}
                  {dayFilter !== "all" ? ` in next ${dayFilter} days` : " total"}
                </span>
                {isOwner && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-600">
                      <span className="font-semibold text-emerald-700">{filteredEvents.filter((e) => e.rsvpFlag).length}</span> RSVP'd
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {tab === "logs" ? (
          logsLoading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <span className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mr-3" />
              Loading logs…
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-xl bg-white border border-gray-200 p-12 text-center text-gray-400">
              No scrape logs yet. Trigger a scrape to create the first log entry.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Scraped</th>
                    <th className="px-4 py-3 text-right">New</th>
                    <th className="px-4 py-3 text-right">Archived</th>
                    <th className="px-4 py-3 text-right">Duration</th>
                    <th className="px-4 py-3">Groups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    const groups: Record<string, number> = log.groupBreakdown ? JSON.parse(log.groupBreakdown) : {};
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                            timeZone: "America/New_York",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.source === "dashboard"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-purple-50 text-purple-700"
                          }`}>
                            {log.source === "weekly-workflow" ? "cron" : log.source}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.status === "success" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">success</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700" title={log.error}>error</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{log.totalScraped}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{log.newInserted}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{log.archived}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{(log.durationMs / 1000).toFixed(1)}s</td>
                        <td className="px-4 py-3">
                          {Object.keys(groups).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(groups).map(([name, count]) => (
                                <span key={name} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${groupColors[name] ?? "bg-slate-100 text-slate-700"}`}>
                                  {count}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <span className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mr-3" />
            Loading events…
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-12 text-center text-gray-400">
            {tab === "upcoming" && dayFilter !== "all"
              ? `No events in the next ${dayFilter} days.`
              : tab === "upcoming" ? "No upcoming events. Try refreshing."
              : tab === "rsvpd" ? "No RSVP'd events yet."
              : "No past events found."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                onRsvp={handleRsvp}
                onCancel={handleCancel}
                isPast={tab === "past"}
                isOwner={isOwner}
                onClick={() => setDrawerEvent(e)}
              />
            ))}
          </div>
        )}
      </main>

      <EventDrawer
        event={drawerEvent}
        onClose={() => setDrawerEvent(null)}
        onRsvp={async (id) => {
          await handleRsvp(id);
          setDrawerEvent(null);
        }}
        onCancel={async (id, calId) => {
          await handleCancel(id, calId);
          setDrawerEvent(null);
        }}
        isPast={tab === "past"}
        isOwner={isOwner}
      />
    </div>
  );
}
