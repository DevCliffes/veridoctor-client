"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { LucideCheckCircle, LucideLoader2 } from "@veridoctor/design/icons";

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

type Form = {
  id: string;
  name: string;
  sections: Section[];
};

type FieldValues = Record<string, string | boolean>;

type Appointment = {
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
  patient_identity: string | null;
};

type Drug = {
  id: string;
  drug_name: string;
  frequency: string;
  duration: string;
  instructions: string;
};

type PrescriptionValue = {
  diagnosis: string;
  drugs: Drug[];
  notes: string;
};

const FREQUENCY_OPTIONS = [
  "Once daily", "Twice daily", "Three times daily", "Four times daily",
  "Every 8 hours", "Every 12 hours", "As needed (PRN)", "Weekly", "Other",
];
const DURATION_OPTIONS = [
  "1 day", "2 days", "3 days", "5 days", "7 days", "10 days",
  "14 days", "1 month", "2 months", "3 months", "Ongoing", "Other",
];

const DEMOGRAPHICS_AUTOFILL: Record<string, (a: Appointment) => string> = {
  "Full Name": (a) => `${a.patient_first_name} ${a.patient_last_name}`.trim(),
  "Contact Number": (a) => a.patient_phone_number ?? "",
  "Email": (a) => a.patient_email ?? "",
};

const AUTOSAVE_INTERVAL = 5000;
const SNAPSHOT_KEY = "__form_snapshot__";

export default function CapturePage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const formId = searchParams.get("form");
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);

  const [form, setForm] = useState<Form | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [appointmentReady, setAppointmentReady] = useState(false);
  const [values, setValues] = useState<FieldValues>({});
  const [prescriptionValues, setPrescriptionValues] = useState<Record<string, PrescriptionValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeSection, setActiveSection] = useState<string>("");
  // ── Guard: true once we've confirmed this form was already submitted ──────
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const draftKey = `vd_capture_${appointmentId}`;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Step 1: Fetch appointment ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !appointmentId) return;
    axiosClient
      .get(`provider/${userId}/appointments/${appointmentId}`)
      .then(async (res) => {
        const appt: Appointment = res.data;
        if (appt.patient_phone_number) {
          setAppointment(appt);
          setAppointmentReady(true);
          return;
        }
        if (appt.patient_identity) {
          try {
            const profileRes = await axiosClient.get(
              `provider/${userId}/patients/${appt.patient_identity}`
            );
            const phone: string =
              profileRes.data?.phone_number ??
              profileRes.data?.patient_phone_number ??
              "";
            setAppointment({ ...appt, patient_phone_number: phone });
          } catch {
            setAppointment(appt);
          }
        } else {
          setAppointment(appt);
        }
        setAppointmentReady(true);
      })
      .catch(() => {
        setAppointmentReady(true);
      });
  }, [userId, appointmentId]);

  // ── Step 2: Load form + restore draft + check for existing capture ────────
  useEffect(() => {
    if (!userId || !formId) return;

    // Check if this form has already been captured for this appointment
    axiosClient
      .get(`provider/${userId}/appointments/${appointmentId}/captures`)
      .then((res) => {
        const captures: { form_id?: string }[] = res.data ?? [];
        const duplicate = captures.some((c) => c.form_id === formId);
        if (duplicate) setAlreadySubmitted(true);
      })
      .catch(() => {/* non-fatal */});

    axiosClient
      .get(`provider/${userId}/forms/${formId}`)
      .then((res) => {
        setForm(res.data);
        setActiveSection(res.data.sections?.[0]?.id ?? "");
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft.formId === formId && draft.values) {
              setValues(draft.values);
              if (draft.prescriptionValues) setPrescriptionValues(draft.prescriptionValues);
              toast("📝 Draft restored — your previous progress is loaded");
            }
          }
        } catch { /* ignore */ }
      })
      .catch(() => toast.error("Could not load form"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, formId]);

  // ── Step 3: Autofill demographics ────────────────────────────────────────
  useEffect(() => {
    if (!form || !appointment || !appointmentReady) return;
    const demographicsSection = form.sections.find(
      (s) => s.id === "demographics" || s.title.toLowerCase().includes("demographic")
    );
    if (!demographicsSection) return;
    const autofilled: FieldValues = {};
    for (const field of demographicsSection.fields) {
      const filler = DEMOGRAPHICS_AUTOFILL[field.label];
      if (filler) {
        const val = filler(appointment);
        if (val) autofilled[field.id] = val;
      }
    }
    if (Object.keys(autofilled).length === 0) return;
    setValues((prev) => {
      const merged = { ...prev };
      for (const [key, val] of Object.entries(autofilled)) {
        if (!merged[key]) merged[key] = val;
      }
      return merged;
    });
  }, [form, appointment, appointmentReady]);

  // ── Draft save ────────────────────────────────────────────────────────────
  const saveDraft = useCallback(
    (currentValues: FieldValues, currentPrescriptions: Record<string, PrescriptionValue>) => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            formId,
            appointmentId,
            values: currentValues,
            prescriptionValues: currentPrescriptions,
            savedAt: new Date().toISOString(),
          })
        );
        setLastSaved(new Date());
        setSaveStatus("saved");
      } catch { /* ignore */ }
    },
    [draftKey, formId, appointmentId]
  );

  const handleChange = (fieldId: string, value: string | boolean) => {
    setValues((prev) => {
      const next = { ...prev, [fieldId]: value };
      setSaveStatus("saving");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveDraft(next, prescriptionValues), AUTOSAVE_INTERVAL);
      return next;
    });
  };

  const handlePrescriptionChange = (sectionId: string, val: PrescriptionValue) => {
    setPrescriptionValues((prev) => {
      const next = { ...prev, [sectionId]: val };
      setSaveStatus("saving");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveDraft(values, next), AUTOSAVE_INTERVAL);
      return next;
    });
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveDraft(values, prescriptionValues);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [values, prescriptionValues, saveDraft]);

  const validate = () => {
    if (!form) return false;
    for (const section of form.sections) {
      if (section.isPrescription) continue;
      for (const field of section.fields) {
        if (field.required && !values[field.id]) {
          toast.error(`"${field.label}" is required (in ${section.title})`);
          setActiveSection(section.id);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    // ── Duplicate guard ───────────────────────────────────────────────────
    if (alreadySubmitted) {
      toast.error("This form has already been saved for this appointment.");
      return;
    }

    if (!validate()) return;
    setSaving(true);

    try {
      // Re-check on the server right before submitting (race-condition safety)
      const existingRes = await axiosClient.get(
        `provider/${userId}/appointments/${appointmentId}/captures`
      );
      const existing: { form_id?: string }[] = existingRes.data ?? [];
      if (existing.some((c) => c.form_id === formId)) {
        setAlreadySubmitted(true);
        toast.error("This form has already been saved for this appointment.");
        setSaving(false);
        return;
      }

      const submittedAt = new Date().toISOString();

      const flatValues: Record<string, unknown> = { ...values };
      for (const [sectionId, prescVal] of Object.entries(prescriptionValues)) {
        flatValues[sectionId] = prescVal;
      }
      flatValues[SNAPSHOT_KEY] = form?.sections ?? [];
      // ── Capture submission timestamp ──────────────────────────────────
      flatValues["__submitted_at__"] = submittedAt;

      await axiosClient.post(
        `provider/${userId}/appointments/${appointmentId}/captures`,
        {
          form_id: formId,
          form_name: form?.name ?? "",
          values: flatValues,
        }
      );

      localStorage.removeItem(draftKey);
      toast.success("Capture saved successfully!");
      router.push(`/appointments/${appointmentId}`);
    } catch {
      toast.error("Could not save capture. Your draft is preserved.");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LucideLoader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Form not found.</p>
        <button onClick={() => router.back()} className="mt-3 text-blue-600 text-sm hover:underline">← Go back</button>
      </div>
    );
  }

  const completedFields = Object.keys(values).filter((k) => !!values[k]).length;
  const totalFields = form.sections
    .filter(s => !s.isPrescription)
    .reduce((acc, s) => acc + s.fields.length, 0);
  const progressPct = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  // ── Format saved timestamp as "28 Jun 2026 at 06:50" ─────────────────────
  const formatSavedAt = (d: Date) =>
    d.toLocaleString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(",", " at");

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky header — NO submit button here, only status indicator */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 shrink-0">←</button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{form.name}</p>
            <p className="text-xs text-gray-400">{completedFields}/{totalFields} fields filled</p>
          </div>
        </div>

        {/* Draft save status only — no submit button */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          {saveStatus === "saving" && (
            <span className="text-gray-400 flex items-center gap-1">
              <LucideLoader2 size={12} className="animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && lastSaved && (
            <span className="text-green-600 flex items-center gap-1">
              <LucideCheckCircle size={12} /> Draft saved {formatSavedAt(lastSaved)}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-red-500">⚠ Save failed</span>
          )}
          {alreadySubmitted && (
            <span className="text-amber-600 font-medium">⚠ Already submitted</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex gap-6">
        {/* Section nav sidebar */}
        <nav className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-24 self-start">
          {form.sections.map((section, idx) => {
            const filledInSection = section.isPrescription
              ? 0
              : section.fields.filter((f) => !!values[f.id]).length;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  isActive ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="truncate">{idx + 1}. {section.title}</span>
                  {!section.isPrescription && filledInSection > 0 && (
                    <span className="text-xs text-gray-400 ml-1">{filledInSection}/{section.fields.length}</span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Form sections */}
        <div className="flex-1 flex flex-col gap-5">
          {form.sections.map((section) => (
            <div
              key={section.id}
              id={`section-${section.id}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-24"
            >
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 text-sm">{section.title}</h2>
                {!section.isPrescription && (
                  <span className="text-xs text-gray-400">
                    {section.fields.filter((f) => !!values[f.id]).length}/{section.fields.length}
                  </span>
                )}
              </div>
              <div className="p-5 flex flex-col gap-4">
                {section.isPrescription ? (
                  <PrescriptionSection
                    value={prescriptionValues[section.id] ?? { diagnosis: "", drugs: [], notes: "" }}
                    onChange={(val) => handlePrescriptionChange(section.id, val)}
                  />
                ) : (
                  section.fields.map((field) => {
                    const isDemographicsAutofill =
                      (section.id === "demographics" || section.title.toLowerCase().includes("demographic")) &&
                      DEMOGRAPHICS_AUTOFILL[field.label] !== undefined;
                    return (
                      <FieldInput
                        key={field.id}
                        field={field}
                        value={values[field.id]}
                        onChange={(val) => handleChange(field.id, val)}
                        readOnly={isDemographicsAutofill && appointmentReady}
                      />
                    );
                  })
                )}
              </div>
            </div>
          ))}

          {/* Single submit button — bottom of form only */}
          <button
            onClick={handleSubmit}
            disabled={saving || alreadySubmitted}
            className={`w-full py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${
              alreadySubmitted
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            }`}
          >
            {saving ? (
              <><LucideLoader2 size={16} className="animate-spin" /> Saving…</>
            ) : alreadySubmitted ? (
              <><LucideCheckCircle size={16} /> Already submitted</>
            ) : (
              <><LucideCheckCircle size={16} /> Submit Capture</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Prescription section ──────────────────────────────────────────────────────

function PrescriptionSection({
  value,
  onChange,
}: {
  value: PrescriptionValue;
  onChange: (val: PrescriptionValue) => void;
}) {
  const addDrug = () => {
    onChange({
      ...value,
      drugs: [...value.drugs, { id: `d${Date.now()}`, drug_name: "", frequency: "", duration: "", instructions: "" }],
    });
  };

  const removeDrug = (id: string) => onChange({ ...value, drugs: value.drugs.filter((d) => d.id !== id) });

  const updateDrug = (id: string, updates: Partial<Drug>) =>
    onChange({ ...value, drugs: value.drugs.map((d) => (d.id === id ? { ...d, ...updates } : d)) });

  const inputCls = "w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Diagnosis / Indication</label>
        <input
          type="text"
          value={value.diagnosis}
          onChange={(e) => onChange({ ...value, diagnosis: e.target.value })}
          placeholder="e.g. Hypertension, Type 2 Diabetes, Upper respiratory tract infection..."
          className={inputCls}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Medications</h3>
          <button onClick={addDrug} className="text-sm text-blue-600 font-medium hover:text-blue-700">
            + Add medication
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {value.drugs.length === 0 && (
            <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center text-sm text-gray-400">
              No medications added yet. Click &quot;+ Add medication&quot; to start.
            </div>
          )}
          {value.drugs.map((drug, idx) => (
            <div key={drug.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">Medication {idx + 1}</p>
                <button onClick={() => removeDrug(drug.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Drug name &amp; strength</label>
                  <input
                    type="text"
                    value={drug.drug_name}
                    onChange={(e) => updateDrug(drug.id, { drug_name: e.target.value })}
                    placeholder="e.g. Amoxicillin 500mg"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Frequency</label>
                    <select value={drug.frequency} onChange={(e) => updateDrug(drug.id, { frequency: e.target.value })} className={inputCls}>
                      <option value="">Select…</option>
                      {FREQUENCY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Duration</label>
                    <select value={drug.duration} onChange={(e) => updateDrug(drug.id, { duration: e.target.value })} className={inputCls}>
                      <option value="">Select…</option>
                      {DURATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Special instructions (optional)</label>
                  <input
                    type="text"
                    value={drug.instructions}
                    onChange={(e) => updateDrug(drug.id, { instructions: e.target.value })}
                    placeholder="e.g. Take with food, avoid alcohol..."
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Additional notes</label>
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={3}
          placeholder="Follow-up instructions, referrals, lifestyle advice..."
          className={inputCls}
        />
      </div>
    </div>
  );
}

// ── Field input ───────────────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  readOnly = false,
}: {
  field: Field;
  value: string | boolean | undefined;
  onChange: (val: string | boolean) => void;
  readOnly?: boolean;
}) {
  const base = "w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors";
  const readOnlyCls = "w-full p-2.5 border border-gray-100 rounded-lg text-sm text-gray-600 bg-gray-50 cursor-default select-none";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
        {readOnly && (
          <span className="text-xs text-blue-500 font-normal bg-blue-50 px-1.5 py-0.5 rounded">
            From appointment
          </span>
        )}
      </label>
      {readOnly ? (
        <div className={readOnlyCls}>{(value as string) || "—"}</div>
      ) : (
        <>
          {field.type === "textarea" && (
            <textarea className={base} rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}...`} />
          )}
          {field.type === "text" && (
            <input type="text" className={base} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}...`} />
          )}
          {field.type === "number" && (
            <input type="number" className={base} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          )}
          {field.type === "date" && (
            <input type="date" className={base} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          )}
          {field.type === "checkbox" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={(value as boolean) ?? false} onChange={(e) => onChange(e.target.checked)} />
              <span className="text-sm text-gray-600">Yes</span>
            </label>
          )}
          {field.type === "select" && (
            <select className={base} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
              <option value="">Select…</option>
              {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
        </>
      )}
    </div>
  );
}
