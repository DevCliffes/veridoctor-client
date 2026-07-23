"use client";
import { useEffect, useMemo, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";

interface TrendDataPoint {
  date: string;
  completed_revenue: number;
  lost_revenue: number;
  virtual_count: number;
  physical_count: number;
}

type RangeOption = "last_7_days" | "this_month" | "last_30_days" | "month";

interface AppointmentTrendChartsProps {
  identityId: string;
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

// Short weekday name for small ranges (e.g. "Mon"), "24/7" (day/month)
// for larger ranges where full weekday names would collide and a bare
// day number ("24") is ambiguous about which month it's in.
function formatDayLabel(dateStr: string, useShortForm: boolean) {
  const d = new Date(dateStr + "T00:00:00");
  if (useShortForm) {
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
  return d.toLocaleDateString("en-KE", { weekday: "short" });
}

// Fuller date for tooltip content, e.g. "Mon, 14 Jul 2026" — always
// unambiguous regardless of which range/label mode the chart is in.
function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Decides which indices in the data array actually get a visible label,
// so long ranges (30 days, a full month) don't cram in every single date
// and become illegible. Short ranges show every label.
function getLabelStep(length: number) {
  if (length <= 10) return 1;
  if (length <= 20) return 3;
  return 5;
}

export function AppointmentTrendCharts({ identityId }: AppointmentTrendChartsProps) {
  const [range, setRange] = useState<RangeOption>("this_month");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueTooltip, setRevenueTooltip] = useState<TooltipState | null>(null);
  const [apptTooltip, setApptTooltip] = useState<TooltipState | null>(null);

  const monthOptions = useMemo(() => formatMonthOptions(), []);

  useEffect(() => {
    if (!identityId) return;
    setLoading(true);
    const params: Record<string, string> = { range };
    if (range === "month") params.month = selectedMonth;
    axiosClient
      .get(`/appointments/provider/${identityId}/appointments/trend/`, { params })
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("Trend fetch failed:", err);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [identityId, range, selectedMonth]);

  const totalRevenue = data.reduce((sum, d) => sum + d.completed_revenue, 0);
  const totalAppointments = data.reduce(
    (sum, d) => sum + d.virtual_count + d.physical_count,
    0
  );
  const maxRevenue = Math.max(
    ...data.map((d) => Math.max(d.completed_revenue, d.lost_revenue)),
    1
  );
  const maxCount = Math.max(
    ...data.map((d) => Math.max(d.virtual_count, d.physical_count)),
    1
  );

  const useShortForm = data.length > 10;
  const labelStep = getLabelStep(data.length);

  const filterButtons: { value: RangeOption; label: string }[] = [
    { value: "last_7_days", label: "Last 7 days" },
    { value: "this_month", label: "This month" },
    { value: "last_30_days", label: "Last 30 days" },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {filterButtons.map((f) => (
          <button
            key={f.value}
            onClick={() => setRange(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              range === f.value
                ? "bg-blue-700 text-white border-blue-700"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
        <select
          value={range === "month" ? selectedMonth : ""}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setRange("month");
          }}
          className={`px-3 py-1.5 rounded-lg text-sm border bg-card ${
            range === "month"
              ? "border-blue-700 text-blue-700 font-medium"
              : "border-border text-muted-foreground"
          }`}
        >
          <option value="" disabled>
            Pick a month
          </option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Revenue</h2>
          <span className="text-2xl font-semibold text-foreground">
            KES {totalRevenue.toLocaleString()}
          </span>
        </div>
        {loading ? (
          <div className="h-24 bg-muted animate-pulse rounded" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : (
          <>
            <div className="relative">
              {revenueTooltip && (
                <div
                  className="absolute z-10 bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none -translate-x-1/2"
                  style={{ left: revenueTooltip.x, bottom: revenueTooltip.y }}
                >
                  <p className="font-semibold text-foreground mb-1">
                    {formatFullDate(data[revenueTooltip.index].date)}
                  </p>
                  <p className="text-blue-500">
                    Completed: KES {data[revenueTooltip.index].completed_revenue.toLocaleString()}
                  </p>
                  <p className="text-red-400">
                    Cancelled/no-show: KES {data[revenueTooltip.index].lost_revenue.toLocaleString()}
                  </p>
                </div>
              )}
              <div className="flex items-end gap-1 h-24">
                {data.map((d, i) => {
                  const completedPct = (d.completed_revenue / maxRevenue) * 100;
                  const lostPct = (d.lost_revenue / maxRevenue) * 100;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex items-end gap-0.5 h-full cursor-pointer"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const parentRect =
                          e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                        setRevenueTooltip({
                          index: i,
                          x: rect.left - parentRect.left + rect.width / 2,
                          y: parentRect.bottom - rect.top + 8,
                        });
                      }}
                      onMouseLeave={() => setRevenueTooltip(null)}
                    >
                      <div
                        className="flex-1 rounded-t-sm bg-blue-700"
                        style={{
                          height: `${completedPct}%`,
                          minHeight: d.completed_revenue > 0 ? "2px" : "0",
                        }}
                      />
                      <div
                        className="flex-1 rounded-t-sm bg-red-400"
                        style={{
                          height: `${lostPct}%`,
                          minHeight: d.lost_revenue > 0 ? "2px" : "0",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-1 mt-1">
              {data.map((d, i) => (
                <span
                  key={d.date}
                  className="flex-1 text-center text-[10px] text-muted-foreground truncate"
                >
                  {i % labelStep === 0 ? formatDayLabel(d.date, useShortForm) : ""}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="flex gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-700" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-400" />
            <span className="text-xs text-muted-foreground">Cancelled / no-show</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Appointments</h2>
          <span className="text-2xl font-semibold text-foreground">{totalAppointments}</span>
        </div>
        {loading ? (
          <div className="h-24 bg-muted animate-pulse rounded" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : (
          <>
            <div className="relative h-24">
              {apptTooltip && (
                <div
                  className="absolute z-10 bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none -translate-x-1/2 -translate-y-full"
                  style={{ left: apptTooltip.x, top: apptTooltip.y }}
                >
                  <p className="font-semibold text-foreground mb-1">
                    {formatFullDate(data[apptTooltip.index].date)}
                  </p>
                  <p className="text-blue-500">
                    Virtual: {data[apptTooltip.index].virtual_count}
                  </p>
                  <p className="text-orange-500">
                    In-person: {data[apptTooltip.index].physical_count}
                  </p>
                </div>
              )}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = (e.clientX - rect.left) / rect.width;
                  const index =
                    data.length > 1
                      ? Math.round(relX * (data.length - 1))
                      : 0;
                  const clamped = Math.max(0, Math.min(data.length - 1, index));
                  const x = data.length > 1 ? (clamped / (data.length - 1)) * rect.width : rect.width / 2;
                  const y = 100 - (Math.max(data[clamped].virtual_count, data[clamped].physical_count) / maxCount) * 100;
                  setApptTooltip({ index: clamped, x, y: (y / 100) * rect.height });
                }}
                onMouseLeave={() => setApptTooltip(null)}
              >
                <polyline
                  points={data
                    .map((d, i) => {
                      const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
                      const y = 100 - (d.virtual_count / maxCount) * 100;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  points={data
                    .map((d, i) => {
                      const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
                      const y = 100 - (d.physical_count / maxCount) * 100;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                {apptTooltip && (
                  <line
                    x1={(apptTooltip.index / Math.max(data.length - 1, 1)) * 100}
                    y1="0"
                    x2={(apptTooltip.index / Math.max(data.length - 1, 1)) * 100}
                    y2="100"
                    stroke="currentColor"
                    strokeOpacity="0.15"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
            </div>
            <div className="flex gap-1 mt-1">
              {data.map((d, i) => (
                <span
                  key={d.date}
                  className="flex-1 text-center text-[10px] text-muted-foreground truncate"
                >
                  {i % labelStep === 0 ? formatDayLabel(d.date, useShortForm) : ""}
                </span>
              ))}
            </div>
          </>
        )}
        <div className="flex gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#1d4ed8" }} />
            <span className="text-xs text-muted-foreground">Virtual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ea580c" }} />
            <span className="text-xs text-muted-foreground">In-person</span>
          </div>
        </div>
      </div>
    </div>
  );
}
