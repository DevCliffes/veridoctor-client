"use client";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideActivitySquare,
  LucideLoader2,
  LucideChevronDown,
  LucideChevronUp,
  LucideMapPin,
  LucideVideo,
  LucideFileText,
  LucideFlask,
} from "@veridoctor/design/icons";

interface Drug {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Capture {
  form_name: string;
  values: Record<string, unknown>;
  captured_at: string;
}

interface HealthRecord {
  id: string;
  fhir_resource_type: string;
  record_type: "consultation" | "prescription";
  date: string;
  provider_name: string;
  speciality: string;
  facility_name: string;
  county: string;
  // consultation
  appointment_type?: string;
  status?: string;
  service_name?: string;
  captures?: Capture[];
  has_clinical_notes?: boolean;
  // prescription
  diagnosis?: string;
  notes?: string;
  drugs?: Drug[];
}

const TYPE_TABS = [
  { key: "", label: "All Records" },
  { key: "consultation", label: "Consultations" },
  { key: "prescription", label: "Prescriptions" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ConsultationCard({ record }: { record: HealthRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
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
              <span
                className={
                  "text-xs px-2 py-0.5 rounded-full font-medium " +
                  (record.appointment_type === "virtual"
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-green-50 text-green-700")
                }
              >
                {record.appointment_type === "virtual" ? (
                  <span className="flex items-center gap-1">
                    <LucideVideo size={11} /> Virtual
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <LucideMapPin size={11} /> In-person
                  </span>
                )}
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
                {[record.facility_name, record.county]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatDate(record.date)}</p>
          </div>
        </div>
        {record.has_clinical_notes && (
          expanded ? <LucideChevronUp size={16} className="text-gray-400 shrink-0 mt-1" />
                   : <LucideChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />
        )}
      </button>

      {expanded && record.captures && record.captures.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">
          {record.captures.map((cap, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {cap.form_name || "Clinical Notes"}
              </p>
              <div className="space-y-2">
                {Object.entries(cap.values).map(([key, val]) => (
                  <div key={key} className="text-sm">
                    <span className="text-gray-500 capitalize">
                      {key.replace(/_/g, " ")}:{" "}
                    </span>
                    <span className="text-gray-800 font-medium">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
              <p className="text-sm font-semibold text-gray-800">
                Prescription
              </p>
              {record.drugs && record.drugs.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                  {record.drugs.length} medication{record.drugs.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {record.diagnosis && (
              <p className="text-xs text-gray-600 mt-0.5">
                {record.diagnosis}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">
              {record.provider_name}
              {record.speciality ? ` · ${record.speciality}` : ""}
            </p>
            {record.facility_name && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <LucideMapPin size={11} />
                {[record.facility_name, record.county]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatDate(record.date)}</p>
          </div>
        </div>
        {expanded ? (
          <LucideChevronUp size={16} className="text-gray-400 shrink-0 mt-1" />
        ) : (
          <LucideChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
          {record.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Doctor's Notes
              </p>
              <p className="text-sm text-gray-700">{record.notes}</p>
            </div>
          )}
          {record.drugs && record.drugs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Medications
              </p>
              <div className="space-y-2">
                {record.drugs.map((drug, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-100 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-gray-800">
                      {drug.drug_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[drug.dosage, drug.frequency, drug.duration]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {drug.instructions && (
                      <p className="text-xs text-gray-400 mt-1">
                        {drug.instructions}
                      </p>
                    )}
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

export default function RecordsPage() {
  const { identity } = useAppSelector((store) => store.auth);
  const identityId = typeof identity === "string" ? identity : "";

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("");

  useEffect(() => {
    if (!identityId) return;
    setLoading(true);
    const params = activeType ? `?type=${activeType}` : "";
    axiosClient
      .get(`/records/patient/${identityId}/timeline${params}`)
      .then((res) => {
        setRecords(res.data.records ?? []);
        setTotal(res.data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [identityId, activeType]);

  const consultationCount = records.filter(
    (r) => r.record_type === "consultation"
  ).length;
  const prescriptionCount = records.filter(
    (r) => r.record_type === "prescription"
  ).length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
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
            <p className="text-2xl font-bold text-purple-700">
              {consultationCount}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">Consultations</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">
              {prescriptionCount}
            </p>
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
          <LucideFlask size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No records found.</p>
          <p className="text-gray-300 text-xs mt-1">
            Records appear here after a consultation or prescription is added by
            a provider.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) =>
            record.record_type === "consultation" ? (
              <ConsultationCard key={record.id} record={record} />
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
