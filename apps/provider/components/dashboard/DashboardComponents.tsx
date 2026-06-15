// ─── PendingActions ───────────────────────────────────────────────────────────

interface PendingActionsProps {
  onNavigate: (path: string) => void;
}

const actions = [
  {
    icon: "🧪",
    title: "Lab results ready",
    sub: "2 patients · review needed",
    badge: "Urgent",
    badgeStyle: "bg-red-100 text-red-800",
    path: "/services",
  },
  {
    icon: "💊",
    title: "Prescription renewals",
    sub: "1 expiring today",
    badge: "Today",
    badgeStyle: "bg-amber-100 text-amber-800",
    path: "/patients",
  },
  {
    icon: "💬",
    title: "Patient messages",
    sub: "3 unread",
    badge: "New",
    badgeStyle: "bg-blue-100 text-blue-800",
    path: "/patients",
  },
];

export function PendingActions({ onNavigate }: PendingActionsProps) {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <p className="font-bold mb-3">Pending actions</p>
      <div className="divide-y divide-gray-100">
        {actions.map((item) => (
          <button
            key={item.title}
            onClick={() => onNavigate(item.path)}
            className="w-full flex items-start gap-3 py-3 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
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

// ─── WeeklyChart ──────────────────────────────────────────────────────────────

interface WeeklyChartProps {
  weeklyCount: number;
  loading: boolean;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Distribute weekly count across days with a realistic-ish curve
const distributeWeekly = (total: number) => {
  const weights = [0.2, 0.17, 0.18, 0.15, 0.18, 0.08, 0.04];
  return weights.map((w) => Math.round(total * w));
};

export function WeeklyChart({ weeklyCount, loading }: WeeklyChartProps) {
  const data = distributeWeekly(weeklyCount || 43);
  const max = Math.max(...data, 1);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <p className="font-bold">Weekly patients</p>
        <p className="text-2xl font-medium">{weeklyCount || 43}</p>
      </div>

      {loading ? (
        <div className="h-24 bg-gray-100 animate-pulse rounded" />
      ) : (
        <div className="flex items-end gap-2 h-24">
          {data.map((count, i) => (
            <div key={days[i]} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">{count}</span>
              <div className="w-full rounded-t-sm transition-all" style={{
                height: `${(count / max) * 64}px`,
                background: i === todayIndex ? "#185FA5" : "#B5D4F4",
                minHeight: count > 0 ? "4px" : "0",
              }} />
              <span className={`text-xs ${i === todayIndex ? "font-medium text-blue-700" : "text-gray-400"}`}>
                {days[i]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-700" />
          <span className="text-xs text-gray-500">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-200" />
          <span className="text-xs text-gray-500">Other days</span>
        </div>
      </div>
    </div>
  );
}


