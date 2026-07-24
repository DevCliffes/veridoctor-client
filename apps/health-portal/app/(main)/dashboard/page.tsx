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
  LucideActivity,
  LucideHeartPulse,
  LucideThermometer,
  LucideWeight,
  LucideRuler,
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
  doctor_first_name?: string;
  doctor_last_name?: string;
  provider_id?: string;
  provider_identity_id?: string;
  service_name?: string | null;
}

interface Vital {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  recorded_at: string;
  provider_name: string | null;
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

function formatTimeUntil(mins: number): string {
  if (mins <= 0) return "coming up now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  const remainingMins = mins % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  if (remainingMins > 0 && days === 0)
    parts.push(`${remainingMins} min${remainingMins === 1 ? "" : "s"}`);
  return parts.join(" ");
}

function getDoctorName(appt: Appointment): string | null {
  const first = appt.doctor_first_name || appt.provider_first_name || "";
  const last = appt.doctor_last_name || appt.provider_last_name || "";
  if (!first && !last) return null;
  return `Dr. ${first} ${last}`.trim();
}

function getDoctorProfileId(appt: Appointment): string | null {
  return appt.provider_identity_id || appt.provider_id || null;
}

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

const VITAL_ICONS: Record<string, typeof LucideActivity> = {
  blood_pressure: LucideActivity,
  pulse: LucideHeartPulse,
  temperature: LucideThermometer,
  weight: LucideWeight,
  height: LucideRuler,
};

const TELEHEALTH_URL = "https://telehealth.veridoctor.com";

export default function Dashboard() {
  const router = useRouter();
  const { identity, user } = useAppSelector((store) => store.auth);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("there");
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loadingVitals, setLoadingVitals] = useState(true);

  const identityId = getIdentityId(identity);
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
    if (!patientEmail) { setLoading(false); return; }
    setLoading(true);
    axiosClient
      .get("/appointments?patient_email=" + patientEmail + "&filter=upcoming")
      .then((res) => setAppointments((res.data ?? []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientEmail]);

  useEffect(() => {
    if (!identityId) { setLoadingVitals(false); return; }
    axiosClient
      .get(`/records/patient/${identityId}/vitals`)
      .then((res) => setVitals(res.data?.vitals ?? []))
      .catch(() => {})
      .finally(() => setLoadingVitals(false));
  }, [identityId]);

  const nextAppt = appointments[0];
  const minsUntilNext = nextAppt ? minutesUntil(nextAppt.start_time) : null;

  return (
    <div className="space-y-4">
      {/* Gradient hero already reads fine in both modes -- brand blue/indigo
          against white text keeps enough contrast either way, so no dark:
          variants needed here. */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <p className="text-blue-100 text-sm">Good day,</p>
        <h1 className="text-2xl font-bold mt-0.5">
          {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
        </h1>
        {nextAppt && minsUntilNext !== null ? (
          <p className="text-blue-100 text-sm mt-2">
            {minsUntilNext > 0
              ? `You have an appointment in ${formatTimeUntil(minsUntilNext)}`
              : "You have an appointment coming up now"}
          </p>
        ) : (
          <p className="text-blue-100 text-sm mt-2">No upcoming appointments scheduled.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/book" className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col gap-2 hover:border-primary/40 transition-colors">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <LucideCalendarCheck size={18} />
          </div>
          <p className="font-semibold text-foreground text-sm">Find a Doctor</p>
          <p className="text-xs text-muted-foreground">Book an appointment</p>
        </Link>
        <Link href="/appointments" className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col gap-2 hover:border-primary/40 transition-colors">
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <LucideCalendarCheck size={18} />
          </div>
          <p className="font-semibold text-foreground text-sm">My Appointments</p>
          <p className="text-xs text-muted-foreground">View all consultations</p>
        </Link>
      </div>

      {!loadingVitals && vitals.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Recent Vitals</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {vitals.map((v) => {
              const Icon = VITAL_ICONS[v.key] ?? LucideActivity;
              return (
                <div key={v.key} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />
                    <p className="text-xs text-muted-foreground">{v.label}</p>
                  </div>
                  <p className="text-base font-bold text-foreground">
                    {v.value}
                    {v.unit && <span className="text-xs font-normal text-muted-foreground ml-1">{v.unit}</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {timeAgo(v.recorded_at)}
                    {v.provider_name && <span> · {v.provider_name}</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Upcoming Appointments</h2>
          <Link href="/appointments" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
            See all <LucideChevronRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LucideLoader2 size={20} className="animate-spin text-primary/60" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No upcoming appointments.</p>
            <Link href="/book" className="text-primary text-sm font-medium mt-1 inline-block hover:underline">Book one now</Link>
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

              const doctorName = getDoctorName(appt);
              const profileId = getDoctorProfileId(appt);

              return (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/40">
                  <div className={"w-9 h-9 rounded-full flex items-center justify-center shrink-0 " + (appt.appointment_type === "virtual" ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400" : "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400")}>
                    {appt.appointment_type === "virtual" ? <LucideVideo size={16} /> : <LucideMapPin size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {doctorName && profileId ? (
                      <button onClick={() => router.push(`/book/provider/${profileId}`)} className="text-sm font-medium text-primary hover:underline text-left">
                        {doctorName}
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-foreground">
                        {doctorName ?? (appt.appointment_type === "virtual" ? "Virtual Consultation" : "In-person Consultation")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(appt.start_time)} · {formatTime(appt.start_time)}
                      {appt.service_name && <span className="text-muted-foreground/80"> · {appt.service_name}</span>}
                    </p>
                  </div>
                  {isJoinable && appt.meet_id && (
                    <button
                      onClick={() => {
                        window.location.href = `${TELEHEALTH_URL}/${appt.meet_id}?userId=${patientEmail}&isOfferer=false`;
                      }}
                      className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-lg hover:bg-primary/90 shrink-0"
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
