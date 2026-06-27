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
      .then((res) => {
        const appt: Appointment = res.data;
        setAppointment(appt);
        // ← filter=all so past appointments are included in history
        return axiosClient.get(`provider/${userId}/appointments?filter=all`);
      })
      .then((res) => {
        setAllAppointments(res.data ?? []);
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
      <div className="p-6 bg-white rounded-lg mx-4 text-gray-500">
        Loading patient data...
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6 bg-white rounded-lg mx-4 text-gray-500">
        Patient not found.
      </div>
    );
  }

  return (
    <div className="p-6 mx-4 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
      >
        <LucideArrowLeft size={16} />
        Back to Appointments
      </button>

      {/* Patient Info Card */}
      <div className="bg-white rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-600 rounded-full p-3">
            <LucideUser size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {appointment.patient_first_name} {appointment.patient_last_name}
            </h1>
            <p className="text-sm text-gray-500 capitalize">
              {appointment.appointment_type} Appointment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-2 text-gray-600">
            <LucideMail size={16} />
            <span className="text-sm">
              {appointment.patient_email || "No email provided"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <LucidePhone size={16} />
            <span className="text-sm">
              {appointment.patient_phone_number || "No phone provided"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <LucideCalendarCheck size={16} />
            <span className="text-sm">
              {new Date(appointment.start_time).toLocaleString()}
            </span>
          </div>
        </div>

        {appointment.message && (
          <div className="bg-gray-50 rounded p-3 mt-2">
            <p className="text-xs text-gray-400 mb-1 uppercase font-medium">
              Notes
            </p>
            <p className="text-sm text-gray-700">{appointment.message}</p>
          </div>
        )}
      </div>

      {/* Appointment History */}
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Appointment History</h2>

        {patientAppointments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No appointment history found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="py-3 px-2 font-semibold text-gray-700">Date/Time</th>
                  <th className="py-3 px-2 font-semibold text-gray-700">Type</th>
                  <th className="py-3 px-2 font-semibold text-gray-700">Status</th>
                  <th className="py-3 px-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {patientAppointments.map((a, idx) => (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/appointments/${a.id}`)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    } ${idx !== patientAppointments.length - 1 ? "border-b border-gray-100" : ""}`}
                  >
                    <td className="py-3 px-2 text-gray-700">
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
                      <LucideChevronRight size={14} className="text-gray-300" />
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
