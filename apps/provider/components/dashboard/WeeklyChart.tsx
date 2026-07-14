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

  const W = 400;
  const H = 80;
  const PAD_X = 16;
  const PAD_Y = 8;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const points = weeklyData.map((d, i) => ({
    xPct: ((PAD_X + (i / Math.max(weeklyData.length - 1, 1)) * innerW) / W) * 100,
    yPct: ((PAD_Y + (1 - d.count / max) * innerH) / H) * 100,
    x: PAD_X + (i / Math.max(weeklyData.length - 1, 1)) * innerW,
    y: PAD_Y + (1 - d.count / max) * innerH,
    ...d,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `M${points[0].x},${H} ` +
        points.map((p) => `L${p.x},${p.y}`).join(" ") +
        ` L${points[points.length - 1].x},${H} Z`
      : "";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Weekly Appointments</h2>
        <span className="text-xs text-gray-400">Last 7 days</span>
      </div>

      {loading ? (
        <div className="w-full aspect-[5/1] bg-gray-100 animate-pulse rounded" />
      ) : weeklyData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
      ) : (
        // pt-4 gives the count labels above the highest point (near y=0%)
        // headroom so they don't crowd the top edge of the card.
        <div className="relative pt-4">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full aspect-[5/1]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#185FA5" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#185FA5" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#areaGrad)" />
            <polyline
              points={polyline}
              fill="none"
              stroke="#185FA5"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {points.map((p) => {
              const isToday = p.date === today;
              return (
                <circle
                  key={p.date}
                  cx={p.x}
                  cy={p.y}
                  r={isToday ? 5 : 3.5}
                  fill={isToday ? "#185FA5" : "#fff"}
                  stroke="#185FA5"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {/* HTML overlay for count labels — sized in real px so they
              never scale with the SVG viewBox. Bumped up from 10px/500
              gray to 13px/semibold darker gray so they stay legible at
              any zoom level, not just 100%. */}
          <div className="absolute inset-0 pointer-events-none">
            {points.map((p) => {
              if (p.count === 0) return null;
              return (
                <span
                  key={p.date}
                  className="absolute text-[13px] font-semibold text-gray-600 -translate-x-1/2 -translate-y-full whitespace-nowrap"
                  style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, marginTop: "-6px" }}
                >
                  {p.count}
                </span>
              );
            })}
          </div>

          <div className="flex justify-between mt-1 px-1">
            {weeklyData.map((d) => {
              const isToday = d.date === today;
              return (
                <span
                  key={d.date}
                  className={`text-xs ${isToday ? "text-blue-600 font-bold" : "text-gray-400"}`}
                >
                  {d.day}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-700" />
          <span className="text-xs text-gray-500">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-blue-700 bg-white" />
          <span className="text-xs text-gray-500">Other days</span>
        </div>
      </div>
    </div>
  );
}
