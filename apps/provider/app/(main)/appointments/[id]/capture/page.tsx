"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { LucideCheckCircle, LucideSave, LucideLoader2 } from "@veridoctor/design/icons";

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
};

type Form = {
  id: string;
  name: string;
  sections: Section[];
};

type FieldValues = Record<string, string | boolean>;

const AUTOSAVE_INTERVAL = 5000; // 5 seconds

export default function CapturePage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const formId = searchParams.get("form");
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);

  const [form, setForm] = useState<Form | null>(null);
  const [values, setValues] = useState<FieldValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeSection, setActiveSection] = useState<string>("");
  const draftKey = `vd_capture_${appointmentId}`;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load form and restore any draft
  useEffect(() => {
    if (!userId || !formId) return;
    axiosClient
      .get(`provider/${userId}/forms/${formId}`)
      .then((res) => {
        setForm(res.data);
        setActiveSection(res.data.sections?.[0]?.id ?? "");

        // Restore draft from localStorage
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft.formId === formId && draft.values) {
              setValues(draft.values);
              toast("📝 Draft restored — your previous progress is loaded");
            }
          }
        } catch {
          // ignore corrupt drafts
        }
      })
      .catch(() => toast.error("Could not load form"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, formId]);

  // Auto-save to localStorage whenever values change
  const saveDraft = useCallback((currentValues: FieldValues) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        formId,
        appointmentId,
        values: currentValues,
        savedAt: new Date().toISOString(),
      }));
      setLastSaved(new Date());
      setSaveStatus("saved");
    } catch {
      // ignore
    }
  }, [draftKey, formId, appointmentId]);

  const handleChange = (fieldId: string, value: string | boolean) => {
    setValues((prev) => {
      const next = { ...prev, [fieldId]: value };

      // Debounced localStorage save
      setSaveStatus("saving");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveDraft(next), AUTOSAVE_INTERVAL);

      return next;
    });
  };

  // Also save on visibility change (tab close / switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveDraft(values);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [values, saveDraft]);

  // Validate required fields
  const validate = () => {
    if (!form) return false;
    for (const section of form.sections) {
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
    if (!validate()) return;
    setSaving(true);
    try {
      await axiosClient.post(`provider/${userId}/appointments/${appointmentId}/captures`, {
        form_id: formId,
        values,
      });
      // Clear draft on successful submit
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
  const totalFields = form.sections.reduce((acc, s) => acc + s.fields.length, 0);
  const progressPct = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 shrink-0">←</button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{form.name}</p>
            <p className="text-xs text-gray-400">
              {completedFields}/{totalFields} fields filled
            </p>
          </div>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-3 shrink-0">
          {saveStatus === "saving" && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <LucideLoader2 size={12} className="animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && lastSaved && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <LucideCheckCircle size={12} /> Saved {lastSaved.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-500">⚠ Save failed</span>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
          >
            {saving ? <LucideLoader2 size={14} className="animate-spin" /> : <LucideSave size={14} />}
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-blue-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex gap-6">
        {/* Section nav — desktop sidebar */}
        <nav className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-24 self-start">
          {form.sections.map((section, idx) => {
            const filledInSection = section.fields.filter((f) => !!values[f.id]).length;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="truncate">{idx + 1}. {section.title}</span>
                  {filledInSection > 0 && (
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
                <span className="text-xs text-gray-400">
                  {section.fields.filter((f) => !!values[f.id]).length}/{section.fields.length}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {section.fields.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    onChange={(val) => handleChange(field.id, val)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Submit button — bottom */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <LucideLoader2 size={16} className="animate-spin" /> : <LucideCheckCircle size={16} />}
            {saving ? "Saving…" : "Submit Capture"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | boolean | undefined;
  onChange: (val: string | boolean) => void;
}) {
  const base = "w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.type === "textarea" && (
        <textarea
          className={base}
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      )}
      {field.type === "text" && (
        <input
          type="text"
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      )}
      {field.type === "number" && (
        <input
          type="number"
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === "date" && (
        <input
          type="date"
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === "checkbox" && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-blue-600"
            checked={(value as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-sm text-gray-600">Yes</span>
        </label>
      )}
      {field.type === "select" && (
        <select
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
    </div>
  );
}
