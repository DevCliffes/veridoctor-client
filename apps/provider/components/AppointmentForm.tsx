export default function AppointmentForm({ time }: { time: "now" | "later" }) {
  return (
    <form>
      <div className="flex gap-2">
        <div>
          <label>First name</label>
          <input
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="John"
          ></input>
        </div>
        <div>
          <label>Last name</label>
          <input
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Doe"
          ></input>
        </div>
      </div>
      <label>Phone number</label>
      <input
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="0712345678"
      ></input>
      <label>Email</label>
      <input
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="john@example.com"
      ></input>
      {time === "later" && (
        <>
          <label>Date/time for the appointment</label>
          <div className="flex gap-4">
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="john@example.com"
            ></input>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="john@example.com"
            ></input>
          </div>
        </>
      )}
      <label>Message to recepient</label>
      <textarea
        className="w-full p-2 border border-gray-300 rounded"
        placeholder="Write a message to the recepient (optional)"
      ></textarea>
    </form>
  );
}
