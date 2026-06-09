"use client";

import AppointmentForm, {
  AppointmentFormValues,
} from "@/components/AppointmentForm";
import { Button } from "@veridoctor/design/components";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@veridoctor/design/components";
import {
  DataTable,
  DatatableActions,
  DatatableColumnHeader,
  DatatableFilterTabs,
  DialogModal,
} from "@veridoctor/design/shared";
import { axiosClient } from "@veridoctor/api-client";
import { LucideVideo } from "@veridoctor/design/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { RootState } from "../../store";

type Appointment = {
  id: string;
  patient_name: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
  appointment_type: "virtual" | "physical";
  start_time: string;
  end_time: string;
  status: string;
  meet_id: string;
};

const emptyForm: AppointmentFormValues = {
  patient_first_name: "",
  patient_last_name: "",
  patient_phone_number: "",
  patient_email: "",
  date: "",
  time: "",
  message: "",
  appointment_type: "virtual",
};

export default function Appointments() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [loading, setLoading] = useState(false);
  const [appointmentTime, setAppointmentTime] = useState<"now" | "later">("now");
  const [formValues, setFormValues] = useState<AppointmentFormValues>(emptyForm);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const filter = searchParams.get("filter") ?? "today";
  const appointmentType = searchParams.get("appointment_type") ?? "";

  const joinCall = (meetId: string) => {
    router.push(`/calls/${meetId}`);
  };

const isJoinEnabled = (startTime: string) => {
  const appointmentDate = new Date(startTime);
  const now = new Date();
  return appointmentDate.toDateString() === now.toDateString();
};

  const tableRows: {
    name: string;
    date: string;
    status: string;
    call: ReactNode;
  }[] = appointments.map((appointment) => ({
    name: appointment.patient_name,
    date: new Date(appointment.start_time).toLocaleString(),
    status: appointment.status,
    call:
      appointment.appointment_type === "virtual" ? (
        <Button
          size="sm"
          variant="rounded"
          onClick={() => joinCall(appointment.meet_id)}
          disabled={!isJoinEnabled(appointment.start_time)}
        >
          <LucideVideo /> Join call
        </Button>
      ) : (
        "Physical"
      ),
  }));

  const tableColumns: DatatableColumnHeader[] = [
    { name: "Patient Name", type: "string", key: "name" },
    { name: "Date/Time", type: "string", key: "date" },
    { name: "Status", type: "string", key: "status" },
    { name: "Call", type: "string", key: "call" },
  ];

  const fetchAppointments = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("filter", filter);
    if (appointmentType) params.set("appointment_type", appointmentType);

    axiosClient
      .get(`provider/${userId}/appointments?${params.toString()}`)
      .then((res) => setAppointments(res.data))
      .catch(() => toast.error("Could not load appointments"))
      .finally(() => setLoading(false));
  }, [appointmentType, filter, userId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filterTabs: DatatableFilterTabs = {
    tabs: [
      {
        name: "Today",
        value: "today",
        action: (filter) => updateQueryParams("filter", filter),
      },
      {
        name: "Upcoming",
        value: "upcoming",
        action: (filter) => updateQueryParams("filter", filter),
      },
      {
        name: "Past",
        value: "past",
        action: (filter) => updateQueryParams("filter", filter),
      },
    ],
    defaultTab: filter,
  };

  const actions: DatatableActions = {
    primary: [
      {
        name: "view",
        action: () => toast.info("Appointment details are not available yet"),
      },
    ],
    secondary: [
      {
        name: "cancel",
        action: () => toast.info("Cancel appointment is not available yet"),
      },
      {
        name: "reschedule",
        action: () => toast.info("Reschedule appointment is not available yet"),
      },
    ],
  };

  const updateQueryParams = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const getStartTime = () => {
    if (appointmentTime === "now") return new Date().toISOString();
    if (!formValues.date || !formValues.time) return "";
    return new Date(`${formValues.date}T${formValues.time}`).toISOString();
  };

  const handleSaveAppointment = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!userId) {
        toast.error("Please sign in before creating an appointment");
        return reject();
      }
      const startTime = getStartTime();
      if (!formValues.patient_first_name || !formValues.patient_last_name) {
        toast.error("Patient first and last name are required");
        return reject();
      }
      if (!startTime) {
        toast.error("Please choose the appointment date and time");
        return reject();
      }
      setLoading(true);
      axiosClient
        .post(`provider/${userId}/appointments`, {
          patient_first_name: formValues.patient_first_name,
          patient_last_name: formValues.patient_last_name,
          patient_phone_number: formValues.patient_phone_number,
          patient_email: formValues.patient_email,
          appointment_type: formValues.appointment_type,
          start_time: startTime,
          message: formValues.message,
        })
        .then((res) => {
          toast.success("Appointment created");
          setFormValues(emptyForm);
          setAppointments((current) => [res.data, ...current]);
          resolve();
        })
        .catch(() => {
          toast.error(
            "An error occurred while submitting your appointment. Please try again later",
          );
          reject();
        })
        .finally(() => setLoading(false));
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Appointments</h1>
          <p className="text-gray-600 mt-2">Manage your appointments here.</p>
        </div>
        <DialogModal
          title="Add a new appointment"
          description="Create a new appointment"
          trigger={<p>New appointment</p>}
          onSave={handleSaveAppointment}
        >
          <div>
            <Tabs
              defaultValue="now"
              onValueChange={(value) =>
                setAppointmentTime(value === "schedule" ? "later" : "now")
              }
            >
              <TabsList variant="line">
                <TabsTrigger value="now">now</TabsTrigger>
                <TabsTrigger value="schedule">Later</TabsTrigger>
              </TabsList>
              <TabsContent value="now">
                <AppointmentForm
                  time="now"
                  values={formValues}
                  setValues={setFormValues}
                />
              </TabsContent>
              <TabsContent value="schedule">
                <AppointmentForm
                  time="later"
                  values={formValues}
                  setValues={setFormValues}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogModal>
      </div>
      <DataTable
        rows={tableRows}
        columns={tableColumns}
        isLoading={loading}
        filterTabs={filterTabs}
        tableActions={actions}
      />
    </div>
  );
}
