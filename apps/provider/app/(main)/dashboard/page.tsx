"use client";
import { useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { Button } from "@veridoctor/design/components";
import { LucidePlus } from "@veridoctor/design/icons";
import { useRouter } from "next/navigation";
import { MetricsRow } from "../../../components/dashboard/MetricsRow";
import { TodaySchedule } from "../../../components/dashboard/TodaySchedule";
import { PendingActions } from "../../../components/dashboard/PendingActions";
import { WeeklyChart } from "../../../components/dashboard/WeeklyChart";

export default function Dashboard() {
  const router = useRouter();
  const identity = useSelector((state: RootState) => state.auth.identity);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const firstName = identity?.first_name ?? "";

  return (
    <div className="p-4 mx-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <p className="text-xl font-bold">
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </p>
          <p className="text-gray-500 text-sm">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
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

      {/* Metrics — fetches its own data */}
      <MetricsRow />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <TodaySchedule />
          <WeeklyChart />
        </div>

        {/* Right col */}
        <div className="space-y-4">
          <PendingActions />

          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-4 space-y-2">
            <p className="font-bold text-sm text-gray-500 uppercase tracking-wide">
              Quick actions
            </p>
            {[
              { label: "View services", path: "/services" },
              { label: "Patient records", path: "/patients" },
              { label: "My forms", path: "/forms" },
              { label: "Prescriptions", path: "/forms" },
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
