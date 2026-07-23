"use client";

interface PendingActionsProps {
  onNavigate: (path: string) => void;
}

// NOTE: verify these two paths against your actual route names --
// I don't have visibility into where "lab results" and "patient messages"
// actually live in this app, so these are best-guess placeholders.
// "/prescriptions?filter=expiring" mirrors the existing Quick Actions
// pattern (e.g. "/appointments?filter=past" for Patient records), so
// that one should be correct as-is.
const actions = [
  {
    icon: "🧪",
    title: "Lab results ready",
    sub: "2 patients · review needed",
    badge: "Urgent",
    badgeStyle: "bg-red-100 text-red-800",
    path: "/lab-results?status=ready", // TODO: confirm real route
  },
  {
    icon: "💊",
    title: "Prescription renewals",
    sub: "1 expiring today",
    badge: "Today",
    badgeStyle: "bg-amber-100 text-amber-800",
    path: "/prescriptions?filter=expiring",
  },
  {
    icon: "💬",
    title: "Patient messages",
    sub: "3 unread",
    badge: "New",
    badgeStyle: "bg-blue-100 text-blue-800",
    path: "/messages?filter=unread", // TODO: confirm real route
  },
];

export function PendingActions({ onNavigate }: PendingActionsProps) {
  return (
    <div className="bg-card shadow-md rounded-lg p-4 border border-border">
      <p className="font-bold text-foreground mb-3">Pending actions</p>
      <div className="divide-y divide-border">
        {actions.map((item) => (
          <button
            key={item.title}
            onClick={() => onNavigate(item.path)}
            className="w-full flex items-start gap-3 py-3 first:pt-0 last:pb-0 hover:bg-accent -mx-1 px-1 rounded transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${item.badgeStyle}`}
            >
              {item.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
