"use client";
import { useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useRouter } from "next/navigation";
import { LucideFileText, LucidePlus, LucideChevronDown, LucideChevronUp } from "@veridoctor/design/icons";

type Drug = {
  id: string;
  drug_name: string;
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

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(`provider/${userId}/prescriptions`)
      .then((res) => setPrescriptions(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="p-4 mx-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Prescriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {prescriptions.length} prescriptions written
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
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <LucideFileText size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{rx.patient_name}</p>
                      <p className="text-xs text-gray-500">
                        {rx.diagnosis || "No diagnosis"} · {rx.drugs?.length ?? 0} drug(s) · {new Date(rx.created_at).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                  </div>
                  {expanded === rx.id ? (
                    <LucideChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <LucideChevronDown size={16} className="text-gray-400" />
                  )}
                </div>

                {expanded === rx.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                    {rx.notes && (
                      <div className="bg-yellow-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-yellow-700 mb-1">Doctor&apos;s notes</p>
                        <p className="text-sm text-gray-700">{rx.notes}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {rx.drugs?.map((drug) => (
                        <div key={drug.id} className="bg-gray-50 rounded-lg p-3">
                          <p className="font-medium text-sm text-gray-800">{drug.drug_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {drug.frequency} · {drug.duration}
                          </p>
                          {drug.instructions && (
                            <p className="text-xs text-gray-400 mt-0.5 italic">{drug.instructions}</p>
                          )}
                        </div>
                      ))}
                    </div>
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
