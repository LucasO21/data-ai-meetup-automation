type Status = "rsvpd" | "upcoming" | "past";

const styles: Record<Status, string> = {
  rsvpd: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  upcoming: "bg-blue-100 text-blue-800 border border-blue-200",
  past: "bg-gray-100 text-gray-600 border border-gray-200",
};

const labels: Record<Status, string> = {
  rsvpd: "RSVP'd",
  upcoming: "Upcoming",
  past: "Past",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export const groupColors: Record<string, string> = {
  "Data Visualization DC": "bg-purple-100 text-purple-800",
  "Generative AI DC": "bg-orange-100 text-orange-800",
  "AI in Practice": "bg-cyan-100 text-cyan-800",
  "Data Science DC": "bg-indigo-100 text-indigo-800",
  "ProductTank DC": "bg-rose-100 text-rose-800",
  "DC Code & Coffee": "bg-amber-100 text-amber-800",
  "AI Safety Awareness DC": "bg-teal-100 text-teal-800",
  "Bitcoin District": "bg-yellow-100 text-yellow-800",
};

export function GroupBadge({ name }: { name: string }) {
  const color = groupColors[name] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {name}
    </span>
  );
}
