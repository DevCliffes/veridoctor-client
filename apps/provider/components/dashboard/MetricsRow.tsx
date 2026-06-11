"use client";
import { useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface MetricsData {
  total_patients: number;
  weekly_count: number;
  avg_duration: number;
}

export function MetricsRow() {
  const identity = useSelector((state: RootState) => state.auth.identity);
  const [metrics, setMetrics] = useState<MetricsData>({
    total_patients: 0,
    weekly_count: 0,
    avg_duration: 0,
  });
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    if (!identity) return;
    axiosClient
      .get(`/provider/${identity}/stats`)
      .then((res) => setMetrics(res.data))
      .catch(() => {});
    axiosClient
      .get(`/provider/${identity}/appointments?filter=today`)
      .then((res) => setTodayCount(res.data?.length ?? 0))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const cards = [
    { label: "Today's Appointments", value: todayCount, sub: "scheduled for today", color: "bg-blue-50 text-blue-700" },
    { label: "This Week", value: metrics.weekly_count, sub: "consultations this week", color: "bg-green-50 text-green-700" },
    { label: "Total Patients", value: metrics.total_patients, sub: "patients served", color: "bg-purple-50 text-purple-700" },
    { label: "Avg. Duration", value: `${metrics.avg_duration || 30}m`, sub: "per consultation", color: "bg-orange-50 text-orange-700" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">{card.label}</p>
          <p className={`text-2xl font-bold rounded px-2 py-0.5 inline-block ${card.color}`}>
            {card.value}
          </p>
          <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
