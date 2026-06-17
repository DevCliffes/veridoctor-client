import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";

export type AppointmentFormValues = {
  patient_first_name: string;
  patient_last_name: string;
  patient_phone_number: string;
  patient_email: string;
  service_id: string | null;
  date: string;
  start_time: string;
  duration: number;
  message: string;
  appointment_type: "virtual" | "physical";
};

interface Service {
  id: string;
  name: string;
  estimated_duration: number;
}

interface Slot {
  start_time: string;
  end_time: string;
  service_id: string | null;
  service_name: string | null;
  location_type: "virtual" | "physical" | "both";
  duration_minutes: number;
}

type AppointmentFormProps = {
  userId: string;
  time: "now" | "later";
  values: AppointmentFormValues;
  setValues: Dispatch<SetStateAction<AppointmentFormValues>>;
};

const DURATIONS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppointmentForm({
  userId,
  time,
  values,
  setValues,
}: AppointmentFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const updateValue = (
    name: keyof AppointmentFormValues,
    value: string | number | null
  ) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  // Load the provider's own services so one can be attached to this booking
  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(`/provider/${userId}/services`)
      .then((res) => setServices(res.data ?? []))
      .catch(() => setServices([]));
  }, [userId]);

  // Once a date is picked in "later" mode, pull that day's slots
  useEffect(() => {
    if (time !== "later" || !userId || !values.date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    axiosClient
      .get(`/provider/${userId}/available-slots?date=${values.date}`)
      .then((res) => setSlots(res.data ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [time, userId, values.date]);

  // Filter what's shown by service + appointment type, same logic as the
  // patient-facing booking page
  const now = new Date();
  const filteredSlots = slots.filter((slot) => {
    if (new Date(slot.start_time) <= now) return false;
    if (
      values.service_id &&
      slot.service_id &&
      slot.service_id !== values.service_id
    )
      return false;
    if (
      slot.location_type !== "both" &&
      slot.location_type !== values.appointment_type
    )
      return false;
    return true;
  });

  const selectSlot = (slot: Slot) => {
    setValues((current) => ({
      ...current,
      start_time: slot.start_time,
      duration: slot.duration_minutes,
    }));
  };

  return (
    <form>
      <div className="flex gap-2">
        <div>
          <label>First name</label>
          <input
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="John"
            value={values.patient_first_name}
            onChange={(e) => updateValue("patient_first_name", e.target.value)}
          />
        </div>
        <div>
          <label>Last name</label>
          <input
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Doe"
            value={values.patient_last_name}
            onChange={(e) => updateValue("patient_last_name", e.target.value)}
          />
        </div>
      </div>

      <label>Phone number</label>
      <input
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="0712345678"
        value={values.patient_phone_number}
        onChange={(e) => updateValue("patient_phone_number", e.target.value)}
      />

      <label>Email</label>
      <input
        type="email"
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="john@example.com"
        value={values.patient_email}
        onChange={(e) => updateValue("patient_email", e.target.value)}
      />

      {services.length > 0 && (
        <div>
          <label>Service</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  updateValue(
                    "service_id",
                    values.service_id === s.id ? null : s.id
                  )
                }
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  values.service_id === s.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {s.name} · {s.estimated_duration}m
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label>Appointment type</label>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => updateValue("appointment_type", "virtual")}
            className={`flex-1 p-2 rounded border text-sm font-medium transition-colors ${
              values.appointment_type === "virtual"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            🎥 Virtual
          </button>
          <button
            type="button"
            onClick={() => updateValue("appointment_type", "physical")}
            className={`flex-1 p-2 rounded border text-sm font-medium transition-colors ${
              values.appointment_type === "physical"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            🏥 Physical
          </button>
        </div>
      </div>

      {time === "later" ? (
        <>
          <label>Date</label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded"
            value={values.date}
            onChange={(e) => {
              updateValue("date", e.target.value);
              updateValue("start_time", "");
            }}
          />

          <label>Available times</label>
          {!values.date ? (
            <p className="text-sm text-gray-400">
              Pick a date to see available times
            </p>
          ) : loadingSlots ? (
            <p className="text-sm text-gray-400">Loading available times...</p>
          ) : filteredSlots.length === 0 ? (
            <p className="text-sm text-gray-400">
              No available slots for this service, date and appointment type
            </p>
          ) : (
            <div className="flex gap-2 flex-wrap mt-1">
              {filteredSlots.map((slot) => (
                <button
                  key={slot.start_time}
                  type="button"
                  onClick={() => selectSlot(slot)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    values.start_time === slot.start_time
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {formatTime(slot.start_time)}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <label>Duration</label>
          <select
            className="w-full p-2 border border-gray-300 rounded mt-1"
            value={values.duration}
            onChange={(e) => updateValue("duration", Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </>
      )}

      <label>Message to recipient</label>
      <textarea
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="Write a message to the recipient (optional)"
        value={values.message}
        onChange={(e) => updateValue("message", e.target.value)}
      />
    </form>
  );
}
