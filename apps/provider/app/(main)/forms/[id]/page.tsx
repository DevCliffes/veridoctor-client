"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
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
};

type Form = {
  id: string;
  name: string;
  sections: Section[];
  created_at: string;
};

export default function FormDetailPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  const handleRename = () => {
    if (!newName.trim()) return;
    axiosClient
      .patch(`provider/${userId}/forms/${formId}`, { name: newName })
      .then((res) => {
        setForm(res.data);
        setEditingName(false);
        toast.success("Form renamed");
      })
      .catch(() => toast.error("Could not rename form"));
  };

  const handleDelete = () => {
    if (!confirm("Delete this form? This cannot be undone.")) return;
    setDeleting(true);
    axiosClient
      .delete(`provider/${userId}/forms/${formId}`)
      .then(() => {
        toast.success("Form deleted");
        router.push("/forms");
      })
      .catch(() => {
        toast.error("Could not delete form");
        setDeleting(false);
      });
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!form) return <div className="p-6">Form not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/forms")} className="text-gray-500 hover:text-gray-700">← Back</button>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xl font-bold border border-blue-300 rounded px-2 py-1 outline-none"
                autoFocus
              />
              <button onClick={handleRename} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              <button onClick={() => setEditingName(false)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{form.name}</h1>
              <button onClick={() => setEditingName(true)} className="text-xs px-2 py-1 text-gray-500 hover:text-blue-600">✏️ Rename</button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/forms/new?edit=${formId}`)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Edit Form
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Form"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6">
        {form.sections?.map((section) => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b px-4 py-3">
              <h2 className="font-semibold text-gray-800">{section.title}</h2>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {section.fields?.map((field) => (
                <div key={field.id} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === "textarea" && <textarea className="w-full p-2 border border-gray-300 rounded text-sm" rows={3} />}
                  {field.type === "text" && <input type="text" className="w-full p-2 border border-gray-300 rounded text-sm" />}
                  {field.type === "number" && <input type="number" className="w-full p-2 border border-gray-300 rounded text-sm" />}
                  {field.type === "date" && <input type="date" className="w-full p-2 border border-gray-300 rounded text-sm" />}
                  {field.type === "checkbox" && <input type="checkbox" className="w-4 h-4" />}
                  {field.type === "select" && (
                    <select className="w-full p-2 border border-gray-300 rounded text-sm">
                      <option value="">Select...</option>
                      {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
