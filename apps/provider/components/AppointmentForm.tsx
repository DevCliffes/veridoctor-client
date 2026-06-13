import { Dispatch, SetStateAction } from "react";

export type AppointmentFormValues = {
  patient_first_name: string;
  patient_last_name: string;
  patient_phone_number: string;
  patient_email: string;
  date: string;
  time: string;
  duration: number;
  message: string;
  appointment_type: "virtual" | "physical";
};

type AppointmentFormProps = {
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

export default function AppointmentForm({
  time,
  values,
  setValues,
}: AppointmentFormProps) {
  const updateValue = (name: keyof AppointmentFormValues, value: string | number) => {
    setValues((current) => ({ ...current, [name]: value }));
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

      {time === "later" && (
        <>
          <label>Date/time for the appointment</label>
          <div className="flex gap-4">
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded"
              value={values.date}
              onChange={(e) => updateValue("date", e.target.value)}
            />
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded"
              value={values.time}
              onChange={(e) => updateValue("time", e.target.value)}
            />
          </div>
        </>
      )}

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
