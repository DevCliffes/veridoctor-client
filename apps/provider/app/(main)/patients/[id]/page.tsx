"use client";

import { axiosClient } from "@veridoctor/api-client";
import {
  LucideArrowLeft,
  LucideCalendarCheck,
  LucideMail,
  LucidePhone,
  LucideUser,
  LucideChevronRight,
} from "@veridoctor/design/icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { RootState } from "../../../store";

type Appointment = {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_name: string;
  patient_email: string;
  patient_phone_number: string;
  appointment_type: "virtual" | "physical";
  start_time: string;
  end_time: string;
  status: string;
  meet_id: string;
  message: string;
};

export default function PatientPortal({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
  if (!userId) return;
  setLoading(true);
  axiosClient
    .get(`provider/${userId}/appointments/${params.id}`)
    .then(async (res) => {
      const appt: Appointment = res.data;
      setAppointment(appt);

      // Needs every appointment for this provider, across all pages, to
      // find every appointment belonging to this specific patient --
      // filter=all returns paginated results now, so loop on `next`.
      let url: string | null = `provider/${userId}/appointments?filter=all&page_size=100`;
      let results: Appointment[] = [];
      while (url) {
        const page = await axiosClient.get(url);
        results = results.concat(page.data?.results ?? []);
        url = page.data?.next ?? null;
      }
      setAllAppointments(results);
    })
    .catch(() => toast.error("Could not load patient data"))
    .finally(() => setLoading(false));
}, [userId, params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const patientAppointments = allAppointments
    .filter((a) => {
      if (!appointment) return false;
      // Match by email (most reliable) with name fallback
      if (appointment.patient_email && a.patient_email) {
        return a.patient_email.toLowerCase() === appointment.patient_email.toLowerCase();
      }
      return (
        a.patient_first_name === appointment.patient_first_name &&
        a.patient_last_name === appointment.patient_last_name
      );
    })
    .sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

  if (loading) {
    return (
      <div className="p-6 bg-card rounded-lg mx-4 text-muted-foreground">
        Loading patient data...
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6 bg-card rounded-lg mx-4 text-muted-foreground">
        Patient not found.
      </div>
    );
  }

  return (
    <div className="p-6 mx-4 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <LucideArrowLeft size={16} />
        Back to Appointments
      </button>

      {/* Patient Info Card */}
      <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-600 rounded-full p-3">
            <LucideUser size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {appointment.patient_first_name} {appointment.patient_last_name}
            </h1>
            <p className="text-sm text-muted-foreground capitalize">
              {appointment.appointment_type} Appointment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LucideMail size={16} />
            <span className="text-sm">
              {appointment.patient_email || "No email provided"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <LucidePhone size={16} />
            <span className="text-sm">
              {appointment.patient_phone_number || "No phone provided"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <LucideCalendarCheck size={16} />
            <span className="text-sm">
              {new Date(appointment.start_time).toLocaleString()}
            </span>
          </div>
        </div>

        {appointment.message && (
          <div className="bg-muted/50 rounded p-3 mt-2">
            <p className="text-xs text-muted-foreground mb-1 uppercase font-medium">
              Notes
            </p>
            <p className="text-sm text-foreground">{appointment.message}</p>
          </div>
        )}
      </div>

      {/* Appointment History */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Appointment History</h2>

        {patientAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No appointment history found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 px-2 font-semibold text-foreground">Date/Time</th>
                  <th className="py-3 px-2 font-semibold text-foreground">Type</th>
                  <th className="py-3 px-2 font-semibold text-foreground">Status</th>
                  <th className="py-3 px-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {patientAppointments.map((a, idx) => (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/appointments/${a.id}`)}
                    className={`cursor-pointer hover:bg-accent transition-colors ${
                      idx % 2 === 0 ? "bg-card" : "bg-muted/30"
                    } ${idx !== patientAppointments.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <td className="py-3 px-2 text-foreground">
                      {new Date(a.start_time).toLocaleString("en-KE", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        a.appointment_type === "virtual"
                          ? "bg-indigo-50 text-indigo-600"
                          : "bg-green-50 text-green-600"
                      }`}>
                        {a.appointment_type}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        a.status === "confirmed"
                          ? "bg-green-50 text-green-600"
                          : a.status === "cancelled"
                          ? "bg-red-50 text-red-600"
                          : "bg-yellow-50 text-yellow-600"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <LucideChevronRight size={14} className="text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
