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
};

type Capture = {
  id: string;
  form_id: string;
  form_name: string;
  values: Record<string, string | boolean>;
  created_at: string;
  updated_at: string;
};

type Form = {
  id: string;
  name: string;
  sections: Section[];
};

export default function CaptureViewPage() {
  const { id: appointmentId, captureId } = useParams<{ id: string; captureId: string }>();
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [form, setForm] = useState<Form | null>(null);
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
        // Load the form structure so we can render labels properly
        return axiosClient.get(`provider/${userId}/forms/${found.form_id}`);
      })
      .then((formRes) => {
        if (formRes) setForm(formRes.data);
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
        <button onClick={() => router.back()} className="mt-3 text-blue-600 text-sm hover:underline">← Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">←</button>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {capture.form_name || form?.name || "Capture"}
          </p>
          <p className="text-xs text-gray-400">
            Saved {new Date(capture.created_at).toLocaleString("en-KE")}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
        {form ? (
          // Render with form structure — shows labels properly
          form.sections.map((section) => (
            <div key={section.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
                <h2 className="font-semibold text-gray-800 text-sm">{section.title}</h2>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {section.fields.map((field) => {
                  const val = capture.values[field.id];
                  const isEmpty = val === undefined || val === "" || val === false;
                  return (
                    <div key={field.id} className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </p>
                      <p className={`text-sm ${isEmpty ? "text-gray-300 italic" : "text-gray-700"}`}>
                        {isEmpty
                          ? "Not filled"
                          : field.type === "checkbox"
                          ? (val ? "Yes" : "No")
                          : String(val)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          // Fallback — render raw key/value pairs if form structure unavailable
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Captured Data</h2>
            <div className="flex flex-col gap-3">
              {Object.entries(capture.values).map(([key, val]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{key}</p>
                  <p className="text-sm text-gray-700">{String(val)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
