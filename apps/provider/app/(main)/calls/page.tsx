"use client";
import {
  Badge,
  Button,
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@veridoctor/design/components";
import { LucideVideo, LucideVideoOff } from "@veridoctor/design/icons";
import { DialogModal } from "@veridoctor/design/shared";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Calls() {
  const router = useRouter();
  const calls = [
    {
      id: 1,
      patientName: "John Doe",
      date: "2024-06-15",
      time: "10:00 AM",
      status: "Scheduled",
    },
    {
      id: 2,
      patientName: "Jane Smith",
      date: "2024-06-16",
      time: "2:00 PM",
      status: "Completed",
    },
  ];
  const goToCall = (id: number) => {
    router.push(`/calls/${id}`);
  };
  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-bold">Calls</h1>
          <p className="text-gray-600 mt-2">
            Manage your telehealth calls here.
          </p>
        </div>
        <DialogModal
          title="Create a virtual call for now or later"
          description="Add a new virtual consultation"
          trigger={
            <div className="flex gap-2">
              <LucideVideo />
              <p>New call</p>
            </div>
          }
          onSave={() =>
            toast.error(
              "an error occurred while creating your call. Please try again later",
            )
          }
        >
          <div>
            <Tabs defaultValue="instant">
              <TabsList variant="line">
                <TabsTrigger value="instant">instant</TabsTrigger>
                <TabsTrigger value="schedule">schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="instant">
                <form>
                  <label>Patient name</label>
                  <input
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="John Doe"
                  ></input>
                  <label>Email</label>
                  <input
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="john@example.com"
                  ></input>
                  <label>Message to recepient</label>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Write a message to the recepient (optional)"
                  ></textarea>
                </form>
              </TabsContent>
              <TabsContent value="schedule">
                <form>
                  <label>Patient name</label>
                  <input
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="John Doe"
                  ></input>
                  <label>Email</label>
                  <input
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="john@example.com"
                  ></input>
                  <label>Date/time</label>
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
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </DialogModal>
      </div>
      <div className="flex justify-center">
        {calls.length > 0 ? (
          <div>
            {calls.map((call) => (
              <Card key={call.id} className="border rounded-lg p-4 m-2">
                <h2 className="text-lg font-bold">{call.patientName}</h2>
                <p className="text-gray-600">
                  {call.date} at {call.time}
                </p>

                <Badge
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    call.status === "Scheduled"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {call.status}
                </Badge>
                <Button onClick={() => goToCall(call.id)}>
                  <LucideVideo />
                  Join
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <LucideVideoOff className="text-primary" size={64} />
            <p>All clear for now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
