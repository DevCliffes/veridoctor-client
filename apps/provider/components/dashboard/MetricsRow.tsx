"use client";
import type { DashboardStats } from "../../app/(main)/dashboard/page";
interface MetricsRowProps {
  stats: DashboardStats | null;
  loading: boolean;
}
function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}
// Formats a duration given in whole seconds as "Xm Ys" (or just "Ys" when
// under a minute). Using `!= null` rather than a truthiness check means a
// genuine 0-second average still displays as "0s" instead of silently
// falling back to "—", which was indistinguishable from "no data yet".
function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return "—";
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
export function MetricsRow({ stats, loading }: MetricsRowProps) {
  const cards = [
    {
      label: "Today's Appointments",
      value: stats?.today_count ?? 0,
      sub: "scheduled for today",
      color: "bg-primary/10 text-primary",
    },
    {
      label: "This Week",
      value: stats?.this_week_appointments ?? 0,
      sub: "consultations this week",
      color: "bg-brand-light/10 text-brand-light",
    },
    {
      label: "Total Patients",
      value: stats?.total_patients_month ?? 0,
      sub: "served this month",
      color: "bg-muted text-muted-foreground",
    },
    {
      label: "Avg. Duration",
      value: formatDuration(stats?.avg_duration_seconds),
      sub: "per consultation",
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Revenue (MTD)",
      value: formatKES(stats?.revenue_mtd ?? 0),
      sub: "from completed appointments",
      color: "bg-brand-mint/10 text-brand-mint-dark",
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card rounded-xl p-4 shadow-sm border border-border"
        >
          <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
          {loading ? (
            <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
          ) : (
            <p className={`text-2xl font-semibold rounded px-2 py-0.5 inline-block ${card.color}`}>
              {card.value}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
