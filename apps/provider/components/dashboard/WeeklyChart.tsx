"use client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Placeholder data — replace with real API data when available
const MOCK_DATA = [4, 7, 5, 8, 6, 2, 1];

export function WeeklyChart() {
  const max = Math.max(...MOCK_DATA);
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <h2 className="font-semibold text-gray-700 mb-4">Weekly Patients</h2>
      <div className="flex items-end gap-2 h-24">
        {DAYS.map((day, i) => {
          const height = max > 0 ? (MOCK_DATA[i] / max) * 100 : 0;
          const isToday = i === todayIndex;
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{MOCK_DATA[i]}</span>
              <div
                className={`w-full rounded-t-md transition-all ${
                  isToday ? "bg-blue-500" : "bg-blue-100"
                }`}
                style={{ height: `${Math.max(height, 8)}%` }}
              />
              <span className={`text-xs ${isToday ? "text-blue-600 font-bold" : "text-gray-400"}`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
