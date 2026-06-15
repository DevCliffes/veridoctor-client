"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import { LucidePlus } from "@veridoctor/design/icons";
import { MetricsRow } from "../../../components/dashboard/MetricsRow";
import { TodaySchedule } from "../../../components/dashboard/TodaySchedule";
import { PendingActions } from "../../../components/dashboard/PendingActions";
import { WeeklyChart } from "../../../components/dashboard/WeeklyChart";

// `identity` from Redux is normally a raw ID string (rehydrated from
// localStorage's "vd_identity"), but handle the object/JSON-string
// shapes too just in case.
function getIdentityId(identity: unknown): string {
  if (typeof identity === "string") {
    if (!identity) return "";
    try {
      const parsed = JSON.parse(identity);
      if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
        return parsed.id;
      }
    } catch {
      // not JSON — it's the raw identity ID itself
    }
    return identity;
  }
  if (identity && typeof identity === "object" && "id" in identity) {
    const val = (identity as Record<string, unknown>).id;
    if (typeof val === "string") return val;
  }
  return "";
}

interface ProviderProfile {
  first_name: string;
  last_name: string;
  title?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { identity } = useAppSelector((store) => store.auth);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);

  const identityId = getIdentityId(identity);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!identityId) return;
    axiosClient
      .get(`/provider/${identityId}/profile`)
      .then((res) => setProfile(res.data))
      .catch(() => {});
  }, [identityId]);

  const providerName = profile
    ? `${profile.title ? profile.title + " " : ""}${profile.first_name} ${profile.last_name}`
    : "";

  return (
    <div className="p-4 mx-4 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <p className="text-xl font-bold">
            {greeting}{providerName ? `, ${providerName}` : ""} 👋
          </p>
          <p className="text-gray-500 text-sm">
            {now.toLocaleDateString("en-KE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button onClick={() => router.push("/appointments")}>
          <LucidePlus /> New appointment
        </Button>
      </div>

      <MetricsRow identityId={identityId} />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <TodaySchedule identityId={identityId} />
          <WeeklyChart identityId={identityId} />
        </div>
        <div className="space-y-4">
          <PendingActions identityId={identityId} />
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-4 space-y-2">
            <p className="font-bold text-sm text-gray-500 uppercase tracking-wide">
              Quick actions
            </p>
            {[
              { label: "View services", path: "/services" },
              { label: "Patient records", path: "/appointments?filter=past" },
              { label: "My forms", path: "/forms" },
              { label: "Prescriptions", path: "/prescriptions" },
            ].map((item) => (
              <button
                key={item.path + item.label}
                onClick={() => router.push(item.path)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition-colors flex justify-between items-center"
              >
                {item.label}
                <span className="text-gray-400">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

