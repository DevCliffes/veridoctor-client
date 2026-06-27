"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  DataTable,
  DatatableColumnHeader,
  DatatableFilterTabs,
} from "@veridoctor/design/shared";
import { LucideVideo } from "@veridoctor/design/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";

const TELEHEALTH_URL =
  process.env.NEXT_PUBLIC_TELEHEALTH_URL ||
  "https://veridoctor-client-telehealth.vercel.app";

interface Appointment {
  id: string;
  doctor_first_name: string | null;
  doctor_last_name: string | null;
  provider_id: string | null;
  provider_identity_id: string | null;
  start_time: string;
  end_time: string;
  appointment_type: "virtual" | "physical";
  status: string;
  meet_id?: string;
  message?: string;
  service?: string | null;
  service_name?: string | null;
}

interface Slot {
  start_time: string;
  end_time: string;
  service_id: string | null;
  location_type: "virtual" | "physical" | "both";
  duration_minutes: number;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-KE");
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  scheduled: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  "in-progress": "bg-blue-100 text-blue-700",
  "no-show": "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        "text-xs px-2 py-1 rounded-full font-medium capitalize " +
        (STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600")
      }
    >
      {status}
    </span>
  );
}

function JoinButton({ meetId, patientEmail }: { meetId: string; patientEmail: string }) {
  return (
    <button
      onClick={() => {
        window.location.href =
          TELEHEALTH_URL + "/" + meetId + "?userId=" + patientEmail + "&isOfferer=false";
      }}
      className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
    >
      <LucideVideo size={13} /> Join call
    </button>
  );
}

// ── Reschedule Modal ─────────────────────────────────────────────────────────

function RescheduleModal({
  appt,
  onClose,
  onRescheduled,
}: {
  appt: Appointment;
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
    if (!date || !appt.provider_identity_id) return;
    setSlots([]);
    setSelectedSlot(null);
    setLoadingSlots(true);
    axiosClient
      .get(`/provider/${appt.provider_identity_id}/available-slots?date=${date}`)
      .then((res) => {
        const all: Slot[] = res.data ?? [];
        const filtered = all.filter((s) => {
          if (
            appt.appointment_type !== "virtual" &&
            appt.appointment_type !== "physical"
          )
            return true;
          return (
            s.location_type === "both" ||
            s.location_type === appt.appointment_type
          );
        });
        setSlots(filtered);
      })
      .catch(() => toast.error("Failed to load available slots"))
      .finally(() => setLoadingSlots(false));
  }, [date, appt.provider_identity_id, appt.appointment_type]);

  const handleConfirm = async () => {
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }
    setSaving(true);
    try {
      await axiosClient.patch(`/appointments/${appt.id}/`, {
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
          Reschedule Appointment
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
            <p className="text-sm text-gray-400">
              No available slots for this date
            </p>
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

function AppointmentsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAppSelector((store) => store.auth);
  const patientEmail = user?.email ?? "";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);

  const filter = searchParams.get("filter") ?? "upcoming";

  const updateQueryParams = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    router.replace(pathname + "?" + params.toString());
  };

  const fetchAppointments = useCallback(() => {
    if (!patientEmail) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axiosClient
      .get("/appointments?patient_email=" + patientEmail + "&filter=" + filter)
      .then((res) => setAppointments(res.data ?? []))
      .catch(() => toast.error("Failed to load appointments"))
      .finally(() => setLoading(false));
  }, [patientEmail, filter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const isJoinable = (appt: Appointment) => {
    if (appt.appointment_type !== "virtual" || !appt.meet_id) return false;
    if (["completed", "cancelled", "no-show"].includes(appt.status)) return false;
    const mins = minutesUntil(appt.start_time);
    return mins > -30 && mins < 60;
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setCancellingId(id);
    try {
      await axiosClient.patch(`/appointments/${id}/`, { status: "cancelled" });
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

  const tableColumns: DatatableColumnHeader[] = [
    { name: "Doctor", type: "string", key: "name" },
    { name: "Service", type: "string", key: "service_name" },
    { name: "Date/Time", type: "string", key: "date" },
    { name: "Status", type: "string", key: "status" },
    { name: "Call", type: "string", key: "call" },
    { name: "Actions", type: "string", key: "actions" },
  ];

  const tableRows: {
    id: string;
    name: ReactNode;
    service_name: ReactNode;
    date: string;
    status: ReactNode;
    call: ReactNode;
    actions: ReactNode;
  }[] = appointments.map((appt) => ({
    id: appt.id,
    name: (
      <button
        className="text-blue-600 hover:underline font-medium text-left"
        onClick={() => router.push("/appointments/" + appt.id)}
      >
        {appt.doctor_first_name
          ? "Dr. " + appt.doctor_first_name + " " + (appt.doctor_last_name ?? "")
          : "Your Provider"}
      </button>
    ),
    service_name: (
      <span className="text-xs text-gray-600">
        {appt.service_name ?? <span className="text-gray-300 italic">—</span>}
      </span>
    ),
    date: formatDateTime(appt.start_time),
    status: <StatusBadge status={appt.status} />,
    call:
      ["completed", "cancelled", "no-show"].includes(appt.status) ? (
        <span className="text-xs text-gray-400">—</span>
      ) : appt.appointment_type === "virtual" ? (
        isJoinable(appt) && appt.meet_id ? (
          <JoinButton meetId={appt.meet_id} patientEmail={patientEmail} />
        ) : (
          <button
            disabled
            className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium opacity-40 cursor-not-allowed"
          >
            <LucideVideo size={13} /> Join call
          </button>
        )
      ) : (
        <span className="text-xs text-gray-500">In-person</span>
      ),
    actions:
      ["cancelled", "completed"].includes(appt.status) ? (
        <span className="text-xs text-gray-400">—</span>
      ) : (
        <div className="flex gap-1">
          <button
            onClick={() => setReschedulingAppt(appt)}
            className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Reschedule
          </button>
          <button
            onClick={() => handleCancel(appt.id)}
            disabled={cancellingId === appt.id}
            className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {cancellingId === appt.id ? "..." : "Cancel"}
          </button>
        </div>
      ),
  }));

  const filterTabs: DatatableFilterTabs = {
    tabs: [
      { name: "Today", value: "today", action: (f) => updateQueryParams("filter", f) },
      { name: "Upcoming", value: "upcoming", action: (f) => updateQueryParams("filter", f) },
      { name: "Past", value: "past", action: (f) => updateQueryParams("filter", f) },
    ],
    defaultTab: filter,
  };

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      {reschedulingAppt && (
        <RescheduleModal
          appt={reschedulingAppt}
          onClose={() => setReschedulingAppt(null)}
          onRescheduled={handleRescheduled}
        />
      )}

      <div className="mb-4">
        <h1 className="text-xl font-bold">My Appointments</h1>
        <p className="text-gray-600 mt-1">View and manage your consultations.</p>
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

export default function Appointments() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
