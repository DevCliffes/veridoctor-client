"use client";
import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucidePlus,
  LucideClock,
  LucideMapPin,
  LucideVideo,
  LucideRepeat,
  LucideTrash2,
} from "@veridoctor/design/icons";
import { CalendarViewer, DialogModal } from "@veridoctor/design/shared";
import { toast } from "sonner";
import type { ReactNode } from "react";

type Service = {
  id: string;
  name: string;
  estimated_duration: number;
};

type LocationType = "virtual" | "physical" | "both";
type RepeatType = "none" | "daily" | "weekly" | "weekdays" | "custom";
type EndType = "never" | "on_date" | "after";

type ScheduleBlock = {
  id: string;
  service: string | null;
  service_name: string | null;
  location_type: LocationType;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  recurrence: RepeatType;
  recurrence_days: string[];
};

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Expand a schedule block into calendar Appointment entries
function expandToCalendarEvents(s: ScheduleBlock) {
  const events: { id: string; start: Date; end: Date; patientName: string }[] = [];
  const start = new Date(s.start_date + "T00:00:00");
  const end = new Date(s.end_date + "T00:00:00");
  const [sh, sm] = s.start_time.split(":").map(Number);
  const [eh, em] = s.end_time.split(":").map(Number);

  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = DAY_ABBR[cursor.getDay()];
    let include = false;

    if (s.recurrence === "none") include = true;
    else if (s.recurrence === "daily") include = true;
    else if (s.recurrence === "weekdays") include = cursor.getDay() >= 1 && cursor.getDay() <= 5;
    else if (s.recurrence === "weekly" || s.recurrence === "custom")
      include = s.recurrence_days?.includes(dow) ?? false;

    if (include) {
      const evStart = new Date(cursor);
      evStart.setHours(sh, sm, 0, 0);
      const evEnd = new Date(cursor);
      evEnd.setHours(eh, em, 0, 0);
      events.push({
        id: `${s.id}-${cursor.toISOString()}`,
        start: evStart,
        end: evEnd,
        patientName: s.service_name ?? "Available",
      });
    }

    cursor.setDate(cursor.getDate() + 1);
    if (s.recurrence === "none") break;
  }
  return events;
}

export default function Schedule() {
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [locationType, setLocationType] = useState<LocationType>("virtual");
  const [repeat, setRepeat] = useState<RepeatType>("none");
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [endType, setEndType] = useState<EndType>("never");
  const [endAfterDate, setEndAfterDate] = useState("");
  const [endAfterCount, setEndAfterCount] = useState(10);

  const fetchSchedules = useCallback(() => {
    if (!userId) return;
    axiosClient
      .get(`provider/${userId}/schedule`)
      .then((res) => setSchedules(res.data ?? []))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(`provider/${userId}/services`)
      .then((res) => setServices(res.data ?? []))
      .catch(() => {});
    fetchSchedules();
  }, [userId, fetchSchedules]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      const [h, m] = startTime.split(":").map(Number);
      const totalMins = h * 60 + m + svc.estimated_duration;
      const endH = Math.floor(totalMins / 60) % 24;
      const endM = totalMins % 60;
      setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (new Date(val) > new Date(endDate)) setEndDate(val);
    const day = DAY_ABBR[new Date(val + "T00:00:00").getDay()];
    setRepeatDays([day]);
  };

  const toggleRepeatDay = (day: string) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const weekdayLabel = DAY_FULL[new Date(startDate + "T00:00:00").getDay()];

  const handleSave = async () => {
    if (!selectedServiceId) {
      toast.error("Please select a service first");
      return;
    }
    const payload = {
      service: selectedServiceId,
      location_type: locationType,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      recurrence: repeat,
      recurrence_interval: repeat === "custom" ? repeatInterval : 1,
      recurrence_days: repeat === "weekly" || repeat === "custom" ? repeatDays : [],
      recurrence_end_type: repeat === "none" ? null : endType,
      recurrence_end_date: endType === "on_date" ? endAfterDate : null,
      recurrence_count: endType === "after" ? endAfterCount : null,
    };
    try {
      await axiosClient.post(`provider/${userId}/schedule`, payload);
      toast.success("Schedule added");
      fetchSchedules();
    } catch {
      toast.error("An error occurred while adding your schedule");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosClient.delete(`provider/${userId}/schedule/${id}`);
      toast.success("Schedule removed");
      fetchSchedules();
    } catch {
      toast.error("Could not remove schedule");
    }
  };

  // Build calendar events from all schedule blocks
  const calendarEvents = schedules.flatMap(expandToCalendarEvents);

  const locationOptions: { key: LocationType; label: string; icon: ReactNode }[] = [
    { key: "virtual", label: "Virtual", icon: <LucideVideo size={14} /> },
    { key: "physical", label: "In-person", icon: <LucideMapPin size={14} /> },
    { key: "both", label: "Both", icon: null },
  ];

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold">Schedule</h1>
          <p className="text-gray-600 mt-1">Manage your availability for patient bookings.</p>
        </div>
        <DialogModal
          title="Add to schedule"
          description="Create a new schedule block"
          trigger={
            <>
              <LucidePlus size={20} />
              Add to calendar
            </>
          }
          onSave={handleSave}
        >
          <div className="flex flex-col gap-4 max-w-lg">
            {/* Service / title */}
            <div>
              {services.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No services found.{" "}
                  <a href="/services" className="text-blue-600 hover:underline">
                    Add a service first →
                  </a>
                </p>
              ) : (
                <select
                  value={selectedServiceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full text-lg font-medium border-b border-gray-200 pb-2 focus:outline-none focus:border-blue-400 bg-transparent"
                >
                  <option value="">Add title — select a service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Date / time */}
            <div className="flex items-start gap-2">
              <LucideClock size={18} className="text-gray-400 mt-2 shrink-0" />
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <input type="date" value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
                <input type="time" value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
                <span className="text-gray-400">–</span>
                <input type="time" value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
                <input type="date" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
              </div>
            </div>

            {/* Recurrence */}
            <div className="flex items-start gap-2">
              <LucideRepeat size={18} className="text-gray-400 mt-2 shrink-0" />
              <div className="flex-1 space-y-3">
                <select value={repeat}
                  onChange={(e) => setRepeat(e.target.value as RepeatType)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Every weekday (Mon–Fri)</option>
                  <option value="weekly">Weekly on {weekdayLabel}</option>
                  <option value="custom">Custom</option>
                </select>

                {(repeat === "weekly" || repeat === "custom") && (
                  <div className="flex gap-1.5">
                    {DAY_ABBR.map((d) => (
                      <button key={d} type="button" onClick={() => toggleRepeatDay(d)}
                        className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors ${
                          repeatDays.includes(d)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}>
                        {d[0]}
                      </button>
                    ))}
                  </div>
                )}

                {repeat === "custom" && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    Repeat every
                    <input type="number" min={1} value={repeatInterval}
                      onChange={(e) => setRepeatInterval(Number(e.target.value))}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50" />
                    week(s)
                  </div>
                )}

                {repeat !== "none" && (
                  <div className="space-y-2 pl-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Ends</p>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="radio" checked={endType === "never"} onChange={() => setEndType("never")} />
                      Never
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="radio" checked={endType === "on_date"} onChange={() => setEndType("on_date")} />
                      On
                      <input type="date" disabled={endType !== "on_date"} value={endAfterDate}
                        onChange={(e) => setEndAfterDate(e.target.value)} min={startDate}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 disabled:opacity-50" />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="radio" checked={endType === "after"} onChange={() => setEndType("after")} />
                      After
                      <input type="number" min={1} disabled={endType !== "after"} value={endAfterCount}
                        onChange={(e) => setEndAfterCount(Number(e.target.value))}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 disabled:opacity-50" />
                      occurrence(s)
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2">
              <LucideMapPin size={18} className="text-gray-400 mt-2 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Location</p>
                <div className="flex gap-2">
                  {locationOptions.map((opt) => (
                    <button key={opt.key} type="button" onClick={() => setLocationType(opt.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        locationType === opt.key
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}>
                      {opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogModal>
      </div>

      {/* Schedule list */}
      <div className="mt-6 space-y-2">
        {schedules.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No schedule blocks yet. Click "Add to calendar" to create one.
          </p>
        ) : (
          schedules.map((s) => (
            <div key={s.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {s.service_name ?? "Untitled"}
                </p>
                <p className="text-xs text-gray-400">
                  {s.start_date}{s.start_date !== s.end_date ? ` → ${s.end_date}` : ""} · {s.start_time}–{s.end_time}
                  {s.recurrence !== "none" && ` · ${s.recurrence}`}
                  {s.recurrence_days?.length > 0 && ` (${s.recurrence_days.join(", ")})`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  s.location_type === "virtual" ? "bg-indigo-50 text-indigo-600"
                  : s.location_type === "physical" ? "bg-green-50 text-green-600"
                  : "bg-purple-50 text-purple-600"
                }`}>
                  {s.location_type}
                </span>
                <button onClick={() => handleDelete(s.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors">
                  <LucideTrash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Calendar — receives real schedule events */}
      <CalendarViewer appointments={calendarEvents} />
    </div>
  );
}
