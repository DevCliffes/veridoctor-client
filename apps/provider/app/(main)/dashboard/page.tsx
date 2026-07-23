"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import { LucidePlus } from "@veridoctor/design/icons";
import { MetricsRow } from "../../../components/dashboard/MetricsRow";
import { TodaySchedule } from "../../../components/dashboard/TodaySchedule";
import { PendingActions } from "../../../components/dashboard/PendingActions";
import { NewVsReturning } from "../../../components/dashboard/NewVsReturning";
import { CompletionRate } from "../../../components/dashboard/CompletionRate";
import { VirtualVsInPerson } from "../../../components/dashboard/VirtualVsInPerson";
import { RevenueByService } from "../../../components/dashboard/RevenueByService";
import { WeeklyChart } from "../../../components/dashboard/WeeklyChart";

function getIdentityId(identity: unknown): string {
  if (typeof identity === "string") {
    if (!identity) return "";
    try {
      const parsed = JSON.parse(identity);
      if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
        return parsed.id;
      }
    } catch {}
    return identity;
  }
  if (identity && typeof identity === "object" && "id" in identity) {
    const val = (identity as Record<string, unknown>).id;
    if (typeof val === "string") return val;
  }
  return "";
}

export interface DashboardStats {
  today_count: number;
  pending_count: number;
  this_week_appointments: number;
  total_patients_month: number;
  avg_duration_seconds: number;
  revenue_mtd: number;
  weekly_data: { date: string; day: string; count: number }[];
  new_patients_month: number;
  returning_patients_month: number;
  completed_count: number;
  no_show_count: number;
  cancelled_count: number;
  completion_rate: number;
  virtual_count: number;
  physical_count: number;
  revenue_by_service: { service_name: string; revenue: number }[];
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const identityId = useMemo(() => getIdentityId(identity), [identity]);

  const { greeting, dateLabel } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    return {
      greeting: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
      dateLabel: now.toLocaleDateString("en-KE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  }, []);

  useEffect(() => {
    if (!identityId) return;
    setStatsLoading(true);
    axiosClient
      .get(`/provider/${identityId}/dashboard/stats`)
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [identityId]);

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
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <p className="text-xl font-bold">
            {greeting}{providerName ? `, ${providerName}` : ""} 👋
          </p>
          <p className="text-gray-500 text-sm">{dateLabel}</p>
        </div>
        <Button onClick={() => window.dispatchEvent(new CustomEvent("vd:new-appointment"))}>
          <LucidePlus /> New appointment
        </Button>
      </div>

      <MetricsRow stats={stats} loading={statsLoading} />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <TodaySchedule identityId={identityId} />
          <WeeklyChart weeklyData={stats?.weekly_data ?? []} loading={statsLoading} />
        </div>
        <div className="space-y-4">
          <CompletionRate
            completedCount={stats?.completed_count ?? 0}
            noShowCount={stats?.no_show_count ?? 0}
            cancelledCount={stats?.cancelled_count ?? 0}
            completionRate={stats?.completion_rate ?? 0}
            loading={statsLoading}
          />
          <NewVsReturning
            newCount={stats?.new_patients_month ?? 0}
            returningCount={stats?.returning_patients_month ?? 0}
            loading={statsLoading}
          />
          <VirtualVsInPerson
            virtualCount={stats?.virtual_count ?? 0}
            physicalCount={stats?.physical_count ?? 0}
            loading={statsLoading}
          />
          <RevenueByService
            data={stats?.revenue_by_service ?? []}
            loading={statsLoading}
          />
          {/* FIX: previously showed 3 hardcoded, fake items (lab results,
              prescription renewals, patient messages) referencing features
              that don't exist in this system at all. Rebuilt to surface a
              real, existing workflow instead -- appointments that happened
              but whose capture form/notes were never completed. Each item
              links straight to that appointment's detail page. */}
          <PendingActions identityId={identityId} />
          <div className="bg-background text-foreground shadow-sm rounded-xl border border-border p-4 space-y-2">
            <p className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
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
                className="w-full text-left px-3 py-2 rounded-lg text-sm border border-border hover:bg-accent transition-colors flex justify-between items-center"
              >
                {item.label}
                <span className="text-muted-foreground">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
