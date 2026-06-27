"use client";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideCalendarCheck,
  LucideVideo,
  LucideMapPin,
  LucideLoader2,
  LucideChevronRight,
} from "@veridoctor/design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  appointment_type: "virtual" | "physical";
  status: string;
  meet_id?: string;
  provider_first_name?: string;
  provider_last_name?: string;
  provider_id?: string;
}

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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

const TELEHEALTH_URL =
  process.env.NEXT_PUBLIC_TELEHEALTH_URL ||
  "https://veridoctor-client-telehealth.vercel.app";

export default function Dashboard() {
  const router = useRouter();
  const { identity, user } = useAppSelector((store) => store.auth);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("there");

  // identity is a cookie string ID — used only for the name greeting fetch
  const identityId = getIdentityId(identity);
  // user.email is the reliable source for patient email (set at login)
  const patientEmail = user?.email ?? "";

  useEffect(() => {
    if (!identityId) return;
    axiosClient
      .get(`/identity/register/${identityId}`)
      .then((res) => {
        const name = res.data?.first_name;
        if (name) setFirstName(name);
      })
      .catch(() => {});
  }, [identityId]);

  useEffect(() => {
    if (!patientEmail) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axiosClient
      .get("/appointments?patient_email=" + patientEmail + "&filter=upcoming")
      .then((res) => setAppointments((res.data ?? []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientEmail]);

  const nextAppt = appointments[0];
  const minsUntilNext = nextAppt ? minutesUntil(nextAppt.start_time) : null;

  return (
    <div className="space-y-4">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <p className="text-blue-100 text-sm">Good day,</p>
        <h1 className="text-2xl font-bold mt-0.5">
          {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
        </h1>
        {nextAppt ? (
          <p className="text-blue-100 text-sm mt-2">
            You have an appointment{" "}
            {minsUntilNext !== null && minsUntilNext > 0
              ? "in " + minsUntilNext + " minutes"
              : "coming up"}
          </p>
        ) : (
          <p className="text-blue-100 text-sm mt-2">
            No upcoming appointments scheduled.
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/book"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2 hover:border-blue-200 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <LucideCalendarCheck size={18} />
          </div>
          <p className="font-semibold text-gray-800 text-sm">Find a Doctor</p>
          <p className="text-xs text-gray-400">Book an appointment</p>
        </Link>

        <Link
          href="/appointments"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2 hover:border-blue-200 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <LucideCalendarCheck size={18} />
          </div>
          <p className="font-semibold text-gray-800 text-sm">My Appointments</p>
          <p className="text-xs text-gray-400">View all consultations</p>
        </Link>
      </div>

      {/* Upcoming appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Upcoming</h2>
          <Link
            href="/appointments"
            className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline"
          >
            See all <LucideChevronRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LucideLoader2 size={20} className="animate-spin text-blue-400" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No upcoming appointments.</p>
            <Link
              href="/book"
              className="text-blue-600 text-sm font-medium mt-1 inline-block hover:underline"
            >
              Book one now
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appt) => {
              const mins = minutesUntil(appt.start_time);
              const isJoinable =
                appt.appointment_type === "virtual" &&
                appt.meet_id &&
                mins > -30 &&
                mins < 60;

              const doctorName =
                appt.provider_first_name || appt.provider_last_name
                  ? `Dr. ${appt.provider_first_name ?? ""} ${appt.provider_last_name ?? ""}`.trim()
                  : null;

              return (
                <div
                  key={appt.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
                >
                  <div
                    className={
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0 " +
                      (appt.appointment_type === "virtual"
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-green-100 text-green-600")
                    }
                  >
                    {appt.appointment_type === "virtual" ? (
                      <LucideVideo size={16} />
                    ) : (
                      <LucideMapPin size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {doctorName && appt.provider_id ? (
                      <button
                        onClick={() =>
                          router.push(`/book/provider/${appt.provider_id}`)
                        }
                        className="text-sm font-medium text-blue-600 hover:underline text-left"
                      >
                        {doctorName}
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-gray-800">
                        {doctorName ??
                          (appt.appointment_type === "virtual"
                            ? "Virtual Consultation"
                            : "In-person Consultation")}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatDate(appt.start_time)} ·{" "}
                      {formatTime(appt.start_time)}
                    </p>
                  </div>
                  {isJoinable && appt.meet_id && (
                    <button
                      onClick={() => {
                        window.location.href = `${TELEHEALTH_URL}/${appt.meet_id}?userId=${patientEmail}&isOfferer=false`;
                      }}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 shrink-0"
                    >
                      Join
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
