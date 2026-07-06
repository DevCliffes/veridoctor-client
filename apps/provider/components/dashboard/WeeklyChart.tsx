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

// Bars live inside an h-24 (6rem) container, so the max bar height is
// capped at 6rem — computed in rem, not px, so it scales in lockstep
// with every other Tailwind size on the page under browser zoom.
const MAX_BAR_HEIGHT_REM = 6;

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
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${(count / max) * MAX_BAR_HEIGHT_REM}rem`,
                  background: i === todayIndex ? "#185FA5" : "#B5D4F4",
                  minHeight: count > 0 ? "0.25rem" : "0",
                }}
              />
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
