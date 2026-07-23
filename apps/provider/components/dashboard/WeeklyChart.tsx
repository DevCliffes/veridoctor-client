"use client";

interface DayData {
  date: string;
  day: string;
  count: number;
}

interface WeeklyChartProps {
  weeklyData: DayData[];
  loading: boolean;
}

export function WeeklyChart({ weeklyData, loading }: WeeklyChartProps) {
  const today = new Date().toISOString().split("T")[0];
  const max = Math.max(...weeklyData.map((d) => d.count), 1);
  const total = weeklyData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Weekly Appointments</h2>
        <span className="text-2xl font-semibold text-foreground">{total}</span>
      </div>

      {loading ? (
        <div className="h-24 bg-muted animate-pulse rounded" />
      ) : weeklyData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
      ) : (
        <div className="flex items-end gap-2 h-24">
          {weeklyData.map((d) => {
            const isToday = d.date === today;
            const heightPct = (d.count / max) * 100;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{d.count}</span>
                <div className="w-full h-16 flex items-end">
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      isToday ? "bg-blue-700" : "bg-blue-200"
                    }`}
                    style={{
                      height: `${heightPct}%`,
                      minHeight: d.count > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span
                  className={`text-xs ${
                    isToday ? "text-blue-600 font-bold" : "text-muted-foreground"
                  }`}
                >
                  {d.day}
                </span>
              </div>
            );
          })}
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
