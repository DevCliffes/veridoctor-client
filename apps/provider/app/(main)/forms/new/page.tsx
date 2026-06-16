"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";
import { axiosClient } from "@veridoctor/api-client";

type FieldType = "text" | "textarea" | "number" | "select" | "checkbox" | "date";

type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  section: string;
};

type Section = {
  id: string;
  title: string;
  fields: FormField[];
  isPrescription?: boolean;
};

const defaultSections: Section[] = [
  {
    id: "vitals",
    title: "Vital Signs",
    fields: [
      { id: "f1", label: "Blood Pressure (mmHg)", type: "text", required: false, section: "vitals" },
      { id: "f2", label: "Pulse (bpm)", type: "number", required: false, section: "vitals" },
      { id: "f3", label: "Temperature (°C)", type: "number", required: false, section: "vitals" },
      { id: "f4", label: "Weight (kg)", type: "number", required: false, section: "vitals" },
      { id: "f5", label: "Height (cm)", type: "number", required: false, section: "vitals" },
    ],
  },
  {
    id: "complaint",
    title: "Chief Complaint / Reason for Visit",
    fields: [
      { id: "f6", label: "Chief Complaint", type: "textarea", required: true, section: "complaint" },
      { id: "f7", label: "Duration of Symptoms", type: "text", required: false, section: "complaint" },
    ],
  },
  {
    id: "history",
    title: "Medical History",
    fields: [
      { id: "f8", label: "Known Allergies", type: "textarea", required: false, section: "history" },
      { id: "f9", label: "Chronic Conditions", type: "textarea", required: false, section: "history" },
      { id: "f10", label: "Current Medications", type: "textarea", required: false, section: "history" },
    ],
  },
  {
    id: "examination",
    title: "Clinical Notes / Examination Findings",
    fields: [
      { id: "f11", label: "Examination Findings", type: "textarea", required: false, section: "examination" },
    ],
  },
  {
    id: "diagnosis",
    title: "Diagnosis",
    fields: [
      { id: "f12", label: "Primary Diagnosis", type: "textarea", required: false, section: "diagnosis" },
      { id: "f13", label: "ICD Code", type: "text", required: false, section: "diagnosis" },
    ],
  },
  {
    id: "prescription",
    title: "Prescription",
    isPrescription: true,
    fields: [],
  },
  {
    id: "followup",
    title: "Follow-up Instructions",
    fields: [
      { id: "f14", label: "Follow-up Date", type: "date", required: false, section: "followup" },
      { id: "f15", label: "Instructions for Patient", type: "textarea", required: false, section: "followup" },
    ],
  },
];

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
];

function FormBuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [formName, setFormName] = useState("Universal Patient Form");
  const [sections, setSections] = useState<Section[]>(defaultSections);
  const [addingFieldTo, setAddingFieldTo] = useState<string | null>(null);
  const [newField, setNewField] = useState<Partial<FormField>>({ type: "text", required: false });
  const [editingField, setEditingField] = useState<{ sectionId: string; field: FormField } | null>(null);
  const [draggedField, setDraggedField] = useState<{ sectionId: string; fieldId: string } | null>(null);

  useEffect(() => {
    if (!editId || !userId) return;
    axiosClient
      .get(`provider/${userId}/forms/${editId}`)
      .then((res) => {
        setFormName(res.data.name);
        setSections(res.data.sections);
      })
      .catch(() => toast.error("Could not load form"));
  }, [editId, userId]);

  const addField = (sectionId: string) => {
    if (!newField.label) { toast.error("Field label is required"); return; }
    const field: FormField = {
      id: `f${Date.now()}`,
      label: newField.label!,
      type: newField.type as FieldType || "text",
      required: newField.required || false,
      options: newField.options,
      section: sectionId,
    };
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, fields: [...s.fields, field] } : s));
    setAddingFieldTo(null);
    setNewField({ type: "text", required: false });
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) } : s));
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    } : s));
    setEditingField(null);
  };

  const addSection = () => {
    const id = `section_${Date.now()}`;
    setSections(prev => [...prev, { id, title: "New Section", fields: [] }]);
  };

  const deleteSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const handleDragStart = (sectionId: string, fieldId: string) => {
    setDraggedField({ sectionId, fieldId });
  };

  const handleDrop = (targetSectionId: string, targetFieldId: string) => {
    if (!draggedField) return;
    const sourceSection = sections.find(s => s.id === draggedField.sectionId);
    const field = sourceSection?.fields.find(f => f.id === draggedField.fieldId);
    if (!field) return;
    setSections(prev => prev.map(s => {
      if (s.id === draggedField.sectionId && s.id === targetSectionId) {
        const fields = [...s.fields];
        const fromIdx = fields.findIndex(f => f.id === draggedField.fieldId);
        const toIdx = fields.findIndex(f => f.id === targetFieldId);
        fields.splice(fromIdx, 1);
        fields.splice(toIdx, 0, field);
        return { ...s, fields };
      }
      return s;
    }));
    setDraggedField(null);
  };

  const handleSave = () => {
    const request = editId
      ? axiosClient.patch(`provider/${userId}/forms/${editId}`, { name: formName, sections })
      : axiosClient.post(`provider/${userId}/forms`, { name: formName, sections });

    request
      .then((res) => {
        if (res.status === 200 || res.status === 201) {
          toast.success("Form saved successfully!");
          router.push("/forms");
        }
      })
      .catch(() => toast.error("Could not save form"));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Edit field modal */}
      {editingField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="font-bold text-lg mb-4">Edit Field</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium">Label</label>
                <input
                  defaultValue={editingField.field.label}
                  onChange={(e) => setEditingField({ ...editingField, field: { ...editingField.field, label: e.target.value } })}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  defaultValue={editingField.field.type}
                  onChange={(e) => setEditingField({ ...editingField, field: { ...editingField.field, type: e.target.value as FieldType } })}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                >
                  {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={editingField.field.required}
                  onChange={(e) => setEditingField({ ...editingField, field: { ...editingField.field, required: e.target.checked } })}
                />
                <label className="text-sm">Required field</label>
              </div>
              {editingField.field.type === "select" && (
                <div>
                  <label className="text-sm font-medium">Options (comma separated)</label>
                  <input
                    defaultValue={editingField.field.options?.join(", ")}
                    onChange={(e) => setEditingField({ ...editingField, field: { ...editingField.field, options: e.target.value.split(",").map(o => o.trim()) } })}
                    className="w-full p-2 border border-gray-300 rounded mt-1"
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditingField(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => updateField(editingField.sectionId, editingField.field.id, editingField.field)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/forms")} className="text-gray-500 hover:text-gray-700">← Back</button>
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="text-xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={addSection} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">+ Add Section</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {editId ? "Update Form" : "Save Form"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
              <input
                value={section.title}
                onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                className="font-semibold text-gray-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-200 rounded px-1"
              />
              <button onClick={() => deleteSection(section.id)} className="text-red-400 hover:text-red-600 text-sm">Remove section</button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Prescription section: special preview, no field builder */}
              {section.isPrescription ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                    This section renders a full medication builder when filling the form — drug name, frequency, duration, and special instructions per medication.
                  </div>
                  {/* Static preview of what it'll look like */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-60 pointer-events-none select-none flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Diagnosis / Indication</p>
                      <div className="h-8 bg-gray-200 rounded w-full" />
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600">Medication 1</p>
                        <div className="h-4 w-12 bg-gray-200 rounded" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-8 bg-gray-200 rounded" />
                        <div className="h-8 bg-gray-200 rounded" />
                        <div className="h-8 bg-gray-200 rounded" />
                        <div className="h-8 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-36 bg-blue-100 rounded" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Additional Notes</p>
                      <div className="h-16 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {section.fields.map((field) => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={() => handleDragStart(section.id, field.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(section.id, field.id)}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-grab group"
                    >
                      <span className="text-gray-400 cursor-grab">⠿</span>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{field.label}</span>
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                        <span className="ml-2 text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                          {fieldTypes.find(t => t.value === field.type)?.label}
                        </span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingField({ sectionId: section.id, field })}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteField(section.id, field.id)}
                          className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {addingFieldTo === section.id ? (
                    <div className="border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 flex flex-col gap-3">
                      <div className="flex gap-3">
                        <input
                          placeholder="Field label"
                          onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                          className="flex-1 p-2 border border-gray-300 rounded text-sm"
                        />
                        <select
                          onChange={(e) => setNewField({ ...newField, type: e.target.value as FieldType })}
                          className="p-2 border border-gray-300 rounded text-sm"
                        >
                          {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      {newField.type === "select" && (
                        <input
                          placeholder="Options (comma separated)"
                          onChange={(e) => setNewField({ ...newField, options: e.target.value.split(",").map(o => o.trim()) })}
                          className="p-2 border border-gray-300 rounded text-sm"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <input type="checkbox" onChange={(e) => setNewField({ ...newField, required: e.target.checked })} />
                        <label className="text-sm">Required</label>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => addField(section.id)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Field</button>
                        <button onClick={() => setAddingFieldTo(null)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingFieldTo(section.id)}
                      className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                    >
                      + Add field
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <button
          onClick={addSection}
          className="w-full py-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          + Add new section
        </button>
      </div>
    </div>
  );
}

export default function FormBuilder() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <FormBuilderInner />
    </Suspense>
  );
}
