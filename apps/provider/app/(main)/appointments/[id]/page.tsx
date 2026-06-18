"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import {
  LucideCalendarCheck,
  LucidePhone,
  LucideMail,
  LucideVideo,
  LucideMapPin,
  LucideClipboardPen,
  LucideChevronDown,
  LucideFileText,
  LucideHistory,
  LucideShieldAlert,
  LucideShieldCheck,
  LucidePill,
  LucideLock,
  LucideLoader2,
} from "@veridoctor/design/icons";

type Appointment = {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
  patient_identity: string | null;
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

type Capture = {
  id: string;
  form_name: string;
  created_at: string;
};

type RecordEntry = {
  appointment: Appointment;
  captures: Capture[];
};

type RecordCategory = {
  speciality: string;
  facility_name: string;
  record_count: number;
  last_record_at: string | null;
  sensitivity: string;
  access_status: "pending" | "approved" | "denied" | null;
  grant_id: string | null;
};

type PatientSummary = {
  patient: {
    uid: string | null;
    identity_id: string;
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string | null;
    blood_type: string | null;
  };
  consultation_active: boolean;
  stats: {
    total_records: number;
    most_recent: string | null;
    active_medications: number;
    prior_facilities: number;
  };
  always_visible: {
    allergies: string[];
    active_medications_count: number;
  };
  record_categories: RecordCategory[];
  access_granted: { id: string; requested_category: string; status: string }[];
};

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "no-show", label: "No Show" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  rescheduled: "bg-purple-100 text-purple-700",
  "no-show": "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
  scheduled: "bg-yellow-100 text-yellow-700",
};

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

function formatDOB(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"details" | "records">("details");
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment || newStatus === appointment.status) return;
    if (
      !confirm(
        `Mark this appointment as "${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}"?`
      )
    )
      return;
    setUpdatingStatus(true);
    try {
      await axiosClient.patch(`provider/${userId}/appointments/${id}`, {
        status: newStatus,
      });
      toast.success("Status updated");
      setAppointment((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      toast.error("Could not update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const draftKey = `vd_capture_${id}`;
  const hasDraft =
    typeof window !== "undefined" && !!localStorage.getItem(draftKey);

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
        <button
          onClick={() => router.push("/appointments")}
          className="mt-4 text-blue-600 text-sm hover:underline"
        >
          ← Back to appointments
        </button>
      </div>
    );
  }

  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const now = new Date();
  const isToday = startTime.toDateString() === now.toDateString();
  const isPast = endTime < now;
  const isFuture = startTime > now;
  const isTerminal = ["cancelled", "completed", "no-show"].includes(
    appointment.status
  );

  const canJoinCall =
    appointment.appointment_type === "virtual" &&
    appointment.meet_id &&
    isToday;

  return (
    <div className="p-4 mx-4 space-y-4 max-w-3xl">
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
              {appointment.patient_first_name?.[0]}
              {appointment.patient_last_name?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {appointment.patient_first_name} {appointment.patient_last_name}
              </h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                  STATUS_STYLES[appointment.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {appointment.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {hasDraft && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                📝 Draft saved — click to resume
              </span>
            )}
            <div className="flex items-center gap-2 flex-wrap justify-end">
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
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))
                  )}
                </select>
                <LucideChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === "details"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === "records"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Patient Records
        </button>
      </div>

      {activeTab === "details" && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Appointment Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <LucideCalendarCheck size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {startTime.toLocaleDateString("en-KE", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {isToday && <span className="text-xs text-green-600 font-medium">Today</span>}
                  {isFuture && !isToday && <span className="text-xs text-blue-500 font-medium">Upcoming</span>}
                  {isPast && !isToday && <span className="text-xs text-gray-400 font-medium">Past</span>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <LucideCalendarCheck size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Time</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {startTime.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
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
                  <p className="text-sm text-gray-700 font-medium capitalize">
                    {appointment.appointment_type}
                  </p>
                </div>
              </div>

              {appointment.appointment_type === "virtual" && appointment.meet_id && (
                <div className="flex items-start gap-3">
                  <LucideVideo
                    size={16}
                    className={canJoinCall ? "text-indigo-500 mt-0.5 shrink-0" : "text-gray-300 mt-0.5 shrink-0"}
                  />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Call</p>
                    {canJoinCall ? (
                      <button
                        onClick={() => router.push(`/calls/${appointment.meet_id}`)}
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        Join video call →
                      </button>
                    ) : (
                      <p className="text-sm text-gray-400 font-medium">
                        {isFuture ? "Available on the day" : "Call has ended"}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isTerminal && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-700 mb-3">Update Status</h2>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter(
                  (s) =>
                    s.value !== appointment.status &&
                    s.value !== "scheduled" &&
                    s.value !== "confirmed"
                ).map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    disabled={updatingStatus}
                    className={`text-sm px-4 py-2 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                      s.value === "completed"
                        ? "border-green-200 text-green-700 hover:bg-green-50"
                        : s.value === "no-show"
                        ? "border-orange-200 text-orange-700 hover:bg-orange-50"
                        : s.value === "rescheduled"
                        ? "border-purple-200 text-purple-700 hover:bg-purple-50"
                        : s.value === "cancelled"
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : s.value === "in-progress"
                        ? "border-blue-200 text-blue-700 hover:bg-blue-50"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {updatingStatus ? "Updating…" : s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <PastCaptures appointmentId={id} userId={userId} router={router} />
        </>
      )}

      {activeTab === "records" && (
        <PatientRecordPanel
          appointmentId={id}
          userId={String(userId ?? "")}
        />
      )}
    </div>
  );
}

// ─── Captures for this specific appointment ───────────────────────────────────
function PastCaptures({
  appointmentId,
  userId,
  router,
}: {
  appointmentId: string;
  userId: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  const [captures, setCaptures] = useState<Capture[]>([]);

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
      <h2 className="font-semibold text-gray-700">Captures for this appointment</h2>
      <div className="space-y-2">
        {captures.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <LucideFileText size={15} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">{c.form_name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleString("en-KE")}
                </p>
              </div>
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

// ─── Patient Record Panel (Medical Records tab) ───────────────────────────────
function PatientRecordPanel({
  appointmentId,
  userId,
}: {
  appointmentId: string;
  userId: string;
}) {
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const fetchSummary = () => {
    axiosClient
      .get(`/records/appointment/${appointmentId}/patient-summary`)
      .then((res) => setSummary(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [appointmentId]);

  const handleRequest = async (category: string) => {
    setRequesting(category);
    try {
      await axiosClient.post("/records/access-request", {
        appointment_id: appointmentId,
        requested_category: category,
        provider_identity_id: userId,
      });
      toast.success(`Access request sent to patient for ${category}`);
      fetchSummary();
    } catch {
      toast.error("Could not send access request");
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LucideLoader2 size={24} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <LucideHistory size={28} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">
          No patient identity linked to this appointment. Records are only
          available for patients with a Veridoctor account.
        </p>
      </div>
    );
  }

  const { patient, stats, always_visible, record_categories, access_granted } = summary;

  const dobFormatted = patient.date_of_birth ? formatDOB(patient.date_of_birth) : null;

  return (
    <div className="space-y-3">
      {/* Patient header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <p className="font-bold text-gray-800 text-base">
                {patient.first_name} {patient.last_name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {patient.uid && <span>ID · {patient.uid}</span>}
                {dobFormatted && <span> · DOB: {dobFormatted}</span>}
                {patient.gender && patient.gender !== "UNKNOWN" && (
                  <span> · {patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase()}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full border border-green-200 text-green-700 font-medium">
              ✓ Active patient
            </span>
            {summary.consultation_active && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-blue-200 text-blue-700 font-medium">
                ⏱ Consultation active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Consent banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <LucideShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          You are viewing limited patient information. Full records from other
          providers require patient consent. Requests expire when this
          consultation ends.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total records", value: stats.total_records },
          {
            label: "Most recent",
            value: stats.most_recent ? timeAgo(stats.most_recent) : "—",
          },
          { label: "Active meds", value: stats.active_medications },
          { label: "Prior facilities", value: stats.prior_facilities },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"
          >
            <p className="text-lg font-bold text-gray-800">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Always visible */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Always visible
        </p>

        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <LucideShieldAlert size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Allergies</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {always_visible.allergies.length > 0
                  ? always_visible.allergies.join(" · ")
                  : "None recorded"}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full border border-green-200 text-green-700 shrink-0">
            Always shown
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <LucidePill size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Active medications
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {always_visible.active_medications_count > 0
                  ? `${always_visible.active_medications_count} active prescription${always_visible.active_medications_count > 1 ? "s" : ""} on record`
                  : "No active medications on record"}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full border border-green-200 text-green-700 shrink-0">
            Always shown
          </span>
        </div>
      </div>

      {/* Record categories */}
      {record_categories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Record categories — consent required
          </p>
          <div className="space-y-2">
            {record_categories.map((cat) => (
              <div
                key={cat.speciality + cat.facility_name}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <LucideFileText size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {cat.speciality}
                    </p>
                    <p className="text-xs text-gray-400">
                      {[
                        cat.facility_name,
                        cat.record_count > 0 ? `${cat.record_count} records` : null,
                        cat.last_record_at ? timeAgo(cat.last_record_at) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {cat.sensitivity === "ask_first" && (
                      <p className="text-xs text-gray-400 italic mt-0.5">
                        Patient has set this to <em>ask me first</em>
                      </p>
                    )}
                  </div>
                </div>
                {cat.access_status === "approved" ? (
                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium shrink-0">
                    <LucideShieldCheck size={12} /> Approved
                  </span>
                ) : cat.access_status === "pending" ? (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium shrink-0">
                    Pending…
                  </span>
                ) : cat.access_status === "denied" ? (
                  <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-medium shrink-0">
                    Denied
                  </span>
                ) : (
                  <button
                    onClick={() => handleRequest(cat.speciality)}
                    disabled={requesting === cat.speciality}
                    className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 shrink-0 font-medium"
                  >
                    <LucideLock size={11} />
                    {requesting === cat.speciality ? "Sending…" : "Request"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access granted */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Access granted this consultation
        </p>
        {access_granted.length === 0 ? (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <LucideLock size={12} />
            No records shared yet. Requests sent to patient appear here once
            approved.
          </p>
        ) : (
          <div className="space-y-2">
            {access_granted.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <LucideShieldCheck size={14} className="text-green-500 shrink-0" />
                <span className="font-medium">{g.requested_category}</span>
                <span className="text-xs text-gray-400">— access approved</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

