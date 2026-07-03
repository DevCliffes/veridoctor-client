"use client";

import { Button } from "@veridoctor/design/components";
import {
  DataTable,
  DatatableColumnHeader,
  DatatableFilterTabs,
} from "@veridoctor/design/shared";
import { axiosClient } from "@veridoctor/api-client";
import { LucideVideo, LucidePlus } from "@veridoctor/design/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAppSelector } from "../../hooks";
import { toast } from "sonner";

function getIdentityId(identity: unknown): string {
  if (typeof identity === "string") {
    if (!identity) return "";
    try {
      const parsed = JSON.parse(identity);
      if (parsed && typeof parsed === "object" && typeof parsed.id === "string")
        return parsed.id;
    } catch {}
    return identity;
  }
  if (identity && typeof identity === "object" && "id" in identity) {
    const val = (identity as Record<string, unknown>).id;
    if (typeof val === "string") return val;
  }
  return "";
}

type Appointment = {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
  appointment_type: "virtual" | "physical";
  service: string | null;
  service_name: string | null;
  start_time: string;
  end_time: string;
  status: string;
  meet_id: string;
};

interface Slot {
  start_time: string;
  end_time: string;
  service_id: string | null;
  location_type: "virtual" | "physical" | "both";
  duration_minutes: number;
}

const DONE_STATUSES = ["completed", "cancelled", "no-show"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Reschedule Modal with slot picker ────────────────────────────────────────
function RescheduleModal({
  appt,
  providerId,
  onClose,
  onRescheduled,
}: {
  appt: Appointment;
  providerId: string;
  onClose: () => void;
  onRescheduled: (id: string, newStart: string, newEnd: string) => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!date || !providerId) return;
    setSlots([]);
    setSelectedSlot(null);
    setLoadingSlots(true);
    axiosClient
      .get(`/provider/${providerId}/available-slots?date=${date}`)
      .then((res) => {
        const all: Slot[] = res.data ?? [];
        // Filter slots matching the appointment type
        const filtered = all.filter((s) => {
          return (
            s.location_type === "both" ||
            s.location_type === appt.appointment_type
          );
        });
        setSlots(filtered);
      })
      .catch(() => toast.error("Failed to load available slots"))
      .finally(() => setLoadingSlots(false));
  }, [date, providerId, appt.appointment_type]);

  const handleConfirm = async () => {
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }
    setSaving(true);
    try {
      await axiosClient.patch(`/provider/${providerId}/appointments/${appt.id}`, {
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        status: "scheduled",
      });
      onRescheduled(appt.id, selectedSlot.start_time, selectedSlot.end_time);
      toast.success("Appointment rescheduled");
      onClose();
    } catch {
      toast.error("Failed to reschedule appointment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm space-y-4 p-6">
        <h3 className="font-semibold text-gray-800 text-base">
          Reschedule — {appt.patient_first_name} {appt.patient_last_name}
        </h3>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
            Select Date
          </label>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">
            Available Times
          </label>
          {!date ? (
            <p className="text-sm text-gray-400">Pick a date first</p>
          ) : loadingSlots ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-400">No available slots for this date</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {slots.map((slot) => (
                <button
                  key={slot.start_time}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={
                    "px-2 py-2 rounded-lg text-xs font-medium border transition-colors " +
                    (selectedSlot?.start_time === slot.start_time
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400")
                  }
                >
                  {formatTime(slot.start_time)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !selectedSlot}
            className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Appointments() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { identity } = useAppSelector((store) => store.auth);
  const userId = getIdentityId(identity);

  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);

  const filter = searchParams.get("filter") ?? "today";
  const appointmentType = searchParams.get("appointment_type") ?? "";

  const openNewAppointment = () => {
    window.dispatchEvent(new CustomEvent("vd:new-appointment"));
  };

  const joinCall = (meetId: string) => {
    window.location.href = `https://telehealth.veridoctor.com/${meetId}?userId=${userId}&isOfferer=true`;
  };

  // Join is only allowed from 30 minutes before start_time through 30
  // minutes after end_time — outside that window the button is disabled
  // even if the appointment is virtual and not yet marked done.
  const CALL_WINDOW_MS = 30 * 60 * 1000;
  const isWithinCallWindow = (startIso: string, endIso: string) => {
    const now = Date.now();
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    return now >= start - CALL_WINDOW_MS && now <= end + CALL_WINDOW_MS;
  };

  const isJoinEnabled = (appt: Appointment) => {
    if (DONE_STATUSES.includes(appt.status)) return false;
    if (appt.appointment_type !== "virtual") return false;
    return isWithinCallWindow(appt.start_time, appt.end_time);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setCancellingId(id);
    try {
      await axiosClient.patch(`/provider/${userId}/appointments/${id}`, {
        status: "cancelled",
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
      );
      toast.success("Appointment cancelled");
    } catch {
      toast.error("Failed to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRescheduled = (id: string, newStart: string, newEnd: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, start_time: newStart, end_time: newEnd, status: "scheduled" }
          : a
      )
    );
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      cancelled: "bg-red-100 text-red-700",
      confirmed: "bg-green-100 text-green-700",
      completed: "bg-blue-100 text-blue-700",
      scheduled: "bg-yellow-100 text-yellow-700",
      "in-progress": "bg-indigo-100 text-indigo-700",
      "no-show": "bg-gray-100 text-gray-500",
    };
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium ${
          styles[status] ?? "bg-gray-100 text-gray-600"
        }`}
      >
        {status}
      </span>
    );
  };

  const tableRows: {
    id: string;
    name: ReactNode;
    service: ReactNode;
    date: string;
    status: ReactNode;
    call: ReactNode;
    actions: ReactNode;
  }[] = appointments.map((appointment) => ({
    id: appointment.id,
    name: (
      <button
        className="text-blue-600 hover:underline font-medium text-left"
        onClick={() => router.push(`/appointments/${appointment.id}`)}
      >
        {appointment.patient_first_name} {appointment.patient_last_name}
      </button>
    ),
    service: (
      <span className="text-xs text-gray-600">
        {appointment.service_name ?? (
          <span className="text-gray-300 italic">—</span>
        )}
      </span>
    ),
    date: new Date(appointment.start_time).toLocaleString("en-KE"),
    status: statusBadge(appointment.status),
    call: DONE_STATUSES.includes(appointment.status) ? (
      <span className="text-xs text-gray-400">—</span>
    ) : appointment.appointment_type === "virtual" ? (
      <Button
        size="sm"
        variant="rounded"
        onClick={() => joinCall(appointment.meet_id)}
        disabled={!isJoinEnabled(appointment)}
      >
        <LucideVideo /> Join call
      </Button>
    ) : (
      <span className="text-xs text-gray-500">In-person</span>
    ),
    actions: DONE_STATUSES.includes(appointment.status) ? (
      <span className="text-xs text-gray-400">—</span>
    ) : (
      <div className="flex gap-1">
        <button
          onClick={() => setReschedulingAppt(appointment)}
          className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
        >
          Reschedule
        </button>
        <button
          onClick={() => handleCancel(appointment.id)}
          disabled={cancellingId === appointment.id}
          className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {cancellingId === appointment.id ? "..." : "Cancel"}
        </button>
      </div>
    ),
  }));

  const tableColumns: DatatableColumnHeader[] = [
    { name: "Patient Name", type: "string", key: "name" },
    { name: "Service", type: "string", key: "service" },
    { name: "Date/Time", type: "string", key: "date" },
    { name: "Status", type: "string", key: "status" },
    { name: "Call", type: "string", key: "call" },
    { name: "Actions", type: "string", key: "actions" },
  ];

  const fetchAppointments = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("filter", filter);
    if (appointmentType) params.set("appointment_type", appointmentType);
    axiosClient
      .get(`/provider/${userId}/appointments?${params.toString()}`)
      .then((res) => setAppointments(res.data ?? []))
      .catch(() => toast.error("Could not load appointments"))
      .finally(() => setLoading(false));
  }, [appointmentType, filter, userId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateQueryParams = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const filterTabs: DatatableFilterTabs = {
    tabs: [
      {
        name: "Today",
        value: "today",
        action: (f) => updateQueryParams("filter", f),
      },
      {
        name: "Upcoming",
        value: "upcoming",
        action: (f) => updateQueryParams("filter", f),
      },
      {
        name: "Past",
        value: "past",
        action: (f) => updateQueryParams("filter", f),
      },
    ],
    defaultTab: filter,
  };

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      {reschedulingAppt && (
        <RescheduleModal
          appt={reschedulingAppt}
          providerId={userId}
          onClose={() => setReschedulingAppt(null)}
          onRescheduled={handleRescheduled}
        />
      )}

      <div className="flex justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Appointments</h1>
          <p className="text-gray-600 mt-2">Manage your appointments here.</p>
        </div>
        <Button onClick={openNewAppointment}>
          <LucidePlus /> New appointment
        </Button>
      </div>

      <DataTable
        rows={tableRows}
        columns={tableColumns}
        isLoading={loading}
        filterTabs={filterTabs}
      />
    </div>
  );
}
