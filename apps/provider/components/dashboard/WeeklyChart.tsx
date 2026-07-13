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

  // viewBox stays in its own coordinate space (unitless, purely for the
  // path math below) — what matters for the aspect ratio staying correct
  // across container widths is that the rendered <svg> element is sized
  // with an aspect-ratio Tailwind class (aspect-[5/1], matching W:H below)
  // instead of a fixed height, so preserveAspectRatio="none" never has
  // a mismatched box to stretch into.
  const W = 400;
  const H = 80;
  const PAD_X = 16;
  const PAD_Y = 8;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const points = weeklyData.map((d, i) => ({
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
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            // aspect-[5/1] matches W=400, H=80 (400/80 = 5) — keeps the
            // rendered box's ratio locked to the viewBox's ratio at any
            // container width, so preserveAspectRatio="none" has nothing
            // to stretch and the line stays visually consistent whether
            // the sidebar is expanded or collapsed.
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
            />
            {points.map((p) => {
              const isToday = p.date === today;
              return (
                <g key={p.date}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isToday ? 5 : 3.5}
                    fill={isToday ? "#185FA5" : "#fff"}
                    stroke="#185FA5"
                    strokeWidth="2"
                  />
                  {p.count > 0 && (
                    <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#6b7280">
                      {p.count}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
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
