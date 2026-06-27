"use client";
import { useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useRouter } from "next/navigation";
import {
  LucideFileText,
  LucidePlus,
  LucideChevronDown,
  LucideChevronUp,
  LucideTrash2,
  LucidePill,
  LucideUser,
  LucideMail,
} from "@veridoctor/design/icons";
import { toast } from "sonner";

type Drug = {
  id: string;
  drug_name: string;
  dosage?: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

type Prescription = {
  id: string;
  patient_name: string;
  patient_email: string;
  diagnosis: string;
  notes: string;
  created_at: string;
  drugs: Drug[];
};

export default function Prescriptions() {
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(`provider/${userId}/prescriptions`)
      .then((res) => setPrescriptions(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this prescription? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await axiosClient.delete(`provider/${userId}/prescriptions/${id}`);
      setPrescriptions((prev) => prev.filter((rx) => rx.id !== id));
      if (expanded === id) setExpanded(null);
      toast.success("Prescription deleted");
    } catch {
      toast.error("Failed to delete prescription");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 mx-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Prescriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""} written
          </p>
        </div>
        <button
          onClick={() => router.push("/forms/prescription")}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          <LucidePlus size={16} /> New prescription
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12">
            <LucideFileText size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">No prescriptions yet.</p>
            <button
              onClick={() => router.push("/forms/prescription")}
              className="text-blue-600 text-sm font-medium hover:underline mt-1 inline-block"
            >
              Write one now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Row header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <LucideFileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {rx.patient_name || "Unknown patient"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {rx.diagnosis || "No diagnosis"} · {rx.drugs?.length ?? 0} drug(s) ·{" "}
                        {new Date(rx.created_at).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={(e) => handleDelete(rx.id, e)}
                      disabled={deletingId === rx.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50 rounded-lg hover:bg-red-50"
                      title="Delete prescription"
                    >
                      <LucideTrash2 size={14} />
                    </button>
                    {expanded === rx.id ? (
                      <LucideChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <LucideChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === rx.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">

                    {/* Patient info */}
                    <div className="flex flex-wrap gap-4">
                      {rx.patient_name && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <LucideUser size={12} className="text-gray-400" />
                          {rx.patient_name}
                        </div>
                      )}
                      {rx.patient_email && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <LucideMail size={12} className="text-gray-400" />
                          {rx.patient_email}
                        </div>
                      )}
                    </div>

                    {/* Diagnosis */}
                    {rx.diagnosis && (
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          Diagnosis / Indication
                        </p>
                        <p className="text-sm text-gray-800">{rx.diagnosis}</p>
                      </div>
                    )}

                    {/* Drugs */}
                    {rx.drugs?.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Medications ({rx.drugs.length})
                        </p>
                        {rx.drugs.map((drug, i) => (
                          <div key={drug.id ?? i} className="bg-white rounded-lg p-3 border border-gray-100 flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                              <LucidePill size={13} />
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-semibold text-sm text-gray-800">{drug.drug_name}</p>
                              {drug.dosage && (
                                <p className="text-xs text-gray-500">Dosage: {drug.dosage}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {drug.frequency} · {drug.duration}
                              </p>
                              {drug.instructions && (
                                <p className="text-xs text-gray-400 italic">{drug.instructions}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No medications recorded — this record can be safely deleted.
                      </p>
                    )}

                    {/* Notes */}
                    {rx.notes && (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                        <p className="text-xs font-semibold text-yellow-700 mb-1">Additional notes</p>
                        <p className="text-sm text-gray-700">{rx.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
