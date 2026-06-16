"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";

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
  created_at: string;
};

type Appointment = {
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
};

type Drug = {
  id: string;
  drug_name: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const FREQUENCY_OPTIONS = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "Every 8 hours", "Every 12 hours", "As needed (PRN)", "Weekly", "Other"];
const DURATION_OPTIONS = ["1 day", "2 days", "3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "2 months", "3 months", "Ongoing", "Other"];

function PrescriptionSection({
  value,
  onChange,
}: {
  value: { diagnosis: string; drugs: Drug[]; notes: string };
  onChange: (val: { diagnosis: string; drugs: Drug[]; notes: string }) => void;
}) {
  const addDrug = () => {
    onChange({
      ...value,
      drugs: [
        ...value.drugs,
        { id: `d${Date.now()}`, drug_name: "", frequency: "", duration: "", instructions: "" },
      ],
    });
  };

  const removeDrug = (id: string) => {
    onChange({ ...value, drugs: value.drugs.filter(d => d.id !== id) });
  };

  const updateDrug = (id: string, updates: Partial<Drug>) => {
    onChange({ ...value, drugs: value.drugs.map(d => d.id === id ? { ...d, ...updates } : d) });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Diagnosis */}
      <div>
        <label className="text-sm font-medium text-gray-700">Diagnosis / Indication</label>
        <input
          type="text"
          value={value.diagnosis}
          onChange={(e) => onChange({ ...value, diagnosis: e.target.value })}
          placeholder="e.g. Acute pharyngitis"
          className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
        />
      </div>

      {/* Medications */}
      <div className="flex flex-col gap-3">
        {value.drugs.map((drug, idx) => (
          <div key={drug.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Medication {idx + 1}</p>
              <button
                onClick={() => removeDrug(drug.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500">Drug name</label>
                <input
                  type="text"
                  value={drug.drug_name}
                  onChange={(e) => updateDrug(drug.id, { drug_name: e.target.value })}
                  placeholder="e.g. Amoxicillin 500mg"
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Frequency</label>
                <select
                  value={drug.frequency}
                  onChange={(e) => updateDrug(drug.id, { frequency: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                >
                  <option value="">Select...</option>
                  {FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Duration</label>
                <select
                  value={drug.duration}
                  onChange={(e) => updateDrug(drug.id, { duration: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                >
                  <option value="">Select...</option>
                  {DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500">Special instructions</label>
                <input
                  type="text"
                  value={drug.instructions}
                  onChange={(e) => updateDrug(drug.id, { instructions: e.target.value })}
                  placeholder="e.g. Take with food"
                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                />
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={addDrug}
          className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700 border border-dashed border-blue-300 rounded-lg py-2 px-4 hover:bg-blue-50 transition-colors"
        >
          + Add medication
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-gray-700">Additional Notes</label>
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={3}
          placeholder="Any additional instructions or notes..."
          className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
        />
      </div>
    </div>
  );
}

export default function FormDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.id as string;
  const appointmentId = searchParams.get("appointmentId");
  const userId = useSelector((state: RootState) => state.auth.identity);

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [prescriptionValue, setPrescriptionValue] = useState<{
    diagnosis: string; drugs: Drug[]; notes: string;
  }>({ diagnosis: "", drugs: [], notes: "" });
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const isEditMode = !appointmentId;

  useEffect(() => {
    if (!userId || !formId) return;
    axiosClient
      .get(`provider/${userId}/forms/${formId}`)
      .then((res) => {
        setForm(res.data);
        setNewName(res.data.name);
      })
      .catch(() => toast.error("Could not load form"))
      .finally(() => setLoading(false));
  }, [userId, formId]);

  useEffect(() => {
    if (!appointmentId || !userId) return;
    axiosClient
      .get(`provider/${userId}/appointments/${appointmentId}`)
      .then((res) => setAppointment(res.data))
      .catch(() => toast.error("Could not load appointment details"));
  }, [appointmentId, userId]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveCapture = async () => {
    if (!appointmentId) return;
    setSaving(true);
    try {
      const values: Record<string, unknown> = { ...fieldValues };
      const prescriptionSection = form?.sections.find(s => s.isPrescription);
      if (prescriptionSection) {
        values[prescriptionSection.id] = prescriptionValue;
      }
      await axiosClient.post(
        `provider/${userId}/appointments/${appointmentId}/captures`,
        { form_id: formId, form_name: form?.name, values }
      );
      toast.success("Form saved");
      router.back();
    } catch {
      toast.error("Could not save form");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = () => {
    if (!newName.trim()) return;
    axiosClient
      .patch(`provider/${userId}/forms/${formId}`, { name: newName })
      .then((res) => { setForm(res.data); setEditingName(false); toast.success("Form renamed"); })
      .catch(() => toast.error("Could not rename form"));
  };

  const handleDelete = () => {
    if (!confirm("Delete this form? This cannot be undone.")) return;
    setDeleting(true);
    axiosClient
      .delete(`provider/${userId}/forms/${formId}`)
      .then(() => { toast.success("Form deleted"); router.push("/forms"); })
      .catch(() => { toast.error("Could not delete form"); setDeleting(false); });
  };

  const renderField = (field: Field) => {
    const val = fieldValues[field.id] ?? "";
    const cls = "w-full p-2 border border-gray-300 rounded text-sm";
    switch (field.type) {
      case "textarea": return <textarea className={cls} rows={3} value={val} onChange={e => handleFieldChange(field.id, e.target.value)} />;
      case "number": return <input type="number" className={cls} value={val} onChange={e => handleFieldChange(field.id, e.target.value)} />;
      case "date": return <input type="date" className={cls} value={val} onChange={e => handleFieldChange(field.id, e.target.value)} />;
      case "checkbox": return <input type="checkbox" className="w-4 h-4" checked={val === "true"} onChange={e => handleFieldChange(field.id, String(e.target.checked))} />;
      case "select": return (
        <select className={cls} value={val} onChange={e => handleFieldChange(field.id, e.target.value)}>
          <option value="">Select...</option>
          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
      default: return <input type="text" className={cls} value={val} onChange={e => handleFieldChange(field.id, e.target.value)} />;
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!form) return <div className="p-6">Form not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← Back</button>
          {isEditMode ? (
            editingName ? (
              <div className="flex items-center gap-2">
                <input value={newName} onChange={e => setNewName(e.target.value)} className="text-xl font-bold border border-blue-300 rounded px-2 py-1 outline-none" autoFocus />
                <button onClick={handleRename} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                <button onClick={() => setEditingName(false)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{form.name}</h1>
                <button onClick={() => setEditingName(true)} className="text-xs px-2 py-1 text-gray-500 hover:text-blue-600">✏️ Rename</button>
              </div>
            )
          ) : (
            <h1 className="text-xl font-bold">{form.name}</h1>
          )}
        </div>
        <div className="flex gap-3">
          {isEditMode ? (
            <>
              <button onClick={() => router.push(`/forms/new?edit=${formId}`)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Edit Form</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete Form"}
              </button>
            </>
          ) : (
            <button onClick={handleSaveCapture} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Form"}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6">
        {/* Patient banner (only when filling from appointment) */}
        {appointment && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              {appointment.patient_first_name[0]}{appointment.patient_last_name[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">
                {appointment.patient_first_name} {appointment.patient_last_name}
              </p>
              <p className="text-xs text-gray-500">
                {appointment.patient_email}{appointment.patient_phone_number ? ` · ${appointment.patient_phone_number}` : ""}
              </p>
            </div>
            <span className="ml-auto text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded-full">From appointment</span>
          </div>
        )}

        {/* Sections */}
        {form.sections?.map((section) => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b px-4 py-3">
              <h2 className="font-semibold text-gray-800">{section.title}</h2>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {section.isPrescription ? (
                <PrescriptionSection value={prescriptionValue} onChange={setPrescriptionValue} />
              ) : (
                section.fields?.map((field) => (
                  <div key={field.id} className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
