"use client";

import { axiosClient } from "@veridoctor/api-client";
import {
  DataTable,
  DatatableColumnHeader,
} from "@veridoctor/design/shared";
import {
  LucideArrowLeft,
  LucideCalendarCheck,
  LucideMail,
  LucidePhone,
  LucideUser,
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

    // Fetch the specific appointment by id
    axiosClient
      .get(`provider/${userId}/appointments/${params.id}`)
      .then((res) => {
        const appt: Appointment = res.data;
        setAppointment(appt);

        // Then fetch all appointments and filter by patient name
        return axiosClient.get(`provider/${userId}/appointments`);
      })
      .then((res) => {
        setAllAppointments(res.data);
      })
      .catch(() => toast.error("Could not load patient data"))
      .finally(() => setLoading(false));
  }, [userId, params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const patientAppointments = allAppointments.filter(
    (a) =>
      appointment &&
      a.patient_first_name === appointment.patient_first_name &&
      a.patient_last_name === appointment.patient_last_name
  );

  const tableColumns: DatatableColumnHeader[] = [
    { name: "Date/Time", type: "string", key: "date" },
    { name: "Type", type: "string", key: "type" },
    { name: "Status", type: "string", key: "status" },
  ];

  const tableRows = patientAppointments.map((a) => ({
    date: new Date(a.start_time).toLocaleString(),
    type: a.appointment_type,
    status: a.status,
  }));

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
      {/* Back button */}
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
            <h1 className="text-xl font-bold">{appointment.patient_name}</h1>
            <p className="text-sm text-gray-500 capitalize">
              {appointment.appointment_type} appointment
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
        <DataTable
          rows={tableRows}
          columns={tableColumns}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
