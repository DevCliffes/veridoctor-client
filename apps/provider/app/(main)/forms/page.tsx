"use client";
import { useEffect, useState } from "react";
import { Button } from "@veridoctor/design/components";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";
import { axiosClient } from "@veridoctor/api-client";

type Form = {
  id: string;
  name: string;
  created_at: string;
  sections: any[];
};

export default function FormsPage() {
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(`provider/${userId}/forms`)
      .then((res) => setForms(res.data))
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <>
        <div className="flex justify-between">
          <div>
            <h1 className="text-xl font-bold">Forms</h1>
            <p className="text-gray-600 mt-2">
              Build forms you&apos;ll use to serve your patients.
            </p>
          </div>
          <Button onClick={() => router.push("forms/new")}>New form</Button>
        </div>
        <div className="mt-6">
          {loading ? (
            <p className="text-gray-400">Loading forms...</p>
          ) : forms.length === 0 ? (
            <p>You have no forms yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`forms/${form.id}`)}
                >
                  <div>
                    <h3 className="font-semibold">{form.name}</h3>
                    <p className="text-sm text-gray-500">
                      {form.sections?.length || 0} sections · Created{" "}
                      {new Date(form.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">View →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    </div>
  );
}
