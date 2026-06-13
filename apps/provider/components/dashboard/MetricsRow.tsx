"use client";
import { useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface DashboardStats {
  this_week_appointments: number;
  this_week_patients: number;
  total_patients_month: number;
  avg_duration_minutes: number;
  weekly_data: { date: string; day: string; count: number }[];
}

export function MetricsRow() {
  const identity = useSelector((state: RootState) => state.auth.identity);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!identity) return;
    Promise.all([
      axiosClient.get(`provider/${identity}/dashboard/stats`).catch(() => null),
      axiosClient.get(`provider/${identity}/appointments?filter=today`).catch(() => ({ data: [] })),
    ])
      .then(([statsRes, todayRes]) => {
        if (statsRes?.data) setStats(statsRes.data);
        setTodayCount(todayRes?.data?.length ?? 0);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const cards = [
    {
      label: "Today's Appointments",
      value: todayCount,
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
      sub: "patients served this month",
      color: "bg-purple-50 text-purple-700",
    },
    {
      label: "Avg. Duration",
      value: stats?.avg_duration_minutes ? `${stats.avg_duration_minutes}m` : "—",
      sub: "per consultation this month",
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
