"use client";
import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient, recordsPinApi } from "@veridoctor/api-client";
import { useRecordsUnlock } from "../../useRecordsUnlock";
import RecordsPinGate from "../../../components/RecordsPinGate";
import {
  LucideActivitySquare,
  LucideLoader2,
  LucideChevronDown,
  LucideChevronUp,
  LucideMapPin,
  LucideVideo,
  LucideFileText,
  LucideShieldAlert,
  LucideShieldCheck,
  LucideBell,
  LucidePill,
  LucideEye,
  LucideEyeOff,
  LucideShield,
} from "@veridoctor/design/icons";

// Shared key used across capture/page.tsx, the provider capture view, and the
// appointment detail page to smuggle the form snapshot inside `values`
// (the backend strips a top-level `form_snapshot` field).
const SNAPSHOT_KEY = "__form_snapshot__";

interface Drug {
  id?: string;
  drug_name: string;
  dosage?: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionValue {
  diagnosis?: string;
  notes?: string;
  drugs?: Drug[];
}

interface FormField {
  id: string;
  label?: string;
  name?: string;
}

interface FormSection {
  title?: string;
  fields?: FormField[];
}

interface Capture {
  form_name: string;
  form_snapshot: FormSection[];
  values: Record<string, unknown>;
  captured_at: string;
}

type Sensitivity = "always_visible" | "ask_first" | "never";

interface HealthRecord {
  id: string;
  fhir_resource_type: string;
  record_type: "consultation" | "prescription";
  date: string;
  provider_name: string;
  speciality: string;
  facility_name: string;
  county: string;
  appointment_type?: string;
  status?: string;
  service_name?: string;
  captures?: Capture[];
  has_clinical_notes?: boolean;
  diagnosis?: string;
  notes?: string;
  drugs?: Drug[];
  sensitivity?: Sensitivity | null;
  summary_id?: string | null;
}

interface AccessRequest {
  id: string;
  requested_category: string;
  status: "pending" | "approved" | "denied";
  provider_name: string;
  provider_speciality: string;
  facility_name: string;
  appointment_date: string;
  created_at: string;
  responded_at: string | null;
}

const TYPE_TABS = [
  { key: "", label: "All Records" },
  { key: "consultation", label: "Consultations" },
  { key: "prescription", label: "Prescriptions" },
];

const SENSITIVITY_CONFIG: Record<Sensitivity, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  always_visible: {
    label: "Visible to all doctors",
    description: "Any treating doctor can see these records without asking.",
    color: "text-green-700 bg-green-50 border-green-200",
    icon: <LucideEye size={13} />,
  },
  ask_first: {
    label: "Ask me first",
    description: "Doctors must request access and you approve or deny.",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <LucideShield size={13} />,
  },
  never: {
    label: "Private — never share",
    description: "These records are never visible to other doctors.",
    color: "text-red-700 bg-red-50 border-red-200",
    icon: <LucideEyeOff size={13} />,
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildLabelMap(snapshot: FormSection[]): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(snapshot)) return map;
  for (const section of snapshot) {
    for (const field of section.fields ?? []) {
      if (field.id) map[field.id] = field.label ?? field.name ?? field.id;
    }
  }
  return map;
}

function isPrescriptionValue(val: unknown): val is PrescriptionValue {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  return "drugs" in obj || "diagnosis" in obj;
}

function parsePrescription(val: unknown): PrescriptionValue | null {
  if (isPrescriptionValue(val)) return val as PrescriptionValue;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (isPrescriptionValue(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function InlinePrescription({ value }: { value: PrescriptionValue }) {
  return (
    <div className="mt-1 space-y-2">
      {value.diagnosis && (
        <p className="text-xs text-gray-600">
          <span className="font-medium text-gray-700">Diagnosis: </span>
          {value.diagnosis}
        </p>
      )}
      {value.drugs && value.drugs.length > 0 && (
        <div className="space-y-2">
          {value.drugs.map((drug, i) => (
            <div key={drug.id ?? i} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                <LucidePill size={13} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{drug.drug_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[drug.dosage, drug.frequency, drug.duration].filter(Boolean).join(" · ")}
                </p>
                {drug.instructions && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">{drug.instructions}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {value.notes && (
        <p className="text-xs text-gray-500 italic">
          <span className="font-medium not-italic text-gray-600">Notes: </span>
          {value.notes}
        </p>
      )}
    </div>
  );
}

function renderValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return val;
  const prescription = parsePrescription(val);
  if (prescription) return <InlinePrescription value={prescription} />;
  if (Array.isArray(val)) return val.map(renderValue).join(", ");
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (obj.drug_name) return renderValue(obj.drug_name);
    if (obj.name) return String(obj.name);
    if (obj.label) return String(obj.label);
    return JSON.stringify(val);
  }
  return String(val);
}

function SensitivityToggle({
  summaryId,
  current,
  onChange,
}: {
  summaryId: string;
  current: Sensitivity;
  onChange: (val: Sensitivity) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const config = SENSITIVITY_CONFIG[current];

  // Rough height of the fully-rendered menu (3 options + header). Used only
  // to decide up vs down — doesn't need to be exact, just in the right ballpark.
  const ESTIMATED_MENU_HEIGHT = 280;

  const handleToggleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Prefer opening downward (natural reading direction); only flip up
      // if there isn't enough room below but there is enough above.
      setDirection(
        spaceBelow < ESTIMATED_MENU_HEIGHT && spaceAbove > spaceBelow ? "up" : "down"
      );
    }
    setOpen((o) => !o);
  };

  const handleSelect = async (val: Sensitivity) => {
    if (val === current) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    try {
      await axiosClient.patch(`/records/sensitivity/${summaryId}`, { sensitivity: val });
      onChange(val);
    } catch {
      // silent — revert is implicit since onChange wasn't called
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); handleToggleOpen(); }}
        disabled={saving}
        className={
          "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors " +
          config.color +
          (saving ? " opacity-60" : "")
        }
      >
        {saving ? <LucideLoader2 size={11} className="animate-spin" /> : config.icon}
        {config.label}
        <LucideChevronDown size={11} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={
              "absolute right-0 z-20 bg-white rounded-xl border border-gray-200 shadow-lg w-64 overflow-hidden " +
              (direction === "up" ? "bottom-full mb-2" : "top-full mt-2")
            }
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pt-3 pb-1">
              Who can see these records?
            </p>
            {(Object.keys(SENSITIVITY_CONFIG) as Sensitivity[]).map((key) => {
              const cfg = SENSITIVITY_CONFIG[key];
              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  className={
                    "w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-gray-50 transition-colors " +
                    (key === current ? "bg-gray-50" : "")
                  }
                >
                  <span className={
                    "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border " +
                    cfg.color
                  }>
                    {cfg.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{cfg.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cfg.description}</p>
                  </div>
                  {key === current && (
                    <LucideShieldCheck size={14} className="text-blue-500 shrink-0 ml-auto mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function AccessRequestsPanel({ identityId }: { identityId: string }) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchRequests = () => {
    axiosClient
      .get(`/records/patient/${identityId}/access-requests`)
      .then((res) => setRequests(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!identityId) return;
    fetchRequests();
  }, [identityId]);

  const handleRespond = async (grantId: string, newStatus: "approved" | "denied") => {
    setResponding(grantId);
    try {
      await axiosClient.patch(`/records/access-grants/${grantId}`, { status: newStatus });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === grantId ? { ...r, status: newStatus, responded_at: new Date().toISOString() } : r
        )
      );
    } catch {
      // silent
    } finally {
      setResponding(null);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const past = requests.filter((r) => r.status !== "pending");

  if (loading || requests.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-3">
      <h2 className="font-semibold text-gray-800 flex items-center gap-2">
        <LucideBell size={16} className="text-amber-500" />
        Access Requests
        {pending.length > 0 && (
          <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-medium">
            {pending.length}
          </span>
        )}
      </h2>
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((req) => (
            <div key={req.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <LucideShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {req.provider_name} is requesting access to your{" "}
                    <span className="text-blue-700">{req.requested_category}</span> records
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {req.facility_name && `${req.facility_name} · `}
                    During consultation on {formatDate(req.appointment_date)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleRespond(req.id, "approved")}
                  disabled={responding === req.id}
                  className="flex-1 py-2 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <LucideShieldCheck size={12} />
                  {responding === req.id ? "Saving…" : "Approve"}
                </button>
                <button
                  onClick={() => handleRespond(req.id, "denied")}
                  disabled={responding === req.id}
                  className="flex-1 py-2 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Previous requests</p>
          {past.map((req) => (
            <div key={req.id} className="flex items-center justify-between text-xs text-gray-500 py-1.5 border-b border-gray-50 last:border-0">
              <span>{req.provider_name} · {req.requested_category}</span>
              <span className={req.status === "approved" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaptureBlock({ capture }: { capture: Capture }) {
  // ✅ Read snapshot from the smuggled key first (new captures), fall back
  // to the legacy top-level form_snapshot field for old captures.
  const smuggled = (capture.values as Record<string, unknown> | undefined)?.[SNAPSHOT_KEY];
  const snapshot = (Array.isArray(smuggled) ? smuggled : null) ?? capture.form_snapshot ?? [];
  const labelMap = buildLabelMap(snapshot);

  // ✅ Strip the smuggled key out of the values we actually render so it
  // never shows up as its own "Form Snapshot" row.
  const displayValues = Object.fromEntries(
    Object.entries(capture.values ?? {}).filter(([key]) => key !== SNAPSHOT_KEY)
  );

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {capture.form_name || "Clinical Notes"}
      </p>
      <div className="space-y-3">
        {Object.entries(displayValues).map(([key, val]) => {
          const label = labelMap[key] ?? key.replace(/_/g, " ");
          const rendered = renderValue(val);
          const isPrescription = parsePrescription(val) !== null;
          return (
            <div key={key} className={isPrescription ? "flex flex-col gap-1" : "flex gap-2 text-sm"}>
              <span className="text-gray-400 shrink-0 min-w-[140px] capitalize text-sm">{label}</span>
              {isPrescription ? rendered : <span className="text-gray-800 font-medium text-sm">{rendered}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConsultationCard({
  record,
  onSensitivityChange,
}: {
  record: HealthRecord;
  onSensitivityChange: (id: string, val: Sensitivity) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors rounded-t-2xl"
      >
        <div className="flex gap-3 items-start flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <LucideActivitySquare size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">
                {record.service_name ?? "Consultation"}
              </p>
              <span className={
                "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 " +
                (record.appointment_type === "virtual" ? "bg-indigo-50 text-indigo-700" : "bg-green-50 text-green-700")
              }>
                {record.appointment_type === "virtual"
                  ? <><LucideVideo size={11} /> Virtual</>
                  : <><LucideMapPin size={11} /> In-person</>
                }
              </span>
              {record.has_clinical_notes && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                  Clinical notes
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {record.provider_name}
              {record.speciality ? ` · ${record.speciality}` : ""}
            </p>
            {record.facility_name && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <LucideMapPin size={11} />
                {[record.facility_name, record.county].filter(Boolean).join(", ")}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatDate(record.date)}</p>
          </div>
        </div>
        {record.has_clinical_notes && (
          expanded
            ? <LucideChevronUp size={16} className="text-gray-400 shrink-0 mt-1" />
            : <LucideChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />
        )}
      </button>

      {/* Sensitivity toggle — always shown on consultation records that have a summary */}
      {record.summary_id && record.sensitivity && (
        <div
          className="px-5 pb-3 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-gray-400">Record visibility to other doctors</p>
          <SensitivityToggle
            summaryId={record.summary_id}
            current={record.sensitivity}
            onChange={(val) => onSensitivityChange(record.id, val)}
          />
        </div>
      )}

      {expanded && record.captures && record.captures.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-5 bg-gray-50 rounded-b-2xl">
          {record.captures.map((cap, i) => (
            <CaptureBlock key={i} capture={cap} />
          ))}
        </div>
      )}
    </div>
  );
}

function PrescriptionCard({ record }: { record: HealthRecord }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex gap-3 items-start flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
            <LucideFileText size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">Prescription</p>
              {record.drugs && record.drugs.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                  {record.drugs.length} medication{record.drugs.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {record.diagnosis && (
              <p className="text-xs text-gray-600 mt-0.5">{record.diagnosis}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">
              {record.provider_name}
              {record.speciality ? ` · ${record.speciality}` : ""}
            </p>
            {record.facility_name && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <LucideMapPin size={11} />
                {[record.facility_name, record.county].filter(Boolean).join(", ")}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatDate(record.date)}</p>
          </div>
        </div>
        {expanded
          ? <LucideChevronUp size={16} className="text-gray-400 shrink-0 mt-1" />
          : <LucideChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />
        }
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
          {record.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Doctor's Notes</p>
              <p className="text-sm text-gray-700">{record.notes}</p>
            </div>
          )}
          {record.drugs && record.drugs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Medications</p>
              <div className="space-y-2">
                {record.drugs.map((drug, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                      <LucidePill size={13} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{drug.drug_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[drug.dosage, drug.frequency, drug.duration].filter(Boolean).join(" · ")}
                      </p>
                      {drug.instructions && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">{drug.instructions}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecordsContent({ identityId }: { identityId: string }) {
  const { getUnlockToken, lock } = useRecordsUnlock();

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("");

  useEffect(() => {
    if (!identityId) return;
    const token = getUnlockToken();
    if (!token) return;

    setLoading(true);
    const params = activeType ? { type: activeType } : undefined;

    recordsPinApi
      .getTimeline(identityId, token, params)
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          // Unlock token expired/invalid mid-session — re-prompt via the gate.
          lock();
          return;
        }
        setRecords(res.data.records ?? []);
        setTotal(res.data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [identityId, activeType, getUnlockToken, lock]);

  // Update sensitivity locally after a successful PATCH so the UI
  // reflects the change without a full refetch.
  const handleSensitivityChange = (recordId: string, val: Sensitivity) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, sensitivity: val } : r))
    );
  };

  const consultationCount = records.filter((r) => r.record_type === "consultation").length;
  const prescriptionCount = records.filter((r) => r.record_type === "prescription").length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {identityId && <AccessRequestsPanel identityId={identityId} />}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <LucideActivitySquare size={20} className="text-blue-600" />
          Health Records
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your complete medical history across all providers
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{total}</p>
            <p className="text-xs text-blue-600 mt-0.5">Total records</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{consultationCount}</p>
            <p className="text-xs text-purple-600 mt-0.5">Consultations</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{prescriptionCount}</p>
            <p className="text-xs text-green-600 mt-0.5">Prescriptions</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveType(tab.key)}
            className={
              "text-xs px-4 py-2 rounded-full border font-medium transition-colors " +
              (activeType === tab.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LucideLoader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <LucideFileText size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No records found.</p>
          <p className="text-gray-300 text-xs mt-1">
            Records appear here after a consultation or prescription is added by a provider.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) =>
            record.record_type === "consultation" ? (
              <ConsultationCard
                key={record.id}
                record={record}
                onSensitivityChange={handleSensitivityChange}
              />
            ) : (
              <PrescriptionCard key={record.id} record={record} />
            )
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-300 pb-4">
        Records are secured under GDPR and Kenya Digital Health Act 2023.
        Only you and your treating providers can access your clinical data.
      </p>
    </div>
  );
}

export default function RecordsPage() {
  const { identity } = useAppSelector((store) => store.auth);
  const identityId = typeof identity === "string" ? identity : "";

  return (
    <RecordsPinGate>
      <RecordsContent identityId={identityId} />
    </RecordsPinGate>
  );
}
