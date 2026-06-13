"use client";
import { useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface DayData {
  date: string;
  day: string;
  count: number;
}

export function WeeklyChart() {
  const identity = useSelector((state: RootState) => state.auth.identity);
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!identity) return;
    axiosClient
      .get(`provider/${identity}/dashboard/stats`)
      .then((res) => {
        if (res.data?.weekly_data) setWeeklyData(res.data.weekly_data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const today = new Date().toISOString().split("T")[0];
  const max = Math.max(...weeklyData.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <h2 className="font-semibold text-gray-700 mb-4">Weekly Patients</h2>

      {loading ? (
        <div className="h-24 bg-gray-100 animate-pulse rounded" />
      ) : weeklyData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
      ) : (
        <div className="flex items-end gap-2 h-24">
          {weeklyData.map((d) => {
            const isToday = d.date === today;
            const height = max > 0 ? (d.count / max) * 100 : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{d.count > 0 ? d.count : ""}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(height, d.count > 0 ? 8 : 0)}%`,
                    backgroundColor: isToday ? "#185FA5" : "#B5D4F4",
                  }}
                />
                <span className={`text-xs ${isToday ? "text-blue-600 font-bold" : "text-gray-400"}`}>
                  {d.day}
                </span>
              </div>
            );
          })}
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
