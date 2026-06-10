"use client";

// updated
import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import { LucidePlus } from "@veridoctor/design/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { MetricsRow } from "../../../components/dashboard/MetricsRow";
import { TodaySchedule } from "../../../components/dashboard/TodaySchedule";
import { PendingActions } from "../../../components/dashboard/PendingActions";
import { WeeklyChart } from "../../../components/dashboard/WeeklyChart";

export interface Appointment {
  id: string;
  patient_name: string;
  start_time: string;
  meet_id?: string;
  appointment_type: "virtual" | "physical";
  status: "confirmed" | "pending" | "cancelled";
}

export default function Dashboard() {
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalPatients, setTotalPatients] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!userId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [apptRes, statsRes] = await Promise.allSettled([
          axiosClient.get(
            `provider/${userId}/appointments?filter=upcoming&limit=10`
          ),
          axiosClient.get(`provider/${userId}/stats`),
        ]);

        if (apptRes.status === "fulfilled") {
          setAppointments(apptRes.value.data ?? []);
        }
        if (statsRes.status === "fulfilled") {
          setTotalPatients(statsRes.value.data?.total_patients ?? 0);
          setWeeklyCount(statsRes.value.data?.weekly_count ?? 0);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId]);

  const todayAppointments = appointments.filter((a) => {
    const d = new Date(a.start_time);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  const nextVirtual = appointments.find(
    (a) => a.appointment_type === "virtual" && new Date(a.start_time) > now
  );

  return (
    <div className="p-4 mx-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <p className="text-xl font-bold">
            {greeting} 👋
          </p>
          <p className="text-gray-500 text-sm">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            &nbsp;·&nbsp; {todayAppointments.length} patients today
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="roundedOutline"
            onClick={() => router.push("/appointments?appointment_type=virtual")}
          >
            New virtual
          </Button>
          <Button onClick={() => router.push("/appointments")}>
            <LucidePlus /> New appointment
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <MetricsRow
        totalPatients={totalPatients}
        todayCount={todayAppointments.length}
        weeklyCount={weeklyCount}
        loading={loading}
      />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Schedule — takes 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <TodaySchedule
            appointments={todayAppointments}
            nextVirtual={nextVirtual}
            loading={loading}
            onNavigate={(path) => router.push(path)}
          />
          <WeeklyChart weeklyCount={weeklyCount} loading={loading} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <PendingActions onNavigate={(path) => router.push(path)} />

          {/* Quick actions */}
          <div className="bg-white shadow-md rounded-lg p-4 space-y-2">
            <p className="font-bold text-sm text-gray-500 uppercase tracking-wide">
              Quick actions
            </p>
            {[
              { label: "View lab results", path: "/services" },
              { label: "Patient messages", path: "/patients" },
              { label: "My schedule", path: "/schedule" },
              { label: "Settings", path: "/settings" },
            ].map((item) => (
              <button
                key={item.path}
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

