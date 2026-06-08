import { Dispatch, SetStateAction } from "react";

export type AppointmentFormValues = {
  patient_first_name: string;
  patient_last_name: string;
  patient_phone_number: string;
  patient_email: string;
  date: string;
  time: string;
  message: string;
};

type AppointmentFormProps = {
  time: "now" | "later";
  values: AppointmentFormValues;
  setValues: Dispatch<SetStateAction<AppointmentFormValues>>;
};

export default function AppointmentForm({
  time,
  values,
  setValues,
}: AppointmentFormProps) {
  const updateValue = (name: keyof AppointmentFormValues, value: string) => {
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
            onChange={(event) =>
              updateValue("patient_first_name", event.target.value)
            }
          ></input>
        </div>
        <div>
          <label>Last name</label>
          <input
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Doe"
            value={values.patient_last_name}
            onChange={(event) =>
              updateValue("patient_last_name", event.target.value)
            }
          ></input>
        </div>
      </div>
      <label>Phone number</label>
      <input
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="0712345678"
        value={values.patient_phone_number}
        onChange={(event) =>
          updateValue("patient_phone_number", event.target.value)
        }
      ></input>
      <label>Email</label>
      <input
        type="email"
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="john@example.com"
        value={values.patient_email}
        onChange={(event) => updateValue("patient_email", event.target.value)}
      ></input>
      {time === "later" && (
        <>
          <label>Date/time for the appointment</label>
          <div className="flex gap-4">
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded"
              value={values.date}
              onChange={(event) => updateValue("date", event.target.value)}
            ></input>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded"
              value={values.time}
              onChange={(event) => updateValue("time", event.target.value)}
            ></input>
          </div>
        </>
      )}
      <label>Message to recepient</label>
      <textarea
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="Write a message to the recepient (optional)"
        value={values.message}
        onChange={(event) => updateValue("message", event.target.value)}
      ></textarea>
    </form>
  );
}
