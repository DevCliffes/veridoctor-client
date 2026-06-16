"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideVideo,
  LucideVideoOff,
  LucideLoader2,
  LucidePhone,
} from "@veridoctor/design/icons";

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
  start_time: string;
  end_time: string;
  status: string;
  meet_id: string;
  appointment_type: string;
};

type FilterTab = "today" | "upcoming" | "past";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
  "in-progress": "bg-blue-100 text-blue-700",
  "no-show": "bg-gray-100 text-gray-500",
};

export default function Calls() {
  const router = useRouter();
  const { identity } = useAppSelector((store) => store.auth);
  const userId = getIdentityId(identity);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("today");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    axiosClient
      .get(
        "/provider/" +
          userId +
          "/appointments?filter=" +
          activeTab +
          "&appointment_type=virtual"
      )
      .then((res) => setAppointments(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, activeTab]);

  const tabs: { label: string; value: FilterTab }[] = [
    { label: "Today", value: "today" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Past", value: "past" },
  ];

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Virtual Calls</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your telehealth consultations
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors " +
              (activeTab === tab.value
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LucideLoader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <LucideVideoOff size={48} className="mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No virtual calls {activeTab}</p>
          <p className="text-sm mt-1">
            {activeTab === "today"
              ? "No virtual consultations scheduled for today."
              : activeTab === "upcoming"
              ? "No upcoming virtual consultations."
              : "No past virtual consultations found."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const mins = minutesUntil(appt.start_time);
            const isJoinable = mins > -30 && mins < 60;
            const isPast = activeTab === "past";
            const initials =
              (appt.patient_first_name[0] ?? "") +
              (appt.patient_last_name[0] ?? "");

            return (
              <div
                key={appt.id}
                className={
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors " +
                  (isJoinable && !isPast
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-100 bg-white hover:bg-gray-50")
                }
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {initials.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">
                    {appt.patient_first_name} {appt.patient_last_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {appt.patient_email}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(appt.start_time)} ·{" "}
                    {formatTime(appt.start_time)} –{" "}
                    {formatTime(appt.end_time)}
                  </p>
                </div>

                {/* Status + action */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={
                      "text-xs px-2 py-0.5 rounded-full font-medium capitalize " +
                      (STATUS_STYLES[appt.status] ?? "bg-gray-100 text-gray-500")
                    }
                  >
                    {appt.status}
                  </span>

                  {isPast ? (
                    <button
                      onClick={() =>
                        router.push("/appointments/" + appt.id)
                      }
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View record
                    </button>
                  ) : isJoinable ? (
                    <button
                      onClick={() => router.push("/calls/" + appt.meet_id)}
                      className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      <LucidePhone size={12} />
                      {mins <= 0 ? "Join Now" : "Join in " + mins + "m"}
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        router.push("/appointments/" + appt.id)
                      }
                      className="text-xs text-gray-400 hover:text-blue-600 hover:underline"
                    >
                      View details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
