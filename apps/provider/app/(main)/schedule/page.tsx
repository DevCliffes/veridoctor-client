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
  LucideX,
  LucideCalendarCheck,
} from "@veridoctor/design/icons";
import { CalendarViewer, DialogModal } from "@veridoctor/design/shared";
import type { Appointment } from "@veridoctor/design/shared";
import type { ReactNode } from "react";

type Service = { id: string; name: string; estimated_duration: number };
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
  recurrence_interval: number;
  recurrence_days: string[];
  recurrence_end_type: EndType | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
};

type BookedAppointment = {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  status: string;
  meet_id: string;
};

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = [
  "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function expandToCalendarEvents(s: ScheduleBlock): Appointment[] {
  const events: Appointment[] = [];
  const start = new Date(s.start_date + "T00:00:00");
  const end = new Date(s.end_date + "T00:00:00");
  const [sh, sm] = s.start_time.split(":").map(Number);
  const [eh, em] = s.end_time.split(":").map(Number);

  const maxEnd =
    s.recurrence !== "none"
      ? new Date(
          Math.max(
            end.getTime(),
            start.getTime() + 90 * 24 * 60 * 60 * 1000
          )
        )
      : end;

  const cursor = new Date(start);
  while (cursor <= maxEnd) {
    const python_dow = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1;
    const dow_abbr = DAY_ABBR[cursor.getDay()];
    let include = false;
    if (s.recurrence === "none") include = true;
    else if (s.recurrence === "daily") include = true;
    else if (s.recurrence === "weekdays") include = python_dow < 5;
    else if (s.recurrence === "weekly" || s.recurrence === "custom")
      include = s.recurrence_days?.includes(dow_abbr) ?? false;

    if (include) {
      const evStart = new Date(cursor);
      evStart.setHours(sh, sm, 0, 0);
      const evEnd = new Date(cursor);
      evEnd.setHours(eh, em, 0, 0);
      events.push({
        id: "sched-" + s.id + "-" + cursor.toISOString(),
        start: evStart,
        end: evEnd,
        patientName: s.service_name ?? "Available",
        meta: { scheduleId: s.id, type: "schedule" },
      });
    }

    cursor.setDate(cursor.getDate() + 1);
    if (s.recurrence === "none") break;
  }
  return events;
}

function EditScheduleModal({
  block,
  services,
  onClose,
  onSaved,
  onDeleted,
}: {
  block: ScheduleBlock;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [serviceId, setServiceId] = useState(block.service ?? "");
  const [startDate, setStartDate] = useState(block.start_date);
  const [endDate, setEndDate] = useState(block.end_date);
  const [startTime, setStartTime] = useState(block.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(block.end_time.slice(0, 5));
  const [locationType, setLocationType] = useState<LocationType>(block.location_type);
  const [repeat, setRepeat] = useState<RepeatType>(block.recurrence);
  const [repeatDays, setRepeatDays] = useState<string[]>(block.recurrence_days ?? []);
  const [repeatInterval, setRepeatInterval] = useState(block.recurrence_interval ?? 1);
  const [endType, setEndType] = useState<EndType>(block.recurrence_end_type ?? "never");
  const [endAfterDate, setEndAfterDate] = useState(block.recurrence_end_date ?? "");
  const [endAfterCount, setEndAfterCount] = useState(block.recurrence_count ?? 10);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const weekdayLabel = DAY_FULL[new Date(startDate + "T00:00:00").getDay()];
  const toggleRepeatDay = (day: string) =>
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosClient.patch(
        "provider/" + userId + "/schedule/" + block.id,
        {
          service: serviceId,
          location_type: locationType,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          recurrence: repeat,
          recurrence_interval: repeat === "custom" ? repeatInterval : 1,
          recurrence_days:
            repeat === "weekly" || repeat === "custom" ? repeatDays : [],
          recurrence_end_type: repeat === "none" ? null : endType,
          recurrence_end_date: endType === "on_date" ? endAfterDate : null,
          recurrence_count: endType === "after" ? endAfterCount : null,
        }
      );
      onSaved();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this schedule block?")) return;
    setDeleting(true);
    try {
      await axiosClient.delete(
        "provider/" + userId + "/schedule/" + block.id
      );
      onDeleted();
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  const locationOptions: { key: LocationType; label: string; icon: ReactNode }[] = [
    { key: "virtual", label: "Virtual", icon: <LucideVideo size={14} /> },
    { key: "physical", label: "In-person", icon: <LucideMapPin size={14} /> },
    { key: "both", label: "Both", icon: null },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <LucideCalendarCheck size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Edit schedule</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LucideTrash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              <LucideX size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full text-base font-medium border-b border-gray-200 pb-2 focus:outline-none focus:border-blue-400 bg-transparent"
          >
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="flex items-start gap-2">
            <LucideClock size={16} className="text-gray-400 mt-2 shrink-0" />
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (new Date(e.target.value) > new Date(endDate))
                    setEndDate(e.target.value);
                }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-50"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-50"
              />
              <span className="text-gray-400">–</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-50"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-50"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <LucideRepeat size={16} className="text-gray-400 mt-2 shrink-0" />
            <div className="flex-1 space-y-3">
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RepeatType)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-gray-50 w-full"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Every weekday (Mon–Fri)</option>
                <option value="weekly">Weekly on {weekdayLabel}</option>
                <option value="custom">Custom</option>
              </select>

              {(repeat === "weekly" || repeat === "custom") && (
                <div className="flex gap-1.5">
                  {DAY_ABBR.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleRepeatDay(d)}
                      className={
                        "w-8 h-8 rounded-full text-xs font-medium border transition-colors " +
                        (repeatDays.includes(d)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200")
                      }
                    >
                      {d[0]}
                    </button>
                  ))}
                </div>
              )}

              {repeat !== "none" && (
                <div className="space-y-2 pl-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Ends
                  </p>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="radio"
                      checked={endType === "never"}
                      onChange={() => setEndType("never")}
                    />
                    Never
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="radio"
                      checked={endType === "on_date"}
                      onChange={() => setEndType("on_date")}
                    />
                    On
                    <input
                      type="date"
                      disabled={endType !== "on_date"}
                      value={endAfterDate}
                      onChange={(e) => setEndAfterDate(e.target.value)}
                      min={startDate}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 disabled:opacity-50"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="radio"
                      checked={endType === "after"}
                      onChange={() => setEndType("after")}
                    />
                    After
                    <input
                      type="number"
                      min={1}
                      disabled={endType !== "after"}
                      value={endAfterCount}
                      onChange={(e) => setEndAfterCount(Number(e.target.value))}
                      className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 disabled:opacity-50"
                    />
                    occurrence(s)
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <LucideMapPin size={16} className="text-gray-400 mt-2 shrink-0" />
            <div className="flex gap-2 flex-wrap">
              {locationOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setLocationType(opt.key)}
                  className={
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors " +
                    (locationType === opt.key
                      ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                      : "bg-white border-gray-200 text-gray-600")
                  }
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Schedule() {
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [bookedAppts, setBookedAppts] = useState<BookedAppointment[]>([]);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);

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
      .get("provider/" + userId + "/schedule")
      .then((res) => setSchedules(res.data ?? []))
      .catch(() => {});
  }, [userId]);

  const fetchBookedAppts = useCallback(() => {
    if (!userId) return;
    axiosClient
      .get("provider/" + userId + "/appointments")
      .then((res) => setBookedAppts(res.data ?? []))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get("provider/" + userId + "/services")
      .then((res) => setServices(res.data ?? []))
      .catch(() => {});
    fetchSchedules();
    fetchBookedAppts();
  }, [userId, fetchSchedules, fetchBookedAppts]);

  const handleServiceChange = (id: string) => {
    setSelectedServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      const [h, m] = startTime.split(":").map(Number);
      const total = h * 60 + m + svc.estimated_duration;
      setEndTime(
        String(Math.floor(total / 60) % 24).padStart(2, "0") +
          ":" +
          String(total % 60).padStart(2, "0")
      );
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (new Date(val) > new Date(endDate)) setEndDate(val);
    setRepeatDays([DAY_ABBR[new Date(val + "T00:00:00").getDay()]]);
  };

  const toggleRepeatDay = (day: string) =>
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const weekdayLabel = DAY_FULL[new Date(startDate + "T00:00:00").getDay()];

  const handleSave = async () => {
    if (!selectedServiceId) return;
    try {
      await axiosClient.post("provider/" + userId + "/schedule", {
        service: selectedServiceId,
        location_type: locationType,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        recurrence: repeat,
        recurrence_interval: repeat === "custom" ? repeatInterval : 1,
        recurrence_days:
          repeat === "weekly" || repeat === "custom" ? repeatDays : [],
        recurrence_end_type: repeat === "none" ? null : endType,
        recurrence_end_date: endType === "on_date" ? endAfterDate : null,
        recurrence_count: endType === "after" ? endAfterCount : null,
      });
      fetchSchedules();
    } catch {
      // silent
    }
  };

  const handleEventClick = (appt: Appointment) => {
    if (appt.meta?.type === "schedule") {
      const block = schedules.find((s) => s.id === appt.meta?.scheduleId);
      if (block) setEditingBlock(block);
    }
  };

  const scheduleEvents = schedules.flatMap(expandToCalendarEvents);

  const bookedEvents: Appointment[] = bookedAppts
    .filter((a) => a.status !== "cancelled")
    .map((a) => ({
      id: "booked-" + a.id,
      start: new Date(a.start_time),
      end: new Date(a.end_time),
      patientName: a.patient_first_name + " " + a.patient_last_name,
      meta: {
        type: "booked",
        appointmentId: a.id,
        email: a.patient_email,
        phone: a.patient_phone_number,
        appointment_type: a.appointment_type,
        status: a.status,
        location_type: a.appointment_type,
      },
    }));

  const allCalendarEvents = [...scheduleEvents, ...bookedEvents];

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
          <p className="text-gray-600 mt-1">
            Manage your availability for patient bookings.
          </p>
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
            <div>
              {services.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No services found.{" "}
                  <a
                    href="/services"
                    className="text-blue-600 hover:underline"
                  >
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
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-start gap-2">
              <LucideClock size={18} className="text-gray-400 mt-2 shrink-0" />
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <LucideRepeat size={18} className="text-gray-400 mt-2 shrink-0" />
              <div className="flex-1 space-y-3">
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value as RepeatType)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Every weekday (Mon–Fri)</option>
                  <option value="weekly">Weekly on {weekdayLabel}</option>
                  <option value="custom">Custom</option>
                </select>
                {(repeat === "weekly" || repeat === "custom") && (
                  <div className="flex gap-1.5">
                    {DAY_ABBR.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleRepeatDay(d)}
                        className={
                          "w-9 h-9 rounded-full text-xs font-medium border transition-colors " +
                          (repeatDays.includes(d)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200")
                        }
                      >
                        {d[0]}
                      </button>
                    ))}
                  </div>
                )}
                {repeat !== "none" && (
                  <div className="space-y-2 pl-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Ends
                    </p>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="radio"
                        checked={endType === "never"}
                        onChange={() => setEndType("never")}
                      />
                      Never
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="radio"
                        checked={endType === "on_date"}
                        onChange={() => setEndType("on_date")}
                      />
                      On
                      <input
                        type="date"
                        disabled={endType !== "on_date"}
                        value={endAfterDate}
                        onChange={(e) => setEndAfterDate(e.target.value)}
                        min={startDate}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 disabled:opacity-50"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="radio"
                        checked={endType === "after"}
                        onChange={() => setEndType("after")}
                      />
                      After
                      <input
                        type="number"
                        min={1}
                        disabled={endType !== "after"}
                        value={endAfterCount}
                        onChange={(e) =>
                          setEndAfterCount(Number(e.target.value))
                        }
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm bg-gray-50 disabled:opacity-50"
                      />
                      occurrence(s)
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <LucideMapPin size={18} className="text-gray-400 mt-2 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                  Location
                </p>
                <div className="flex gap-2">
                  {locationOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setLocationType(opt.key)}
                      className={
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors " +
                        (locationType === opt.key
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                          : "bg-white border-gray-200 text-gray-600")
                      }
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogModal>
      </div>

      <CalendarViewer
        appointments={allCalendarEvents}
        onEventClick={handleEventClick}
      />

      {editingBlock && (
        <EditScheduleModal
          block={editingBlock}
          services={services}
          onClose={() => setEditingBlock(null)}
          onSaved={() => {
            setEditingBlock(null);
            fetchSchedules();
          }}
          onDeleted={() => {
            setEditingBlock(null);
            fetchSchedules();
          }}
        />
      )}
    </div>
  );
}

