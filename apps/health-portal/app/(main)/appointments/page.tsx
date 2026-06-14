"use client";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideCalendarCheck,
  LucideCalendarX,
  LucideVideo,
  LucideMapPin,
  LucideLoader2,
} from "@veridoctor/design/icons";

interface Appointment {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  start_time: string;
  end_time: string;
  appointment_type: "virtual" | "physical";
  status: string;
  meet_id?: string;
  message?: string;
}

type FilterTab = "upcoming" | "today" | "past";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
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

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={"fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium " + (type === "success" ? "bg-green-600" : "bg-red-600")}>
      {message}
    </div>
  );
}

export default function Appointments() {
  const { identity } = useAppSelector((store) => store.auth);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const patientEmail = identity?.email ?? "";

  const fetchAppointments = () => {
    if (!patientEmail) return;
    setLoading(true);
    axiosClient
      .get("/appointments?patient_email=" + patientEmail + "&filter=" + activeTab)
      .then((res) => setAppointments(res.data ?? []))
      .catch(() => setToast({ message: "Failed to load appointments", type: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, [patientEmail, activeTab]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await axiosClient.patch("/appointments/" + id, { status: "cancelled" });
      setToast({ message: "Appointment cancelled", type: "success" });
      fetchAppointments();
    } catch {
      setToast({ message: "Failed to cancel appointment", type: "error" });
    } finally {
      setCancelling(null);
    }
  };

  const tabs: { label: string; value: FilterTab }[] = [
    { label: "Upcoming", value: "upcoming" },
    { label: "Today", value: "today" },
    { label: "Past", value: "past" },
  ];

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage your consultations</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={"flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors " + (activeTab === tab.value ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LucideLoader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <LucideCalendarX size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No {activeTab} appointments</p>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab === "upcoming" ? "You have no upcoming appointments booked." : "No " + activeTab + " appointments found."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => {
              const mins = minutesUntil(appt.start_time);
              const canJoin = appt.appointment_type === "virtual" && appt.meet_id && mins > -30 && mins < 60;
              const canCancel = ["scheduled", "confirmed"].includes(appt.status) && mins > 60;

              return (
                <div
                  key={appt.id}
                  className="border border-gray-100 rounded-xl p-4 hover:border-blue-100 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={"w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 " + (appt.appointment_type === "virtual" ? "bg-indigo-100 text-indigo-600" : "bg-green-100 text-green-600")}>
                        {appt.appointment_type === "virtual" ? <LucideVideo size={18} /> : <LucideMapPin size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {appt.appointment_type === "virtual" ? "Virtual" : "In-person"} Consultation
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(appt.start_time)}</p>
                        <p className="text-xs text-gray-500">{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</p>
                        {appt.message && <p className="text-xs text-gray-400 mt-1 italic">"{appt.message}"</p>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={"text-xs px-2 py-0.5 rounded-full font-medium capitalize " + (STATUS_STYLES[appt.status] ?? "bg-gray-100 text-gray-500")}>
                        {appt.status}
                      </span>
                      {canJoin && (
                        
                          href={"/calls/" + appt.meet_id}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 font-medium"
                        >
                          {mins <= 0 ? "Join Now" : "Join in " + mins + "m"}
                        </a>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(appt.id)}
                          disabled={cancelling === appt.id}
                          className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                          {cancelling === appt.id ? <LucideLoader2 size={12} className="animate-spin" /> : <LucideCalendarX size={12} />}
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
