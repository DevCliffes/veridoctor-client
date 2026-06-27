"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { LucideLoader2 } from "@veridoctor/design/icons";

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

type Section = {
  id: string;
  title: string;
  fields: Field[];
  isPrescription?: boolean;
};

type Drug = {
  id: string;
  drug_name: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

type PrescriptionValue = {
  diagnosis: string;
  drugs: Drug[];
  notes: string;
};

type Capture = {
  id: string;
  form_id: string;
  form_name: string;
  form_snapshot: Section[];
  values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const SNAPSHOT_KEY = "__form_snapshot__";

export default function CaptureViewPage() {
  const { id: appointmentId, captureId } = useParams<{ id: string; captureId: string }>();
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !appointmentId || !captureId) return;
    axiosClient
      .get(`provider/${userId}/appointments/${appointmentId}/captures`)
      .then((res) => {
        const found = (res.data ?? []).find((c: Capture) => c.id === captureId);
        if (!found) {
          toast.error("Capture not found");
          return;
        }
        setCapture(found);
      })
      .catch(() => toast.error("Could not load capture"))
      .finally(() => setLoading(false));
  }, [userId, appointmentId, captureId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LucideLoader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  if (!capture) {
    return (
      <div className="p-6 mx-4">
        <p className="text-gray-500">Capture not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-3 text-blue-600 text-sm hover:underline"
        >
          ← Go back
        </button>
      </div>
    );
  }

  // form_snapshot is now stored correctly on the top-level by the backend.
  // Fall back to values.__form_snapshot__ only for captures saved between
  // the original workaround and this fix.
  const smuggled = capture.values?.[SNAPSHOT_KEY];
  const sections: Section[] =
    Array.isArray(capture.form_snapshot) && capture.form_snapshot.length > 0
      ? capture.form_snapshot
      : Array.isArray(smuggled) && smuggled.length > 0
      ? (smuggled as Section[])
      : [];

  const displayValues = Object.fromEntries(
    Object.entries(capture.values ?? {}).filter(([k]) => k !== SNAPSHOT_KEY)
  );

  const isPrescriptionSection = (section: Section) =>
    section.isPrescription ||
    section.title?.toLowerCase().includes("prescription") ||
    section.title?.toLowerCase().includes("treatment");

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          ←
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {capture.form_name || "Capture"}
          </p>
          <p className="text-xs text-gray-400">
            Saved {new Date(capture.created_at).toLocaleString("en-KE")}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
        {sections.length > 0 ? (
          sections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
                <h2 className="font-semibold text-gray-800 text-sm">
                  {section.title}
                </h2>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {isPrescriptionSection(section) ? (
                  <PrescriptionView
                    value={capture.values[section.id] as PrescriptionValue | undefined}
                  />
                ) : (
                  section.fields.map((field) => {
                    const val = capture.values[field.id];
                    const isEmpty =
                      val === undefined || val === "" || val === false || val === null;
                    return (
                      <div key={field.id} className="flex flex-col gap-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          {field.label}
                          {field.required && (
                            <span className="text-red-400 ml-1">*</span>
                          )}
                        </p>
                        <p className={`text-sm ${isEmpty ? "text-gray-300 italic" : "text-gray-700"}`}>
                          {isEmpty
                            ? "Not filled"
                            : field.type === "checkbox"
                            ? val ? "Yes" : "No"
                            : String(val)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        ) : (
          // Legacy fallback for captures with no snapshot saved at all
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">Captured Data</h2>
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                Legacy capture — field labels unavailable
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {Object.entries(displayValues).map(([key, val]) => {
                const isLabeledPair =
                  val !== null &&
                  typeof val === "object" &&
                  "label" in (val as object) &&
                  "value" in (val as object);

                if (isLabeledPair) {
                  const { label, value: innerVal } = val as { label: string; value: unknown };
                  const isPrescObj =
                    innerVal !== null &&
                    typeof innerVal === "object" &&
                    ("drugs" in (innerVal as object) || "diagnosis" in (innerVal as object));
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {label}
                      </p>
                      {isPrescObj ? (
                        <PrescriptionView value={innerVal as PrescriptionValue} />
                      ) : (
                        <p className="text-sm text-gray-700">
                          {innerVal === undefined || innerVal === "" || innerVal === null
                            ? <span className="italic text-gray-300">Not filled</span>
                            : String(innerVal)}
                        </p>
                      )}
                    </div>
                  );
                }

                const isPrescObj =
                  val !== null &&
                  typeof val === "object" &&
                  ("drugs" in (val as object) || "diagnosis" in (val as object));

                if (isPrescObj) {
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Prescription
                      </p>
                      <PrescriptionView value={val as PrescriptionValue} />
                    </div>
                  );
                }

                return (
                  <div key={key} className="flex flex-col gap-0.5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{key}</p>
                    <p className="text-sm text-gray-700">
                      {val === undefined || val === "" || val === null
                        ? <span className="italic text-gray-300">Not filled</span>
                        : String(val)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrescriptionView({ value }: { value: PrescriptionValue | undefined }) {
  if (
    !value ||
    (!value.diagnosis && !value.notes && (!value.drugs || value.drugs.length === 0))
  ) {
    return <p className="text-sm text-gray-300 italic">Not filled</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {value.diagnosis && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Diagnosis / Indication
          </p>
          <p className="text-sm text-gray-700">{value.diagnosis}</p>
        </div>
      )}
      {value.drugs && value.drugs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Medications
          </p>
          <div className="flex flex-col gap-2">
            {value.drugs.map((drug, idx) => (
              <div
                key={drug.id ?? idx}
                className="border border-gray-100 rounded-lg p-3 bg-gray-50"
              >
                <p className="text-sm font-semibold text-gray-800">
                  {drug.drug_name || "—"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[drug.frequency, drug.duration].filter(Boolean).join(" · ")}
                </p>
                {drug.instructions && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">
                    {drug.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {value.notes && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Additional Notes
          </p>
          <p className="text-sm text-gray-700">{value.notes}</p>
        </div>
      )}
    </div>
  );
}
