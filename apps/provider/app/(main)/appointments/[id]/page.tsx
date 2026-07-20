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
  LucideChevronUp,
  LucideFileText,
  LucideHistory,
  LucideShieldAlert,
  LucideShieldCheck,
  LucidePill,
  LucideLock,
  LucideLoader2,
  LucideStethoscope,
  LucideShield,
  LucideActivity,
  LucideHeartPulse,
  LucideThermometer,
  LucideWeight,
  LucideRuler,
} from "@veridoctor/design/icons";

type InsuranceEntry = {
  id?: string;
  provider: string;
  policy_number?: string;
  principal_member?: string;
  scheme_name?: string;
};

type Insurance = string | InsuranceEntry;

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
  form_id?: string;
  form_name: string;
  created_at: string;
};

type OwnCapture = {
  form_name: string;
  form_snapshot: { title?: string; fields?: { id: string; label?: string; name?: string }[] }[];
  values: Record<string, unknown>;
  captured_at: string;
};

type OwnRecord = {
  id: string;
  date: string;
  provider_name: string;
  speciality: string;
  facility_name: string;
  service_name: string | null;
  appointment_type: string;
  status: string;
  captures: OwnCapture[];
  has_clinical_notes: boolean;
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

// ── Granted-record types (records unlocked via an approved consent request) ──
type GrantedCapture = {
  form_name: string;
  form_snapshot: unknown[];
  values: Record<string, unknown>;
  captured_at: string;
};

type GrantedDrug = {
  drug_name: string;
  dosage?: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

type GrantedRecord = {
  id: string;
  record_type: "consultation" | "prescription";
  date: string;
  provider_name: string;
  speciality: string;
  facility_name: string;
  // consultation-only
  appointment_type?: string;
  status?: string;
  service_name?: string | null;
  captures?: GrantedCapture[];
  has_clinical_notes?: boolean;
  // prescription-only
  diagnosis?: string;
  notes?: string;
  drugs?: GrantedDrug[];
};

type CategoryPanelStatus = "idle" | "loading" | "loaded" | "expired" | "error";

// ── Vitals — deliberately NOT consent-gated (policy decision: vitals are
// low-sensitivity enough not to require an access grant), so this reuses
// the exact same patient-facing /records/patient/<id>/vitals endpoint the
// health-portal dashboard uses, across ALL of the patient's providers.
type Vital = {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  recorded_at: string;
  provider_name: string | null;
};

const VITAL_ICONS: Record<string, typeof LucideActivity> = {
  blood_pressure: LucideActivity,
  pulse: LucideHeartPulse,
  temperature: LucideThermometer,
  weight: LucideWeight,
  height: LucideRuler,
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
    insurances?: Insurance[];
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
    insurances?: Insurance[];
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

const SNAPSHOT_KEY = "__form_snapshot__";

// Same 30-minute grace window the backend enforces in
// ProviderGrantedRecordsView (GRACE_PERIOD) — kept in sync here so the
// frontend can proactively hide expired-consultation sections instead of
// waiting for a failed fetch to discover it.
const CONSULTATION_GRACE_MS = 30 * 60 * 1000;
const TERMINAL_STATUSES = ["cancelled", "completed", "no-show"];

function isConsultationOver(appointment: Appointment | null): boolean {
  if (!appointment) return false;
  if (TERMINAL_STATUSES.includes(appointment.status)) return true;
  return Date.now() > new Date(appointment.end_time).getTime() + CONSULTATION_GRACE_MS;
}

function getInsuranceLabel(ins: Insurance): string {
  if (typeof ins === "string") return ins;
  return ins.provider;
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

function formatDOB(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function buildLabelMap(
  snapshot: { title?: string; fields?: { id: string; label?: string; name?: string }[] }[]
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(snapshot)) return map;
  for (const section of snapshot) {
    for (const field of section.fields ?? []) {
      if (field.id) map[field.id] = field.label ?? field.name ?? field.id;
    }
  }
  return map;
}

function isPrescriptionValue(val: unknown): val is { diagnosis?: string; drugs?: unknown[]; notes?: string } {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return "drugs" in obj || "diagnosis" in obj;
}

function renderValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val || "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map(renderValue).join(", ");
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.drug_name) return String(obj.drug_name);
    if (obj.label) return String(obj.label);
    return JSON.stringify(val);
  }
  return String(val);
}

function renderPrescription(val: { diagnosis?: string; drugs?: unknown[]; notes?: string }) {
  const drugs = (val.drugs ?? []) as { drug_name?: string; frequency?: string; duration?: string; instructions?: string }[];
  return (
    <div className="flex flex-col gap-2 mt-1">
      {val.diagnosis && (
        <p className="text-xs text-gray-600"><span className="text-gray-400">Diagnosis: </span>{val.diagnosis}</p>
      )}
      {drugs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {drugs.map((d, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-gray-800">{d.drug_name || "—"}</p>
              <p className="text-xs text-gray-500">{[d.frequency, d.duration].filter(Boolean).join(" · ")}</p>
              {d.instructions && <p className="text-xs text-gray-400 italic">{d.instructions}</p>}
            </div>
          ))}
        </div>
      )}
      {val.notes && (
        <p className="text-xs text-gray-600"><span className="text-gray-400">Notes: </span>{val.notes}</p>
      )}
    </div>
  );
}

function buildTelehealthUrl(meetId: string, userId: string | null) {
  const base = "https://telehealth.veridoctor.com";
  const params = new URLSearchParams({ userId: userId ?? "provider", isOfferer: "true" });
  return `${base}/${meetId}?${params.toString()}`;
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
  const [patientInsurances, setPatientInsurances] = useState<Insurance[]>([]);
  const [submittedFormIds, setSubmittedFormIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !id) return;
    Promise.all([
      axiosClient.get(`provider/${userId}/appointments/${id}`),
      axiosClient.get(`provider/${userId}/forms`),
      axiosClient.get(`provider/${userId}/appointments/${id}/captures`),
    ])
      .then(([apptRes, formsRes, capturesRes]) => {
        setAppointment(apptRes.data);
        setForms(formsRes.data ?? []);
        if (formsRes.data?.length > 0) setSelectedFormId(formsRes.data[0].id);
        if (apptRes.data?.patient_identity) {
          axiosClient
            .get(`provider/${userId}/patients/${apptRes.data.patient_identity}`)
            .then((r) => setPatientInsurances(r.data?.insurances ?? []))
            .catch(() => {});
        }
        const captured = new Set<string>(
          (capturesRes.data ?? [])
            .map((c: Capture) => c.form_id)
            .filter(Boolean) as string[]
        );
        setSubmittedFormIds(captured);
      })
      .catch(() => toast.error("Could not load appointment"))
      .finally(() => setLoading(false));
  }, [userId, id]);

  const handleStartCapture = () => {
    if (!selectedFormId) { toast.error("Please select a form first"); return; }
    router.push(`/appointments/${id}/capture?form=${selectedFormId}`);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment || newStatus === appointment.status) return;
    if (!confirm(`Mark this appointment as "${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}"?`)) return;
    setUpdatingStatus(true);
    try {
      await axiosClient.patch(`provider/${userId}/appointments/${id}`, { status: newStatus });
      toast.success("Status updated");
      setAppointment((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      toast.error("Could not update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleJoinCall = () => {
    if (!appointment?.meet_id) return;
    window.location.href = buildTelehealthUrl(appointment.meet_id, String(userId ?? ""));
  };

  const draftKey = `vd_capture_${id}`;
  const selectedFormAlreadySubmitted = submittedFormIds.has(selectedFormId);
  const hasDraft = typeof window !== "undefined"
    && !!localStorage.getItem(draftKey)
    && !selectedFormAlreadySubmitted;

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse max-w-3xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-gray-500">Appointment not found.</p>
        <button onClick={() => router.push("/appointments")} className="mt-4 text-blue-600 text-sm hover:underline">← Back to appointments</button>
      </div>
    );
  }

  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const now = new Date();
  const isToday = startTime.toDateString() === now.toDateString();
  const isPast = endTime < now;
  const isFuture = startTime > now;
  const isTerminal = ["cancelled", "completed", "no-show"].includes(appointment.status);

  const CALL_WINDOW_MS = 30 * 60 * 1000;
  const isWithinCallWindow = (startIso: string, endIso: string) => {
    const nowMs = Date.now();
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    return nowMs >= start - CALL_WINDOW_MS && nowMs <= end + CALL_WINDOW_MS;
  };
  const callHasEnded =
    isTerminal || Date.now() > endTime.getTime() + CALL_WINDOW_MS;
  const callNotYetOpen =
    !isTerminal && Date.now() < startTime.getTime() - CALL_WINDOW_MS;
  const canJoinCall =
    !isTerminal &&
    appointment.appointment_type === "virtual" &&
    !!appointment.meet_id &&
    isWithinCallWindow(appointment.start_time, appointment.end_time);

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <button onClick={() => router.push("/appointments")} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Back to appointments
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
              {appointment.patient_first_name?.[0]}{appointment.patient_last_name?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{appointment.patient_first_name} {appointment.patient_last_name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_STYLES[appointment.status] ?? "bg-gray-100 text-gray-600"}`}>
                {appointment.status}
              </span>
              {patientInsurances.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <LucideShield size={11} className="text-blue-500 shrink-0" />
                  {patientInsurances.map((ins, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                      {getInsuranceLabel(ins)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {hasDraft && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                📝 Draft saved — click to resume
              </span>
            )}
            {selectedFormAlreadySubmitted && (
              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                ✓ Form already submitted
              </span>
            )}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative">
                <select
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                >
                  {forms.length === 0
                    ? <option value="">No forms available</option>
                    : forms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}{submittedFormIds.has(f.id) ? " ✓" : ""}
                        </option>
                      ))
                  }
                </select>
                <LucideChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={handleStartCapture}
                disabled={forms.length === 0 || selectedFormAlreadySubmitted}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <LucideClipboardPen size={15} />
                {selectedFormAlreadySubmitted
                  ? "Already submitted"
                  : hasDraft
                  ? "Resume Capture"
                  : "Start Capture"}
              </button>
            </div>
            {forms.length === 0 && (
              <button onClick={() => router.push("/forms/new")} className="text-xs text-blue-600 hover:underline">
                Create a form first →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === "details" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === "records" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
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
                    {startTime.toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
                {appointment.appointment_type === "virtual"
                  ? <LucideVideo size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  : <LucideMapPin size={16} className="text-green-500 mt-0.5 shrink-0" />
                }
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Type</p>
                  <p className="text-sm text-gray-700 font-medium capitalize">{appointment.appointment_type}</p>
                </div>
              </div>
              {appointment.appointment_type === "virtual" && appointment.meet_id && (
                <div className="flex items-start gap-3">
                  <LucideVideo size={16} className={canJoinCall ? "text-indigo-500 mt-0.5 shrink-0" : "text-gray-300 mt-0.5 shrink-0"} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Call</p>
                    {canJoinCall ? (
                      <button onClick={handleJoinCall} className="text-sm text-blue-600 hover:underline font-medium">Join video call →</button>
                    ) : callHasEnded ? (
                      <p className="text-sm text-gray-400 font-medium">Call has ended</p>
                    ) : callNotYetOpen ? (
                      <p className="text-sm text-gray-400 font-medium">Available 30 min before start</p>
                    ) : (
                      <p className="text-sm text-gray-400 font-medium">Call unavailable</p>
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
                {STATUS_OPTIONS.filter((s) => s.value !== appointment.status && s.value !== "scheduled" && s.value !== "confirmed").map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    disabled={updatingStatus}
                    className={`text-sm px-4 py-2 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                      s.value === "completed" ? "border-green-200 text-green-700 hover:bg-green-50"
                      : s.value === "no-show" ? "border-orange-200 text-orange-700 hover:bg-orange-50"
                      : s.value === "rescheduled" ? "border-purple-200 text-purple-700 hover:bg-purple-50"
                      : s.value === "cancelled" ? "border-red-200 text-red-600 hover:bg-red-50"
                      : s.value === "in-progress" ? "border-blue-200 text-blue-700 hover:bg-blue-50"
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
        <PatientRecordPanel appointmentId={id} userId={String(userId ?? "")} appointment={appointment} />
      )}
    </div>
  );
}

function PastCaptures({ appointmentId, userId, router }: { appointmentId: string; userId: string | null; router: ReturnType<typeof useRouter> }) {
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
          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-3">
              <LucideFileText size={15} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">{c.form_name}</p>
                <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString("en-KE")}</p>
              </div>
            </div>
            <button onClick={() => router.push(`/appointments/${appointmentId}/capture/${c.id}`)} className="text-xs text-blue-600 hover:underline">View →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnRecordCard({ record }: { record: OwnRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded((e) => !e)} className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors">
        <div className="flex gap-3 items-start flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <LucideStethoscope size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">{record.service_name ?? "Consultation"}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium capitalize">{record.appointment_type}</span>
              {record.has_clinical_notes && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                  {record.captures?.length} capture{(record.captures?.length ?? 0) > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(record.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              <span className={`font-medium ${record.status === "completed" ? "text-gray-500" : record.status === "in-progress" ? "text-blue-600" : "text-gray-400"}`}>
                {record.status}
              </span>
            </p>
          </div>
        </div>
        {record.has_clinical_notes && (expanded ? <LucideChevronUp size={15} className="text-gray-400 shrink-0 mt-1" /> : <LucideChevronDown size={15} className="text-gray-400 shrink-0 mt-1" />)}
      </button>

      {expanded && record.captures && record.captures.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-5">
          {record.captures.map((cap, i) => {
            const smuggled = cap.values?.[SNAPSHOT_KEY];
            const snapshot = (Array.isArray(smuggled) ? smuggled : null) ?? cap.form_snapshot ?? [];
            const labelMap = buildLabelMap(snapshot);
            const displayValues = Object.fromEntries(
              Object.entries(cap.values ?? {}).filter(([k]) => k !== SNAPSHOT_KEY)
            );

            return (
              <div key={i}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {cap.form_name || "Clinical Notes"}
                </p>
                <div className="space-y-2">
                  {Object.entries(displayValues).map(([key, val]) => {
                    const label = labelMap[key] ?? key.replace(/_/g, " ");
                    if (isPrescriptionValue(val)) {
                      return (
                        <div key={key} className="flex flex-col gap-1 text-sm">
                          <span className="text-gray-400 capitalize font-medium">{label}</span>
                          {renderPrescription(val)}
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="flex gap-2 text-sm">
                        <span className="text-gray-400 shrink-0 min-w-[140px] capitalize">{label}</span>
                        <span className="text-gray-800 font-medium">{renderValue(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Renders one record fetched from an approved consent grant. Records
// arrive already flattened (no nested form_snapshot label-mapping needed
// beyond what the consultation capture itself carries), so this stays a
// single-level card — no further expand/collapse inside it, since it's
// already living inside the category's expand panel.
function GrantedRecordEntry({ record }: { record: GrantedRecord }) {
  if (record.record_type === "prescription") {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-gray-700">Prescription</p>
          <span className="text-xs text-gray-400">
            {new Date(record.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-2">{record.provider_name}</p>
        {renderPrescription({ diagnosis: record.diagnosis, drugs: record.drugs, notes: record.notes })}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <p className="text-xs font-semibold text-gray-700">{record.service_name ?? "Consultation"}</p>
        {record.appointment_type && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium capitalize">
            {record.appointment_type}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2">
        {record.provider_name} · {new Date(record.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
      </p>
      {record.captures && record.captures.length > 0 ? (
        <div className="space-y-3 mt-2">
          {record.captures.map((cap, i) => {
            const smuggled = cap.values?.[SNAPSHOT_KEY];
            const snapshot = (Array.isArray(smuggled) ? smuggled : null) ?? cap.form_snapshot ?? [];
            const labelMap = buildLabelMap(snapshot as { title?: string; fields?: { id: string; label?: string; name?: string }[] }[]);
            const displayValues = Object.fromEntries(
              Object.entries(cap.values ?? {}).filter(([k]) => k !== SNAPSHOT_KEY)
            );
            return (
              <div key={i}>
                <p className="text-xs font-medium text-gray-500 mb-1.5">{cap.form_name || "Clinical notes"}</p>
                <div className="space-y-1.5">
                  {Object.entries(displayValues).map(([key, val]) => {
                    const label = labelMap[key] ?? key.replace(/_/g, " ");
                    if (isPrescriptionValue(val)) {
                      return (
                        <div key={key} className="flex flex-col gap-1 text-xs">
                          <span className="text-gray-400 capitalize font-medium">{label}</span>
                          {renderPrescription(val)}
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="flex gap-2 text-xs">
                        <span className="text-gray-400 shrink-0 min-w-[110px] capitalize">{label}</span>
                        <span className="text-gray-700 font-medium">{renderValue(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-300 italic">No clinical notes on this consultation.</p>
      )}
    </div>
  );
}

function InsuranceCard({ ins }: { ins: Insurance }) {
  if (typeof ins === "string") {
    return (
      <div className="bg-white rounded-lg border border-blue-100 px-3 py-2">
        <p className="text-xs font-semibold text-gray-800">{ins}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-blue-100 px-3 py-2">
      <p className="text-xs font-semibold text-gray-800">{ins.provider}</p>
      <div className="mt-1 space-y-0.5">
        {ins.policy_number && (
          <p className="text-xs text-gray-500">Policy: <span className="font-medium text-gray-700">{ins.policy_number}</span></p>
        )}
        {ins.principal_member && (
          <p className="text-xs text-gray-500">Principal: <span className="font-medium text-gray-700">{ins.principal_member}</span></p>
        )}
        {ins.scheme_name && (
          <p className="text-xs text-gray-500">Scheme: <span className="font-medium text-gray-700">{ins.scheme_name}</span></p>
        )}
      </div>
    </div>
  );
}

function VitalsCard({ patientIdentityId }: { patientIdentityId: string }) {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loadingVitals, setLoadingVitals] = useState(true);

  useEffect(() => {
    if (!patientIdentityId) { setLoadingVitals(false); return; }
    axiosClient
      .get(`/records/patient/${patientIdentityId}/vitals`)
      .then((res) => setVitals(res.data?.vitals ?? []))
      .catch(() => {})
      .finally(() => setLoadingVitals(false));
  }, [patientIdentityId]);

  if (loadingVitals) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex justify-center py-6">
        <LucideLoader2 size={18} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (vitals.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Recent Vitals</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {vitals.map((v) => {
          const Icon = VITAL_ICONS[v.key] ?? LucideActivity;
          return (
            <div key={v.key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className="text-blue-500 shrink-0" />
                <p className="text-xs text-gray-400">{v.label}</p>
              </div>
              <p className="text-base font-bold text-gray-800">
                {v.value}
                {v.unit && <span className="text-xs font-normal text-gray-400 ml-1">{v.unit}</span>}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {timeAgo(v.recorded_at)}
                {v.provider_name && <span> · {v.provider_name}</span>}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatientRecordPanel({
  appointmentId,
  userId,
  appointment,
}: {
  appointmentId: string;
  userId: string;
  appointment: Appointment;
}) {
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [ownRecords, setOwnRecords] = useState<OwnRecord[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOwn, setLoadingOwn] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  // ── Granted-category expand state, keyed by category (speciality) name ──
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<Record<string, CategoryPanelStatus>>({});
  const [categoryRecords, setCategoryRecords] = useState<Record<string, GrantedRecord[]>>({});
  const [categoryErrorMsg, setCategoryErrorMsg] = useState<Record<string, string>>({});

  // Once the consultation itself is over (terminal status, or past the
  // same 30-min grace window the backend enforces), consent-gated access
  // is no longer meaningful for THIS consultation — hide those sections
  // entirely rather than show a stale "Approved" badge that would just
  // fail on click anyway.
  const consultationOver = isConsultationOver(appointment);

  const fetchSummary = () => {
    axiosClient
      .get(`/records/appointment/${appointmentId}/patient-summary`)
      .then((res) => setSummary(res.data))
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  };

  const fetchOwnRecords = () => {
    if (!summary?.patient?.identity_id || !userId) return;
    axiosClient
      .get(`/records/provider/${userId}/patient/${summary.patient.identity_id}/timeline?type=consultation`)
      .then((res) => setOwnRecords(res.data.records ?? []))
      .catch(() => {})
      .finally(() => setLoadingOwn(false));
  };

  useEffect(() => { fetchSummary(); }, [appointmentId]);
  useEffect(() => {
    if (summary?.patient?.identity_id) fetchOwnRecords();
    else if (!loadingSummary) setLoadingOwn(false);
  }, [summary?.patient?.identity_id, loadingSummary]);

  const handleRequest = async (category: string) => {
    setRequesting(category);
    try {
      await axiosClient.post("/records/access-request", {
        appointment_id: appointmentId,
        requested_category: category,
        provider_identity_id: userId,
      });
      toast.success(`Access request sent for ${category}`);
      fetchSummary();
    } catch {
      toast.error("Could not send access request");
    } finally {
      setRequesting(null);
    }
  };

  const fetchGrantedRecords = (category: string) => {
    setCategoryStatus((prev) => ({ ...prev, [category]: "loading" }));
    axiosClient
      .get(`/records/provider/${userId}/appointment/${appointmentId}/granted-records/${encodeURIComponent(category)}`)
      .then((res) => {
        setCategoryRecords((prev) => ({ ...prev, [category]: res.data.records ?? [] }));
        setCategoryStatus((prev) => ({ ...prev, [category]: "loaded" }));
      })
      .catch((err) => {
        const message: string = err?.response?.data?.error ?? "";
        if (err?.response?.status === 403 && message.toLowerCase().includes("expired")) {
          setCategoryStatus((prev) => ({ ...prev, [category]: "expired" }));
        } else {
          setCategoryStatus((prev) => ({ ...prev, [category]: "error" }));
          setCategoryErrorMsg((prev) => ({ ...prev, [category]: message || "Could not load records" }));
          toast.error("Could not load records for this category");
        }
      });
  };

  const handleToggleCategory = (cat: RecordCategory) => {
    if (cat.access_status !== "approved") return;

    if (expandedCategory === cat.speciality) {
      setExpandedCategory(null);
      return;
    }

    setExpandedCategory(cat.speciality);
    const status = categoryStatus[cat.speciality];
    // Only fetch on first open, or if a prior attempt errored — an
    // already-loaded or already-expired category doesn't need refetching,
    // since expiry is a one-way transition for a consultation that's over.
    if (!status || status === "error") {
      fetchGrantedRecords(cat.speciality);
    }
  };

  if (loadingSummary) {
    return <div className="flex items-center justify-center py-16"><LucideLoader2 size={24} className="animate-spin text-blue-400" /></div>;
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <LucideHistory size={28} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No patient identity linked to this appointment.</p>
      </div>
    );
  }

  const { patient, stats, always_visible, record_categories, access_granted } = summary;
  const patientInsurances: Insurance[] = always_visible.insurances ?? patient.insurances ?? [];
  const dobFormatted = patient.date_of_birth ? formatDOB(patient.date_of_birth) : null;

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <LucideShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          You are viewing limited patient information. Full records from other providers require patient consent.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <p className="font-bold text-gray-800 text-base">{patient.first_name} {patient.last_name}</p>
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
            <span className="text-xs px-2.5 py-1 rounded-full border border-green-200 text-green-700 font-medium">✓ Active patient</span>
            {summary.consultation_active && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-blue-200 text-blue-700 font-medium">⏱ Consultation active</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total records", value: stats.total_records },
          { label: "Most recent", value: stats.most_recent ? timeAgo(stats.most_recent) : "—" },
          { label: "Active meds", value: stats.active_medications },
          { label: "Prior facilities", value: stats.prior_facilities },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-lg font-bold text-gray-800">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Always visible</p>
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <LucideShieldAlert size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Allergies</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {always_visible.allergies.length > 0 ? always_visible.allergies.join(" · ") : "None recorded"}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full border border-green-200 text-green-700 shrink-0">Always shown</span>
        </div>

        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <LucidePill size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Active medications</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {always_visible.active_medications_count > 0
                  ? `${always_visible.active_medications_count} active prescription${always_visible.active_medications_count > 1 ? "s" : ""} on record`
                  : "No active medications on record"}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full border border-green-200 text-green-700 shrink-0">Always shown</span>
        </div>

        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <LucideShield size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Patient Insurance</p>
              {patientInsurances.length === 0 ? (
                <p className="text-xs text-gray-500 mt-0.5">No insurance on record</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {patientInsurances.map((ins, i) => (
                    <InsuranceCard key={i} ins={ins} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full border border-green-200 text-green-700 shrink-0">Always shown</span>
        </div>
      </div>

      <VitalsCard patientIdentityId={patient.identity_id} />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your records for this patient</p>
          <span className="text-xs px-2 py-0.5 rounded-full border border-blue-200 text-blue-700 font-medium">No consent needed</span>
        </div>
        {loadingOwn
          ? <div className="flex justify-center py-4"><LucideLoader2 size={18} className="animate-spin text-blue-400" /></div>
          : ownRecords.length === 0
          ? <p className="text-xs text-gray-400 py-2">No previous consultations on record for this patient.</p>
          : (
            <>
              <div className="overflow-y-auto max-h-[1056px] min-h-[300px] space-y-2 pr-1">
                {ownRecords.map((rec) => <OwnRecordCard key={rec.id} record={rec} />)}
              </div>
              {ownRecords.length > 4 && <p className="text-xs text-gray-400 text-center mt-2">Scroll to see all {ownRecords.length} records</p>}
            </>
          )
        }
      </div>

      {/* Both of these sections are consultation-scoped by design (grants
          are tied to a specific appointment) — once the consultation is
          over, there's nothing meaningful left for the provider to act on
          here, so hide them entirely rather than show a stale, no-longer-
          actionable "Approved" state. */}
      {!consultationOver && record_categories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Record categories — consent required</p>
          <div className="space-y-2">
            {record_categories.map((cat) => {
              const isExpanded = expandedCategory === cat.speciality;
              const panelStatus = categoryStatus[cat.speciality] ?? "idle";
              const isExpired = panelStatus === "expired";
              const records = categoryRecords[cat.speciality] ?? [];

              return (
                <div key={cat.speciality + cat.facility_name} className="rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <LucideFileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{cat.speciality}</p>
                        <p className="text-xs text-gray-400">
                          {[cat.facility_name, cat.record_count > 0 ? `${cat.record_count} records` : null, cat.last_record_at ? timeAgo(cat.last_record_at) : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>

                    {cat.access_status === "approved" ? (
                      <button
                        onClick={() => handleToggleCategory(cat)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium shrink-0 border transition-colors ${
                          isExpired
                            ? "text-gray-500 bg-gray-100 border-gray-200 hover:bg-gray-200"
                            : "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                        }`}
                      >
                        {isExpired ? <LucideLock size={12} /> : <LucideShieldCheck size={12} />}
                        {isExpired ? "Expired" : "Approved"}
                        {isExpanded ? <LucideChevronUp size={12} /> : <LucideChevronDown size={12} />}
                      </button>
                    ) : cat.access_status === "pending" ? (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium shrink-0">Pending…</span>
                    ) : cat.access_status === "denied" ? (
                      <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-medium shrink-0">Denied</span>
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

                  {isExpanded && cat.access_status === "approved" && (
                    <div className="border-t border-gray-100 bg-white px-3 py-3 space-y-2">
                      {panelStatus === "loading" && (
                        <div className="flex justify-center py-3">
                          <LucideLoader2 size={16} className="animate-spin text-blue-400" />
                        </div>
                      )}
                      {panelStatus === "expired" && (
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 py-1">
                          <LucideLock size={12} /> Access window for this consultation has closed.
                        </p>
                      )}
                      {panelStatus === "error" && (
                        <p className="text-xs text-red-500 py-1">{categoryErrorMsg[cat.speciality] ?? "Could not load records."}</p>
                      )}
                      {panelStatus === "loaded" && records.length === 0 && (
                        <p className="text-xs text-gray-400 py-1">No records found for this category.</p>
                      )}
                      {panelStatus === "loaded" && records.length > 0 && (
                        <div className="space-y-2">
                          {records.map((rec) => <GrantedRecordEntry key={rec.id} record={rec} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!consultationOver && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Access granted this consultation</p>
          {access_granted.length === 0
            ? <p className="text-xs text-gray-400 flex items-center gap-1.5"><LucideLock size={12} /> No records shared yet.</p>
            : (
              <div className="space-y-2">
                {access_granted.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <LucideShieldCheck size={14} className="text-green-500 shrink-0" />
                    <span className="font-medium">{g.requested_category}</span>
                    <span className="text-xs text-gray-400">— access approved</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
