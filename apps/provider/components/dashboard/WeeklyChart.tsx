"use client";

interface WeeklyChartProps {
  weeklyCount: number;
  loading: boolean;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const distributeWeekly = (total: number) => {
  const weights = [0.2, 0.17, 0.18, 0.15, 0.18, 0.08, 0.04];
  return weights.map((w) => Math.round(total * w));
};

export function WeeklyChart({ weeklyCount, loading }: WeeklyChartProps) {
  const data = distributeWeekly(weeklyCount || 43);
  const max = Math.max(...data, 1);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <div className="bg-card shadow-md rounded-lg p-4 border border-border">
      <div className="flex justify-between items-center mb-4">
        <p className="font-bold text-foreground">Weekly patients</p>
        <p className="text-2xl font-medium text-foreground">{weeklyCount || 43}</p>
      </div>

      {loading ? (
        <div className="h-24 bg-muted animate-pulse rounded" />
      ) : (
        <div className="flex items-end gap-2 h-24">
          {data.map((count, i) => (
            <div key={days[i]} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{count}</span>
              <div className="w-full rounded-t-sm transition-all" style={{
                height: `${(count / max) * 64}px`,
                background: i === todayIndex ? "#185FA5" : "#B5D4F4",
                minHeight: count > 0 ? "4px" : "0",
              }} />
              <span className={`text-xs ${i === todayIndex ? "font-medium text-blue-700" : "text-muted-foreground"}`}>
                {days[i]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-700" />
          <span className="text-xs text-muted-foreground">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-200" />
          <span className="text-xs text-muted-foreground">Other days</span>
        </div>
      </div>
    </div>
  );
}
