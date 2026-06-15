"use client";
import { useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { useRouter } from "next/navigation";

interface Appointment {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  start_time: string;
  end_time: string;
  appointment_type: "virtual" | "physical";
  status: string;
  meet_id?: string;
}

interface TodayScheduleProps {
  identityId: string;
}

function getInitials(first: string, last: string) {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
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

function Row({ appt }: { appt: Appointment }) {
  const router = useRouter();
  const mins = minutesUntil(appt.start_time);
  const isNext = mins > 0 && mins <= 60;
  const isPast = mins < 0;

  const borderClass = isNext
    ? "border-blue-200 bg-blue-50"
    : "border-gray-100 bg-gray-50";
  const typeClass =
    appt.appointment_type === "virtual"
      ? "bg-indigo-100 text-indigo-700"
      : "bg-green-100 text-green-700";
  const statusClass =
    appt.status === "confirmed"
      ? "bg-green-100 text-green-700"
      : appt.status === "cancelled"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <button
      onClick={() => router.push(`/appointments/${appt.id}`)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left hover:shadow-sm transition-shadow ${borderClass}`}
    >
      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
        {getInitials(appt.patient_first_name, appt.patient_last_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {appt.patient_first_name} {appt.patient_last_name}
        </p>
        <p className="text-xs text-gray-500">
          {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeClass}`}>
          {appt.appointment_type}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
          {appt.status}
        </span>
        {isNext && (
          <span className="text-xs text-blue-600 font-medium">in {mins}m</span>
        )}
        {isPast && (
          <span className="text-xs text-gray-400">done</span>
        )}
      </div>
    </button>
  );
}

export function TodaySchedule({ identityId }: TodayScheduleProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!identityId) return;
    axiosClient
      .get(`/provider/${identityId}/appointments?filter=today`)
      .then((res) => setAppointments(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [identityId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Today's Schedule</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <h2 className="font-semibold text-gray-700 mb-3">
        Today's Schedule{" "}
        <span className="text-gray-400 font-normal text-sm">
          ({appointments.length})
        </span>
      </h2>
      {appointments.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">
          No appointments scheduled for today.
        </p>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <Row key={appt.id} appt={appt} />
          ))}
        </div>
      )}
    </div>
  );
}
