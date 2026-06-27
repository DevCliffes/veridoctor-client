"use client";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideFileText,
  LucidePill,
  LucideLoader2,
  LucideCalendar,
  LucideChevronDown,
  LucideChevronUp,
} from "@veridoctor/design/icons";

interface Drug {
  id: string;
  drug_name: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface Prescription {
  id: string;
  diagnosis: string;
  notes?: string;
  created_at: string;
  drugs: Drug[];
  provider?: {
    first_name: string;
    last_name: string;
    speciality?: string;
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getField(identity: unknown, field: string): string {
  if (identity && typeof identity === "object" && field in identity) {
    const val = (identity as Record<string, unknown>)[field];
    if (typeof val === "string") return val;
  }
  return "";
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={
        "fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium " +
        (type === "success" ? "bg-green-600" : "bg-red-600")
      }
    >
      {message}
    </div>
  );
}

function PrescriptionCard({ prescription }: { prescription: Prescription }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-blue-100 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
            <LucideFileText size={18} />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {prescription.diagnosis}
            </p>
            {prescription.provider && (
              <p className="text-xs text-gray-500 mt-0.5">
                Dr. {prescription.provider.first_name}{" "}
                {prescription.provider.last_name}
                {prescription.provider.speciality &&
                  " · " + prescription.provider.speciality}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <LucideCalendar size={11} />
              <span>{formatDate(prescription.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
            {prescription.drugs.length}{" "}
            {prescription.drugs.length === 1 ? "drug" : "drugs"}
          </span>
          {expanded ? (
            <LucideChevronUp size={16} className="text-gray-400" />
          ) : (
            <LucideChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50 space-y-3">
          <div className="space-y-2">
            {prescription.drugs.map((drug, i) => (
              <div
                key={drug.id ?? i}
                className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <LucidePill size={14} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {drug.drug_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {drug.frequency} · {drug.duration}
                  </p>
                  {drug.instructions && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">
                      {drug.instructions}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {prescription.notes && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-700 mb-1">
                Doctor&apos;s Notes
              </p>
              <p className="text-xs text-yellow-800">{prescription.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Prescriptions() {
  const { identity } = useAppSelector((store) => store.auth);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Use the same pattern as the working dashboard page
  const patientEmail = getField(identity, "email");

  useEffect(() => {
    if (!patientEmail) {
      if (identity !== null && identity !== undefined && identity !== "") {
        setLoading(false);
      }
      return;
    }
    axiosClient
      .get("/prescriptions?patient_email=" + patientEmail)
      .then((res) => setPrescriptions(res.data ?? []))
      .catch(() =>
        setToast({ message: "Failed to load prescriptions", type: "error" })
      )
      .finally(() => setLoading(false));
  }, [patientEmail, identity]);

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">My Prescriptions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View prescriptions issued by your doctors
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LucideLoader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12">
            <LucideFileText size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No prescriptions yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Prescriptions issued by your doctor will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
