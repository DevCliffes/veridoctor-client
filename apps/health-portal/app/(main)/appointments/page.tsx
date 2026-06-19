"use client";
import { useEffect, useState, useCallback } from "react";
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
  provider_first_name: string | null;
  provider_last_name: string | null;
  start_time: string;
  end_time: string;
  appointment_type: "virtual" | "physical";
  status: string;
  meet_id?: string;
  message?: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-KE");
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
  function handleJoin() {
    window.location.href =
      TELEHEALTH_URL + "/" + meetId + "?userId=" + patientEmail + "&isOfferer=false";
  }
  return (
    <button
      onClick={handleJoin}
      className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
    >
      <LucideVideo size={13} /> Join call
    </button>
  );
}

export default function Appointments() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAppSelector((store) => store.auth);
  const patientEmail = user?.email ?? "";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

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
    const mins = minutesUntil(appt.start_time);
    return mins > -30 && mins < 60;
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setCancellingId(id);
    try {
      await axiosClient.patch("/appointments/" + id, { status: "cancelled" });
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
    const newStart = new Date(rescheduleDate + "T" + rescheduleTime).toISOString();
    const duration =
      new Date(reschedulingAppt.end_time).getTime() -
      new Date(reschedulingAppt.start_time).getTime();
    const newEnd = new Date(new Date(newStart).getTime() + duration).toISOString();
    try {
      await axiosClient.patch("/appointments/" + reschedulingAppt.id, {
        start_time: newStart,
        end_time: newEnd,
        status: "scheduled",
      });
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

  const tableColumns: DatatableColumnHeader[] = [
    { name: "Doctor", type: "string", key: "name" },
    { name: "Date/Time", type: "string", key: "date" },
    { name: "Status", type: "string", key: "status" },
    { name: "Call", type: "string", key: "call" },
    { name: "Actions", type: "string", key: "actions" },
  ];

  const tableRows: {
    id: string;
    name: ReactNode;
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
        {appt.provider_first_name
          ? "Dr. " + appt.provider_first_name + " " + (appt.provider_last_name ?? "")
          : "Your Provider"}
      </button>
    ),
    date: formatDateTime(appt.start_time),
    status: <StatusBadge status={appt.status} />,
    call:
      appt.appointment_type === "virtual" ? (
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
      appt.status === "cancelled" || appt.status === "completed" ? (
        <span className="text-xs text-gray-400">—</span>
      ) : (
        <div className="flex gap-1">
          <button
            onClick={() => openReschedule(appt)}
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
            <h3 className="font-semibold text-gray-800">Reschedule Appointment</h3>
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
