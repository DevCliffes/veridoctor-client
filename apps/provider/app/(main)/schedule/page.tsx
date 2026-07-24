"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
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

// Minimal shape needed for the schedule picker -- ProviderLocationListView
// actually returns the full ProviderLocationSerializer (document reviews,
// business reg, etc.) but Schedule.tsx only ever needs enough to label a
// dropdown option, so the rest is just ignored rather than typed out here.
type ScheduleLocation = {
  id: string;
  name: string;
  county: string;
  is_primary: boolean;
};

type ScheduleBlock = {
  id: string;
  service: string | null;
  service_name: string | null;
  location: string | null; // NEW
  location_detail: { id: string; name: string; county: string } | null; // NEW
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
  excluded_dates: string[];
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
  service_name: string | null;
};

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// A schedule block only needs a location when it's physical/both --
// virtual blocks are location-less by design, confirmed deliberately.
function locationRequired(locationType: LocationType) {
  return locationType === "physical" || locationType === "both";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// local calendar date key, avoids UTC off-by-one when matching excluded_dates
function dateKey(d: Date) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function computeEndTime(startTime: string, durationMins: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMins;
  return (
    String(Math.floor(total / 60) % 24).padStart(2, "0") +
    ":" +
    String(total % 60).padStart(2, "0")
  );
}

// FIX: previously every submit sent `end_date` straight from its own
// standalone `endDate` state -- a date input in the top date-range row
// that has no relationship at all to the "Ends" section below it (Never
// / On [date] / After [n] occurrences). That meant a "weekly, ends on
// 2026-08-15" schedule could ship end_date as whatever unrelated date the
// top field happened to hold (often just today, from initial state),
// silently truncating the recurrence's real window. The backend now
// authoritatively resolves end_date server-side for every
// recurrence_end_type (see _resolve_end_date in views.py), so this
// only needs to send a value that (a) reflects intent when it's the
// source of truth (non-recurring, or "on_date"), and (b) is a valid
// placeholder (>= start_date) the rest of the time, since the server
// will overwrite it anyway.
function computeSubmittedEndDate(params: {
  repeat: RepeatType;
  endType: EndType;
  startDate: string;
  endDate: string;
  endAfterDate: string;
}): string {
  const { repeat, endType, startDate, endDate, endAfterDate } = params;
  if (repeat === "none") return endDate;
  if (endType === "on_date") return endAfterDate || startDate;
  // "never" and "after" are fully resolved server-side from
  // recurrence_end_type / recurrence_count. This is just a valid
  // placeholder so serializer validation (end_date >= start_date) passes.
  return startDate;
}

// extracts a human-readable message from a failed schedule API call.
// Handles the 409 conflict shape returned by _check_schedule_overlap
// ({ error: "..." }) and the 400 location-required shape returned by
// ProviderScheduleSerializer.validate() ({ location: ["..."] }), falling
// back to DRF's default serializer-error shape for anything else.
function scheduleErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { status?: number; data?: unknown } };
  const data = anyErr?.response?.data as
    | { error?: string; [key: string]: unknown }
    | undefined;

  if (data?.error && typeof data.error === "string") return data.error;

  if (data && typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const firstVal = firstKey ? data[firstKey] : undefined;
    if (firstKey && Array.isArray(firstVal) && typeof firstVal[0] === "string") {
      return `${firstKey.replace(/_/g, " ")}: ${firstVal[0]}`;
    }
  }

  return "Something went wrong saving this schedule block.";
}

const EXPAND_DAYS_BEFORE = 7;
const EXPAND_DAYS_AFTER = 60;

function expandToCalendarEvents(s: ScheduleBlock): Appointment[] {
  const events: Appointment[] = [];
  const [sh, sm] = s.start_time.split(":").map(Number);
  const [eh, em] = s.end_time.split(":").map(Number);

  const blockStart = new Date(s.start_date + "T00:00:00");
  const blockEnd = new Date(s.end_date + "T00:00:00");

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - EXPAND_DAYS_BEFORE);
  windowStart.setHours(0, 0, 0, 0);

  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + EXPAND_DAYS_AFTER);
  windowEnd.setHours(23, 59, 59, 999);

  const rangeStart = new Date(Math.max(blockStart.getTime(), windowStart.getTime()));
  const rangeEnd = new Date(
    Math.min(
      s.recurrence !== "none" ? windowEnd.getTime() : blockEnd.getTime(),
      windowEnd.getTime()
    )
  );

  if (rangeStart > rangeEnd) return events;

  const excluded = new Set(s.excluded_dates ?? []);

  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const dow_abbr = DAY_ABBR[cursor.getDay()];
    const python_dow = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1;
    let include = false;

    if (s.recurrence === "none") {
      include = cursor >= blockStart && cursor <= blockEnd;
    } else if (s.recurrence === "daily") {
      include = true;
    } else if (s.recurrence === "weekdays") {
      include = python_dow < 5;
    } else if (s.recurrence === "weekly" || s.recurrence === "custom") {
      include = s.recurrence_days?.includes(dow_abbr) ?? false;
    }

    const key = dateKey(cursor);

    if (include && excluded.has(key)) {
      // this occurrence was deleted individually — render nothing for it
      include = false;
    }

    if (include) {
      const evStart = new Date(cursor);
      evStart.setHours(sh, sm, 0, 0);
      const evEnd = new Date(cursor);
      evEnd.setHours(eh, em, 0, 0);
      events.push({
        id: "sched-" + s.id + "-" + key,
        start: evStart,
        end: evEnd,
        // NEW: surface which facility this block is at, right in the
        // calendar label, for a provider with more than one location.
        patientName:
          (s.service_name ?? "Available") +
          (s.location_detail ? " · " + s.location_detail.name : ""),
        meta: {
          scheduleId: s.id,
          type: "schedule",
          occurrenceDate: key,
        },
      });
    }

    cursor.setDate(cursor.getDate() + 1);
    if (s.recurrence === "none") break;
  }
  return events;
}

// ── Location picker (shared between the create form and edit modal) ──────────

function LocationPicker({
  locationType,
  locationId,
  locations,
  onChange,
  disabled,
}: {
  locationType: LocationType;
  locationId: string;
  locations: ScheduleLocation[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  if (!locationRequired(locationType)) return null;

  if (locations.length === 0) {
    return (
      <p className="text-xs text-red-600 pl-6">
        You need at least one practice location before creating an in-person
        or hybrid schedule block.{" "}
        <Link href="/locations" className="underline">
          Add a location →
        </Link>
      </p>
    );
  }

  return (
    <div className="pl-6">
      <select
        value={locationId}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted text-foreground disabled:opacity-50"
      >
        <option value="">Select a location</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
            {loc.is_primary ? " (Main)" : ""}
            {loc.county ? " — " + loc.county : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditScheduleModal({
  block,
  occurrenceDate,
  userId,
  services,
  locations,
  onClose,
  onSaved,
  onDeleted,
}: {
  block: ScheduleBlock;
  occurrenceDate: string;
  userId: string;
  services: Service[];
  locations: ScheduleLocation[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [serviceId, setServiceId] = useState(block.service ?? "");
  const [startDate, setStartDate] = useState(block.start_date);
  const [endDate, setEndDate] = useState(block.end_date);
  const [startTime, setStartTime] = useState(block.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(block.end_time.slice(0, 5));
  const [locationType, setLocationType] = useState<LocationType>(block.location_type);
  const [locationId, setLocationId] = useState(block.location ?? ""); // NEW
  const [repeat, setRepeat] = useState<RepeatType>(block.recurrence);
  const [repeatDays, setRepeatDays] = useState<string[]>(block.recurrence_days ?? []);
  const [repeatInterval, setRepeatInterval] = useState(block.recurrence_interval ?? 1);
  const [endType, setEndType] = useState<EndType>(block.recurrence_end_type ?? "never");
  const [endAfterDate, setEndAfterDate] = useState(block.recurrence_end_date ?? "");
  const [endAfterCount, setEndAfterCount] = useState(block.recurrence_count ?? 10);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // scope picker, only meaningful when the block actually recurs
  const isRecurring = block.recurrence !== "none";
  const [scope, setScope] = useState<"this" | "all">("this");

  const weekdayLabel = DAY_FULL[new Date(startDate + "T00:00:00").getDay()];

  const toggleRepeatDay = (day: string) =>
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) setEndTime(computeEndTime(startTime, svc.estimated_duration));
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const svc = services.find((s) => s.id === serviceId);
    if (svc) setEndTime(computeEndTime(val, svc.estimated_duration));
  };

  // NEW: switching to virtual clears any selected location, so a stale
  // pick from a previous physical/both selection never gets submitted.
  const handleLocationTypeChange = (val: LocationType) => {
    setLocationType(val);
    if (val === "virtual") setLocationId("");
  };

  const handleSave = async () => {
    // NEW: block save client-side rather than round-tripping to the
    // server just to get the same 400 back — same rule the backend
    // enforces in ProviderScheduleSerializer.validate().
    if (locationRequired(locationType) && !locationId) {
      toast.error("Select a location for this in-person or hybrid block.");
      return;
    }

    setSaving(true);
    try {
      if (isRecurring && scope === "this") {
        // 1. Exclude this date from the recurring series
        const nextExcluded = Array.from(
          new Set([...(block.excluded_dates ?? []), occurrenceDate])
        );
        await axiosClient.patch(
          "provider/" + userId + "/schedule/" + block.id,
          { excluded_dates: nextExcluded }
        );
        // 2. Create a standalone one-off block for just this date, carrying the edits
        await axiosClient.post("provider/" + userId + "/schedule", {
          service: serviceId,
          location_type: locationType,
          location: locationType === "virtual" ? null : locationId, // NEW
          start_date: occurrenceDate,
          end_date: occurrenceDate,
          start_time: startTime,
          end_time: endTime,
          recurrence: "none",
          recurrence_interval: 1,
          recurrence_days: [],
          recurrence_end_type: null,
          recurrence_end_date: null,
          recurrence_count: null,
        });
      } else {
        // Non-recurring block, or user explicitly chose "All events".
        await axiosClient.patch(
          "provider/" + userId + "/schedule/" + block.id,
          {
            service: serviceId,
            location_type: locationType,
            location: locationType === "virtual" ? null : locationId, // NEW
            start_date: startDate,
            end_date: computeSubmittedEndDate({
              repeat,
              endType,
              startDate,
              endDate,
              endAfterDate,
            }),
            start_time: startTime,
            end_time: endTime,
            recurrence: repeat,
            recurrence_interval: repeat === "custom" ? repeatInterval : 1,
            recurrence_days: repeat === "weekly" || repeat === "custom" ? repeatDays : [],
            recurrence_end_type: repeat === "none" ? null : endType,
            recurrence_end_date: endType === "on_date" ? endAfterDate : null,
            recurrence_count: endType === "after" ? endAfterCount : null,
          }
        );
      }
      onSaved();
    } catch (err) {
      toast.error(scheduleErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmMsg =
      isRecurring && scope === "this"
        ? "Delete this single occurrence (" + occurrenceDate + ")?"
        : "Delete this entire recurring schedule block?";
    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      if (isRecurring && scope === "this") {
        await axiosClient.delete(
          "provider/" + userId + "/schedule/" + block.id,
          { params: { occurrence_date: occurrenceDate } }
        );
      } else {
        await axiosClient.delete(
          "provider/" + userId + "/schedule/" + block.id,
          { params: { delete_series: "true" } }
        );
      }
      onDeleted();
    } catch (err) {
      toast.error(scheduleErrorMessage(err));
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
      <div className="bg-card text-foreground rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <LucideCalendarCheck size={18} className="text-blue-600" />
            <h2 className="font-semibold text-foreground">Edit schedule</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <LucideTrash2 size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
              <LucideX size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {isRecurring && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                Editing {occurrenceDate}
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={scope === "this"}
                  onChange={() => setScope("this")}
                />
                This event only
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                All events in this series
              </label>
            </div>
          )}

          <select
            value={serviceId}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="w-full text-base font-medium border-b border-border pb-2 focus:outline-none focus:border-blue-400 bg-transparent text-foreground"
          >
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <div className="flex items-start gap-2">
            <LucideClock size={16} className="text-muted-foreground mt-2 shrink-0" />
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* dates locked when editing a single occurrence — moving a date
                  is out of scope here; "This event" only edits time/service/location */}
              <input
                type="date"
                value={startDate}
                disabled={isRecurring && scope === "this"}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (new Date(e.target.value) > new Date(endDate))
                    setEndDate(e.target.value);
                }}
                className="border border-border rounded-lg px-2 py-1.5 text-sm bg-muted text-foreground disabled:opacity-50"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="border border-border rounded-lg px-2 py-1.5 text-sm bg-muted text-foreground"
              />
              <span className="text-muted-foreground">–</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="border border-border rounded-lg px-2 py-1.5 text-sm bg-muted text-foreground"
              />
              <input
                type="date"
                value={endDate}
                disabled={isRecurring && scope === "this"}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="border border-border rounded-lg px-2 py-1.5 text-sm bg-muted text-foreground disabled:opacity-50"
              />
            </div>
          </div>

          {serviceId && (
            <p className="text-xs text-muted-foreground -mt-2 pl-6">
              End time auto-filled from service duration
              {services.find(s => s.id === serviceId)
                ? ` (${services.find(s => s.id === serviceId)!.estimated_duration} mins)`
                : ""}
              — you can adjust manually.
            </p>
          )}

          {/* Recurrence editing only makes sense in "all events" scope */}
          {(!isRecurring || scope === "all") && (
            <div className="flex items-start gap-2">
              <LucideRepeat size={16} className="text-muted-foreground mt-2 shrink-0" />
              <div className="flex-1 space-y-3">
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value as RepeatType)}
                  className="border border-border rounded-lg px-3 py-1.5 text-sm bg-muted text-foreground w-full"
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
                            : "bg-card text-muted-foreground border-border")
                        }
                      >
                        {d[0]}
                      </button>
                    ))}
                  </div>
                )}

                {repeat !== "none" && (
                  <div className="space-y-2 pl-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Ends</p>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="radio" checked={endType === "never"} onChange={() => setEndType("never")} />
                      Never
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="radio" checked={endType === "on_date"} onChange={() => setEndType("on_date")} />
                      On
                      <input
                        type="date"
                        disabled={endType !== "on_date"}
                        value={endAfterDate}
                        onChange={(e) => setEndAfterDate(e.target.value)}
                        min={startDate}
                        className="border border-border rounded-lg px-2 py-1 text-sm bg-muted text-foreground disabled:opacity-50"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="radio" checked={endType === "after"} onChange={() => setEndType("after")} />
                      After
                      <input
                        type="number"
                        min={1}
                        disabled={endType !== "after"}
                        value={endAfterCount}
                        onChange={(e) => setEndAfterCount(Number(e.target.value))}
                        className="w-14 border border-border rounded-lg px-2 py-1 text-sm bg-muted text-foreground disabled:opacity-50"
                      />
                      occurrence(s)
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <LucideMapPin size={16} className="text-muted-foreground mt-2 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2 flex-wrap">
                {locationOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleLocationTypeChange(opt.key)}
                    className={
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors " +
                      (locationType === opt.key
                        ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                        : "bg-card border-border text-muted-foreground")
                    }
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* NEW: which facility, only for physical/both */}
              <LocationPicker
                locationType={locationType}
                locationId={locationId}
                locations={locations}
                onChange={setLocationId}
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg"
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<ScheduleLocation[]>([]); // NEW
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [bookedAppts, setBookedAppts] = useState<BookedAppointment[]>([]);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<string>("");

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [locationType, setLocationType] = useState<LocationType>("virtual");
  const [locationId, setLocationId] = useState(""); // NEW
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

  // NEW: locations for the picker. ProviderLocationListView returns the
  // full ProviderLocationSerializer shape -- more than this page needs,
  // but there's no lighter endpoint and a provider's location count is
  // small, so no pagination/trimming concerns here.
  const fetchLocations = useCallback(() => {
    if (!userId) return;
    axiosClient
      .get("provider/" + userId + "/locations")
      .then((res) => setLocations(res.data ?? []))
      .catch(() => {});
  }, [userId]);

  const fetchBookedAppts = useCallback(() => {
    if (!userId) return;

    // Match the same window the calendar actually renders (see
    // EXPAND_DAYS_BEFORE / EXPAND_DAYS_AFTER above), so this isn't pulling
    // the provider's entire appointment history just to draw ~67 days of
    // calendar. Also unwraps the paginated {count, results} shape from
    // the backend.
    const start = new Date();
    start.setDate(start.getDate() - EXPAND_DAYS_BEFORE);
    const end = new Date();
    end.setDate(end.getDate() + EXPAND_DAYS_AFTER);

    const params = new URLSearchParams();
    params.set("filter", "all");
    params.set("start", dateKey(start));
    params.set("end", dateKey(end));
    params.set("page_size", "100");

    axiosClient
      .get(`provider/${userId}/appointments?${params.toString()}`)
      .then((res) => setBookedAppts(res.data?.results ?? []))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get("provider/" + userId + "/services")
      .then((res) => setServices(res.data ?? []))
      .catch(() => {});
    fetchSchedules();
    fetchLocations();
    fetchBookedAppts();
  }, [userId, fetchSchedules, fetchLocations, fetchBookedAppts]);

  const handleServiceChange = (id: string) => {
    setSelectedServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) setEndTime(computeEndTime(startTime, svc.estimated_duration));
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const svc = services.find((s) => s.id === selectedServiceId);
    if (svc) setEndTime(computeEndTime(val, svc.estimated_duration));
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

  // NEW: switching to virtual clears any selected location.
  const handleLocationTypeChange = (val: LocationType) => {
    setLocationType(val);
    if (val === "virtual") setLocationId("");
  };

  const weekdayLabel = DAY_FULL[new Date(startDate + "T00:00:00").getDay()];

  const handleSave = async () => {
    if (!selectedServiceId) return;

    // NEW: same client-side guard as the edit modal -- catches the
    // missing-location case before a round trip, matching the backend's
    // ProviderScheduleSerializer.validate() rule.
    if (locationRequired(locationType) && !locationId) {
      toast.error("Select a location for this in-person or hybrid block.");
      return;
    }

    try {
      await axiosClient.post("provider/" + userId + "/schedule", {
        service: selectedServiceId,
        location_type: locationType,
        location: locationType === "virtual" ? null : locationId, // NEW
        start_date: startDate,
        end_date: computeSubmittedEndDate({
          repeat,
          endType,
          startDate,
          endDate,
          endAfterDate,
        }),
        start_time: startTime,
        end_time: endTime,
        recurrence: repeat,
        recurrence_interval: repeat === "custom" ? repeatInterval : 1,
        recurrence_days: repeat === "weekly" || repeat === "custom" ? repeatDays : [],
        recurrence_end_type: repeat === "none" ? null : endType,
        recurrence_end_date: endType === "on_date" ? endAfterDate : null,
        recurrence_count: endType === "after" ? endAfterCount : null,
      });
      // Reset the location pick after a successful add, same as the rest
      // of the form implicitly resets via the dialog closing/reopening.
      setLocationId("");
      fetchSchedules();
    } catch (err) {
      toast.error(scheduleErrorMessage(err));
    }
  };

  const handleEventClick = (appt: Appointment) => {
    if (appt.meta?.type === "schedule") {
      const block = schedules.find((s) => s.id === appt.meta?.scheduleId);
      if (block) {
        setEditingBlock(block);
        setEditingOccurrenceDate((appt.meta?.occurrenceDate as string) ?? block.start_date);
      }
    } else if (appt.meta?.type === "booked" && appt.meta?.appointmentId) {
      router.push("/appointments/" + appt.meta.appointmentId);
    }
  };

  const scheduleEvents = useMemo(
    () => schedules.flatMap(expandToCalendarEvents),
    [schedules]
  );

  const bookedEvents = useMemo<Appointment[]>(
    () =>
      bookedAppts
        .filter((a) => a.status !== "cancelled")
        .map((a) => ({
          id: "booked-" + a.id,
          start: new Date(a.start_time),
          end: new Date(a.end_time),
          patientName:
            a.patient_first_name +
            " " +
            a.patient_last_name +
            (a.service_name ? " · " + a.service_name : "") +
            " · " +
            (a.appointment_type === "virtual" ? "Virtual" : "In-person"),
          meta: {
            type: "booked",
            appointmentId: a.id,
            email: a.patient_email,
            phone: a.patient_phone_number,
            appointment_type: a.appointment_type,
            service_name: a.service_name,
            status: a.status,
            location_type: a.appointment_type,
          },
        })),
    [bookedAppts]
  );

  const allCalendarEvents = useMemo(() => {
    const bookedRanges = bookedEvents.map((b) => ({
      start: b.start.getTime(),
      end: b.end.getTime(),
    }));
    const filteredScheduleEvents = scheduleEvents.filter((slot) => {
      const s = slot.start.getTime();
      const e = slot.end.getTime();
      return !bookedRanges.some((b) => b.start < e && b.end > s);
    });
    return [...filteredScheduleEvents, ...bookedEvents];
  }, [scheduleEvents, bookedEvents]);

  const locationOptions: { key: LocationType; label: string; icon: ReactNode }[] = [
    { key: "virtual", label: "Virtual", icon: <LucideVideo size={14} /> },
    { key: "physical", label: "In-person", icon: <LucideMapPin size={14} /> },
    { key: "both", label: "Both", icon: null },
  ];

  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="p-4 bg-card rounded-lg mx-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Schedule</h1>
          <p className="text-muted-foreground mt-1">
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
                <p className="text-sm text-muted-foreground italic">
                  No services found.{" "}
                  <Link href="/services" className="text-blue-600 hover:underline">
                    Add a service first →
                  </Link>
                </p>
              ) : (
                <select
                  value={selectedServiceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full text-lg font-medium border-b border-border pb-2 focus:outline-none focus:border-blue-400 bg-transparent text-foreground"
                >
                  <option value="">Add title — select a service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-start gap-2">
              <LucideClock size={18} className="text-muted-foreground mt-2 shrink-0" />
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-muted text-foreground"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-muted text-foreground"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-muted text-foreground"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-muted text-foreground"
                />
              </div>
            </div>

            {selectedService && (
              <p className="text-xs text-muted-foreground -mt-2 pl-6">
                End time auto-filled from &quot;{selectedService.name}&quot; duration ({selectedService.estimated_duration} mins) — you can adjust manually.
              </p>
            )}

            <div className="flex items-start gap-2">
              <LucideRepeat size={18} className="text-muted-foreground mt-2 shrink-0" />
              <div className="flex-1 space-y-3">
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value as RepeatType)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-muted text-foreground"
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
                            : "bg-card text-muted-foreground border-border")
                        }
                      >
                        {d[0]}
                      </button>
                    ))}
                  </div>
                )}
                {repeat !== "none" && (
                  <div className="space-y-2 pl-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Ends</p>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="radio" checked={endType === "never"} onChange={() => setEndType("never")} />
                      Never
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="radio" checked={endType === "on_date"} onChange={() => setEndType("on_date")} />
                      On
                      <input
                        type="date"
                        disabled={endType !== "on_date"}
                        value={endAfterDate}
                        onChange={(e) => setEndAfterDate(e.target.value)}
                        min={startDate}
                        className="border border-border rounded-lg px-2 py-1 text-sm bg-muted text-foreground disabled:opacity-50"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="radio" checked={endType === "after"} onChange={() => setEndType("after")} />
                      After
                      <input
                        type="number"
                        min={1}
                        disabled={endType !== "after"}
                        value={endAfterCount}
                        onChange={(e) => setEndAfterCount(Number(e.target.value))}
                        className="w-16 border border-border rounded-lg px-2 py-1 text-sm bg-muted text-foreground disabled:opacity-50"
                      />
                      occurrence(s)
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <LucideMapPin size={18} className="text-muted-foreground mt-2 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Location</p>
                <div className="flex gap-2">
                  {locationOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleLocationTypeChange(opt.key)}
                      className={
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors " +
                        (locationType === opt.key
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                          : "bg-card border-border text-muted-foreground")
                      }
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* NEW: which facility, only for physical/both */}
                <LocationPicker
                  locationType={locationType}
                  locationId={locationId}
                  locations={locations}
                  onChange={setLocationId}
                />
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
          occurrenceDate={editingOccurrenceDate}
          userId={userId}
          services={services}
          locations={locations}
          onClose={() => setEditingBlock(null)}
          onSaved={() => { setEditingBlock(null); fetchSchedules(); }}
          onDeleted={() => { setEditingBlock(null); fetchSchedules(); }}
        />
      )}
    </div>
  );
}
