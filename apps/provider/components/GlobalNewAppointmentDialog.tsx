"use client";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@veridoctor/design/components";
import { DialogModal } from "@veridoctor/design/shared";
import { axiosClient } from "@veridoctor/api-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AppointmentForm, { AppointmentFormValues } from "./AppointmentForm";

const emptyForm: AppointmentFormValues = {
  patient_first_name: "",
  patient_last_name: "",
  patient_phone_number: "",
  patient_email: "",
  service_id: null,
  date: "",
  start_time: "",
  duration: 30,
  message: "",
  appointment_type: "virtual",
};

export function GlobalNewAppointmentDialog({ userId }: { userId: string }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [formValues, setFormValues] = useState<AppointmentFormValues>(emptyForm);
  const [appointmentTime, setAppointmentTime] = useState<"now" | "later">("now");

  useEffect(() => {
    const handler = () => triggerRef.current?.click();
    window.addEventListener("vd:new-appointment", handler);
    return () => window.removeEventListener("vd:new-appointment", handler);
  }, []);

  const getStartTime = () => {
    if (appointmentTime === "now") return new Date().toISOString();
    return formValues.start_time || "";
  };

  const getEndTime = (startTime: string) => {
    const end = new Date(startTime);
    end.setMinutes(end.getMinutes() + (formValues.duration ?? 30));
    return end.toISOString();
  };

  const handleSave = (): Promise<void> => {
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
        toast.error(
          appointmentTime === "later"
            ? "Please select an available time slot"
            : "Please choose the appointment date and time"
        );
        return reject();
      }
      axiosClient
        .post(`/provider/${userId}/appointments`, {
          patient_first_name: formValues.patient_first_name,
          patient_last_name: formValues.patient_last_name,
          patient_phone_number: formValues.patient_phone_number,
          patient_email: formValues.patient_email,
          service: formValues.service_id,
          appointment_type: formValues.appointment_type,
          start_time: startTime,
          end_time: getEndTime(startTime),
          message: formValues.message,
        })
        .then(() => {
          toast.success("Appointment created");
          setFormValues(emptyForm);
          router.refresh();
          resolve();
        })
        .catch((err) => {
          // Surface the backend's actual reason (e.g. "This time slot was
          // just booked by someone else...") instead of a generic message,
          // so a real scheduling conflict is distinguishable from an
          // actual server/network failure.
          const msg =
            err?.response?.data?.error ||
            "Failed to create appointment. Please try again.";
          toast.error(msg);
          reject();
        });
    });
  };

  return (
    <DialogModal
      title="Add a new appointment"
      description="Create a new appointment"
      trigger={
        <button ref={triggerRef} className="hidden" aria-hidden tabIndex={-1}>
          open
        </button>
      }
      onSave={handleSave}
    >
      <Tabs
        defaultValue="now"
        onValueChange={(value) =>
          setAppointmentTime(value === "schedule" ? "later" : "now")
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="now">Now</TabsTrigger>
          <TabsTrigger value="schedule">Later</TabsTrigger>
        </TabsList>
        <TabsContent value="now">
          <AppointmentForm
            userId={userId}
            time="now"
            values={formValues}
            setValues={setFormValues}
          />
        </TabsContent>
        <TabsContent value="schedule">
          <AppointmentForm
            userId={userId}
            time="later"
            values={formValues}
            setValues={setFormValues}
          />
        </TabsContent>
      </Tabs>
    </DialogModal>
  );
}
