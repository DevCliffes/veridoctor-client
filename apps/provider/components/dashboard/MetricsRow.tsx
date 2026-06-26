"use client";
import type { DashboardStats } from "../../app/(main)/dashboard/page";

interface MetricsRowProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export function MetricsRow({ stats, loading }: MetricsRowProps) {
  const cards = [
    {
      label: "Today's Appointments",
      value: stats?.today_count ?? 0,
      sub: "scheduled for today",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "This Week",
      value: stats?.this_week_appointments ?? 0,
      sub: "consultations this week",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Total Patients",
      value: stats?.total_patients_month ?? 0,
      sub: "served this month",
      color: "bg-purple-50 text-purple-700",
    },
    {
      label: "Avg. Duration",
      value: stats?.avg_duration_minutes ? `${stats.avg_duration_minutes}m` : "—",
      sub: "per consultation",
      color: "bg-orange-50 text-orange-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <p className="text-sm text-gray-500 mb-1">{card.label}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1" />
          ) : (
            <p className={`text-2xl font-bold rounded px-2 py-0.5 inline-block ${card.color}`}>
              {card.value}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
