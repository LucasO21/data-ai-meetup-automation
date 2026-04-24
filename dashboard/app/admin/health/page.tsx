import Link from "next/link";
import { getScrapeLogs, getAllUpcomingEvents, getRsvpdEvents } from "@backend/agents/airtable-agent";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor(diff / 60_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [logs, upcoming, rsvpd] = await Promise.all([
    getScrapeLogs(10),
    getAllUpcomingEvents(),
    getRsvpdEvents(),
  ]);

  const lastScrape = logs[0];
  const recentLogs = logs.slice(0, 5);

  const groupCounts: Record<string, number> = {};
  for (const e of upcoming) {
    groupCounts[e.groupName] = (groupCounts[e.groupName] ?? 0) + 1;
  }

  const successRate = logs.length > 0
    ? Math.round((logs.filter((l) => l.status === "success").length / logs.length) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">System Health</h1>
            <p className="text-xs text-gray-500 mt-0.5">Live stats · refreshes every 5 min</p>
          </div>
          <Link
            href="/events"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Events
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Upcoming Events"
            value={String(upcoming.length)}
            sub="across 8 groups"
            color="blue"
          />
          <StatCard
            label="RSVP'd"
            value={String(rsvpd.length)}
            sub="on your calendar"
            color="emerald"
          />
          <StatCard
            label="Last Scrape"
            value={lastScrape ? formatRelative(lastScrape.timestamp) : "—"}
            sub={lastScrape ? `${lastScrape.totalScraped} events found` : "no data yet"}
            color={lastScrape?.status === "error" ? "red" : "gray"}
          />
          <StatCard
            label="Scrape Success"
            value={`${successRate}%`}
            sub={`last ${logs.length} runs`}
            color={successRate < 80 ? "red" : "gray"}
          />
        </div>

        {/* Last scrape detail */}
        {lastScrape && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Last Scrape
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatTs(lastScrape.timestamp)}</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  lastScrape.status === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  {lastScrape.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Scraped</p>
                  <p className="font-semibold text-gray-900">{lastScrape.totalScraped}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">New inserted</p>
                  <p className="font-semibold text-gray-900">{lastScrape.newInserted}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Duration</p>
                  <p className="font-semibold text-gray-900">{(lastScrape.durationMs / 1000).toFixed(1)}s</p>
                </div>
              </div>
              {lastScrape.error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{lastScrape.error}</p>
              )}
            </div>
          </section>
        )}

        {/* Events per group */}
        {Object.keys(groupCounts).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Upcoming Events by Group
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {Object.entries(groupCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([group, count]) => (
                  <div key={group} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-gray-700">{group}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Recent scrape history */}
        {recentLogs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Recent Scrape History
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-gray-500">{formatTs(log.timestamp)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">{log.totalScraped} scraped</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.status === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "emerald" | "red" | "gray";
}) {
  const accent = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    red: "text-red-600",
    gray: "text-gray-900",
  }[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
