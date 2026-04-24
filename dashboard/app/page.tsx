import { BrowseEventsButton } from "../components/BrowseEventsButton";

const visitorFeatures = [
  {
    icon: "📅",
    title: "All DC Tech Meetups",
    description: "Events from 8 DC data, AI, and engineering groups in one feed.",
  },
  {
    icon: "🔎",
    title: "Search & Filter",
    description: "Search by keyword, filter by group, or narrow by date range.",
  },
];

const ownerTools = [
  {
    icon: "✅",
    title: "One-Click RSVP",
    description: "RSVP adds a Google Calendar invite and sends a Gmail confirmation.",
  },
  {
    icon: "🗂️",
    title: "RSVP'd Tab",
    description: "View and cancel RSVPs in one click.",
  },
  {
    icon: "⚡",
    title: "Manual Scrape Trigger",
    description: "Run the Meetup scraper on demand.",
  },
  {
    icon: "📝",
    title: "Scrape Logs",
    description: "Review past scraper runs and per-group event counts.",
  },
];

const stack = [
  "TypeScript",
  "Next.js 16",
  "Tailwind",
  "Airtable",
  "Meetup GraphQL",
  "Google Calendar API",
  "Gmail API",
  "NextAuth",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Live · Updated every Sunday
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
          DC Data & AI Meetup Events Board
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Browse upcoming and past DC tech meetups across data, AI, and engineering groups.
          Refreshed every Sunday.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <BrowseEventsButton />
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <hr className="border-gray-100" />
      </div>

      {/* Visitor Features */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
          For Visitors
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {visitorFeatures.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white transition-all"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Owner Tools */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
          Owner Tools
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {ownerTools.map((f) => (
            <div
              key={f.title}
              className="relative p-6 rounded-2xl border border-dashed border-gray-200 bg-white"
            >
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                <span>🔒</span> Owner only
              </span>
              <span className="text-2xl grayscale opacity-80">{f.icon}</span>
              <h3 className="mt-3 font-semibold text-gray-700">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works + Built with */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-2xl bg-gray-900 text-white p-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
            How it works
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
            {[
              { label: "Meetup GraphQL", color: "bg-orange-500/20 text-orange-300" },
              { label: "→", color: "text-gray-500" },
              { label: "Scraper Agent", color: "bg-blue-500/20 text-blue-300" },
              { label: "→", color: "text-gray-500" },
              { label: "Airtable", color: "bg-yellow-500/20 text-yellow-300" },
              { label: "→", color: "text-gray-500" },
              { label: "Dashboard", color: "bg-emerald-500/20 text-emerald-300" },
            ].map((item, i) => (
              <span
                key={i}
                className={`px-2.5 py-1 rounded-lg ${item.color}`}
              >
                {item.label}
              </span>
            ))}
          </div>
          <hr className="my-8 border-gray-800" />

          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Built with
          </h2>
          <div className="flex flex-wrap gap-2">
            {stack.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 rounded-full border border-gray-700 text-sm text-gray-300 bg-gray-800/50"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-xs text-gray-400">
          <span>DC Meetup Automation</span>
        </div>
      </footer>
    </div>
  );
}
