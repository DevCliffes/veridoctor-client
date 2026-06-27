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

const DONE_STATUSES = ["completed", "cancelled", "no-show"];

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
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  const filter = searchParams.get("filter") ?? "today";
  const appointmentType = searchParams.get("appointment_type") ?? "";

  const openNewAppointment = () => {
    window.dispatchEvent(new CustomEvent("vd:new-appointment"));
  };

  const joinCall = (meetId: string) => {
  window.location.href = `https://veridoctor-client-telehealth.vercel.app/${meetId}?userId=${userId}&isOfferer=true`;
};

  // Join call is only active for today's non-terminal virtual appointments
  const isJoinEnabled = (appt: Appointment) => {
    if (DONE_STATUSES.includes(appt.status)) return false;
    if (appt.appointment_type !== "virtual") return false;
    return new Date(appt.start_time).toDateString() === new Date().toDateString();
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

  const openReschedule = (appt: Appointment) => {
    setReschedulingAppt(appt);
    const d = new Date(appt.start_time);
    setRescheduleDate(d.toISOString().split("T")[0]);
    setRescheduleTime(d.toTimeString().slice(0, 5));
  };

  const handleReschedule = async () => {
    if (!reschedulingAppt || !rescheduleDate || !rescheduleTime) {
      toast.error("Please select a new date and time");
      return;
    }
    setRescheduleSaving(true);
    const newStart = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
    const duration =
      new Date(reschedulingAppt.end_time).getTime() -
      new Date(reschedulingAppt.start_time).getTime();
    const newEnd = new Date(new Date(newStart).getTime() + duration).toISOString();

    try {
      await axiosClient.patch(
        `/provider/${userId}/appointments/${reschedulingAppt.id}`,
        { start_time: newStart, end_time: newEnd, status: "scheduled" }
      );
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === reschedulingAppt.id
            ? { ...a, start_time: newStart, end_time: newEnd, status: "scheduled" }
            : a
        )
      );
      toast.success("Appointment rescheduled");
      setReschedulingAppt(null);
    } catch {
      toast.error("Failed to reschedule appointment");
    } finally {
      setRescheduleSaving(false);
    }
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
    // Completed/cancelled/no-show → dash. Virtual active → Join call. Physical → In-person.
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
    // Completed/cancelled/no-show → no actions
    actions: DONE_STATUSES.includes(appointment.status) ? (
      <span className="text-xs text-gray-400">—</span>
    ) : (
      <div className="flex gap-1">
        <button
          onClick={() => openReschedule(appointment)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-800">
              Reschedule — {reschedulingAppt.patient_first_name}{" "}
              {reschedulingAppt.patient_last_name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  New Time
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setReschedulingAppt(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={rescheduleSaving}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {rescheduleSaving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
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
