"use client";
import { useEffect, useState } from "react";
import { Button } from "@veridoctor/design/components";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { axiosClient } from "@veridoctor/api-client";
type Form = {
  id: string;
  name: string;
  created_at: string;
  sections: unknown[];
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
    <div className="p-4 bg-card rounded-lg">
      <>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Forms</h1>
            <p className="text-muted-foreground mt-2">
              Build forms you&apos;ll use to serve your patients.
            </p>
          </div>
          <Button onClick={() => router.push("forms/new")} className="w-full sm:w-auto">
            New form
          </Button>
        </div>
        <div className="mt-6">
          {loading ? (
            <p className="text-muted-foreground">Loading forms...</p>
          ) : forms.length === 0 ? (
            <p className="text-foreground">You have no forms yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="border border-border rounded-lg p-4 flex items-center justify-between hover:bg-accent cursor-pointer"
                  onClick={() => router.push(`forms/${form.id}`)}
                >
                  <div>
                    <h3 className="font-semibold text-foreground">{form.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {form.sections?.length || 0} sections · Created{" "}
                      {new Date(form.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-sm">View →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    </div>
  );
}
