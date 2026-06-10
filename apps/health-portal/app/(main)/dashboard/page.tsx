"use client";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideCalendarCheck,
  LucideCalendarClock,
  LucideVideo,
  LucideFileText,
} from "@veridoctor/design/icons";
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

export default function Dashboard() {
  const { identity, access_token } = useAppSelector((store) => store.auth);
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const patientEmail = identity?.email ?? "";
  const firstName = identity?.first_name ?? "there";

  useEffect(() => {
    if (!patientEmail) return;
    axiosClient
      .get(`/appointments?patient_email=${patientEmail}&filter=upcoming`)
      .then((res) => setAppointments(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientEmail]);

  const upcoming = appointments.filter((a) => minutesUntil(a.start_time) > 0);
  const nextAppt = upcoming[0];
  const minsUntilNext = nextAppt ? minutesUntil(nextAppt.start_time) : null;

  const quickActions = [
    {
      label: "Book Appointment",
      icon: <LucideCalendarCheck size={20} />,
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
      href: "/appointments",
    },
    {
      label: "Join Virtual Call",
      icon: <LucideVideo size={20} />,
      color: "bg-green-50 text-green-700 hover:bg-green-100",
      href: nextAppt?.meet_id ? `/calls/${nextAppt.meet_id}` : "/appointments",
    },
    {
      label: "My Prescriptions",
      icon: <LucideFileText size={20} />,
      color: "bg-purple-50 text-purple-700 hover:bg-purple-100",
      href: "/prescriptions",
    },
    {
      label: "Upcoming Schedule",
      icon: <LucideCalendarClock size={20} />,
      color: "bg-orange-50 text-orange-700 hover:bg-orange-100",
      href: "/appointments",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-xl font-bold text-gray-800">
          Good {getGreeting()}, {firstName} 👋
        </p>
        <p className="text-gray-500 text-sm mt-1">
          {nextAppt
            ? `You have an appointment ${minsUntilNext! < 60 ? `in ${minsUntilNext} minutes` : `on ${formatDate(nextAppt.start_time)}`}.`
            : "You have no upcoming appointments."}
        </p>
      </div>

      {/* Next appointment banner */}
      {nextAppt && minsUntilNext! <= 60 && (
        <div className="bg-blue-600 text-white rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium opacity-80">Starting soon</p>
            <p className="font-bold text-lg">
              {nextAppt.appointment_type === "virtual" ? "Virtual" : "Physical"} Consultation
            </p>
            <p className="text-sm opacity-80">
              {formatTime(nextAppt.start_time)} · in {minsUntilNext} min
            </p>
          </div>
          {nextAppt.appointment_type === "virtual" && nextAppt.meet_id && (
            <button
              onClick={() => router.push(`/calls/${nextAppt.meet_id}`)}
              className="bg-white text-blue-600 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-50"
            >
              Join Now
            </button>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className={`flex items-center gap-3 p-4 rounded-xl border border-transparent transition-colors ${action.color}`}
          >
            {action.icon}
            <span className="text-sm font-medium">{action.label}</span>
          </a>
        ))}
      </div>

      {/* Upcoming appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Upcoming Appointments</h2>
          <a href="/appointments" className="text-xs text-blue-600 hover:underline">
            View all
          </a>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-8">
            <LucideCalendarCheck size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">No upcoming appointments.</p>
            <a
              href="/appointments"
              className="text-blue-600 text-sm font-medium hover:underline mt-1 inline-block"
            >
              Book one now
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 4).map((appt) => (
              <div
                key={appt.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    appt.appointment_type === "virtual"
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {appt.appointment_type === "virtual" ? (
                    <LucideVideo size={16} />
                  ) : (
                    <LucideCalendarCheck size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {appt.appointment_type === "virtual" ? "Virtual" : "Physical"} Consultation
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(appt.start_time)} · {formatTime(appt.start_time)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    appt.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
