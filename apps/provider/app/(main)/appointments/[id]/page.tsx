"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import {
  LucideCalendarCheck,
  LucideUser,
  LucidePhone,
  LucideMail,
  LucideVideo,
  LucideMapPin,
  LucideClipboardPen,
  LucideChevronDown,
} from "@veridoctor/design/icons";

type Appointment = {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
  appointment_type: "virtual" | "physical";
  start_time: string;
  end_time: string;
  status: string;
  meet_id?: string;
};

type Form = {
  id: string;
  name: string;
  sections: unknown[];
  created_at: string;
};

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string>("");

  useEffect(() => {
    if (!userId || !id) return;
    Promise.all([
      axiosClient.get(`provider/${userId}/appointments/${id}`),
      axiosClient.get(`provider/${userId}/forms`),
    ])
      .then(([apptRes, formsRes]) => {
        setAppointment(apptRes.data);
        setForms(formsRes.data ?? []);
        if (formsRes.data?.length > 0) setSelectedFormId(formsRes.data[0].id);
      })
      .catch(() => toast.error("Could not load appointment"))
      .finally(() => setLoading(false));
  }, [userId, id]);

  const handleStartCapture = () => {
    if (!selectedFormId) {
      toast.error("Please select a form first");
      return;
    }
    router.push(`/appointments/${id}/capture?form=${selectedFormId}`);
  };

  // Check if a draft already exists for this appointment
  const draftKey = `vd_capture_${id}`;
  const hasDraft = typeof window !== "undefined" && !!localStorage.getItem(draftKey);

  if (loading) {
    return (
      <div className="p-6 mx-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6 mx-4">
        <p className="text-gray-500">Appointment not found.</p>
        <button onClick={() => router.push("/appointments")} className="mt-4 text-blue-600 text-sm hover:underline">← Back to appointments</button>
      </div>
    );
  }

  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const isToday = startTime.toDateString() === new Date().toDateString();
  const isPast = startTime < new Date();

  return (
    <div className="p-4 mx-4 space-y-4 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.push("/appointments")}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        ← Back to appointments
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
              {appointment.patient_first_name?.[0]}{appointment.patient_last_name?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {appointment.patient_first_name} {appointment.patient_last_name}
              </h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                appointment.status === "confirmed"
                  ? "bg-green-100 text-green-700"
                  : appointment.status === "cancelled"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {appointment.status}
              </span>
            </div>
          </div>

          {/* Start Consultation CTA */}
          <div className="flex flex-col items-end gap-2">
            {hasDraft && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                📝 Draft saved — click to resume
              </span>
            )}
            <div className="flex items-center gap-2">
              {/* Form selector */}
              <div className="relative">
                <select
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                >
                  {forms.length === 0 ? (
                    <option value="">No forms available</option>
                  ) : (
                    forms.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))
                  )}
                </select>
                <LucideChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={handleStartCapture}
                disabled={forms.length === 0}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <LucideClipboardPen size={15} />
                {hasDraft ? "Resume Capture" : "Start Capture"}
              </button>
            </div>
            {forms.length === 0 && (
              <button
                onClick={() => router.push("/forms/new")}
                className="text-xs text-blue-600 hover:underline"
              >
                Create a form first →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Appointment details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Appointment Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <LucideCalendarCheck size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
              <p className="text-sm text-gray-700 font-medium">
                {startTime.toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              {isToday && <span className="text-xs text-green-600 font-medium">Today</span>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <LucideCalendarCheck size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Time</p>
              <p className="text-sm text-gray-700 font-medium">
                {startTime.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} –{" "}
                {endTime.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {appointment.appointment_type === "virtual" ? (
              <LucideVideo size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            ) : (
              <LucideMapPin size={16} className="text-green-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Type</p>
              <p className="text-sm text-gray-700 font-medium capitalize">{appointment.appointment_type}</p>
            </div>
          </div>
          {appointment.appointment_type === "virtual" && appointment.meet_id && (
            <div className="flex items-start gap-3">
              <LucideVideo size={16} className="text-indigo-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Call</p>
                <button
                  onClick={() => router.push(`/calls/${appointment.meet_id}`)}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Join video call →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient contact */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-semibold text-gray-700">Patient Contact</h2>
        {appointment.patient_email && (
          <div className="flex items-center gap-3">
            <LucideMail size={15} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700">{appointment.patient_email}</span>
          </div>
        )}
        {appointment.patient_phone_number && (
          <div className="flex items-center gap-3">
            <LucidePhone size={15} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700">{appointment.patient_phone_number}</span>
          </div>
        )}
      </div>

      {/* Past captures for this appointment */}
      <PastCaptures appointmentId={id} userId={userId} router={router} />
    </div>
  );
}

function PastCaptures({ appointmentId, userId, router }: { appointmentId: string; userId: string | null; router: ReturnType<typeof useRouter> }) {
  const [captures, setCaptures] = useState<{ id: string; form_name: string; created_at: string }[]>([]);

  useEffect(() => {
    if (!userId || !appointmentId) return;
    axiosClient
      .get(`provider/${userId}/appointments/${appointmentId}/captures`)
      .then((res) => setCaptures(res.data ?? []))
      .catch(() => {});
  }, [userId, appointmentId]);

  if (captures.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
      <h2 className="font-semibold text-gray-700">Previous Captures</h2>
      <div className="space-y-2">
        {captures.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">{c.form_name}</p>
              <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString("en-KE")}</p>
            </div>
            <button
              onClick={() => router.push(`/appointments/${appointmentId}/capture/${c.id}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              View →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
