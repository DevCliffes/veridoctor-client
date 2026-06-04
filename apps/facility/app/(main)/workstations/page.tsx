"use client";
import { Badge, Button, Card } from "@veridoctor/design/components";
import {
  LucideChevronRight,
  LucideMonitorX,
  LucideUsers,
} from "@veridoctor/design/icons";
import { DialogModal } from "@veridoctor/design/shared";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  // fetch workstations from the backend
  const workStations = [
    {
      name: "Pharmacy",
      description: "workstation for pharmacists",
      is_active: true,
      users: 100,
      id: "456",
    },
    {
      name: "Triage",
      description: "workstation for pharmacists",
      is_active: true,
      users: 4,
      id: "234",
    },
    {
      name: "Billing",
      description: "workstation for pharmacists",
      is_active: false,
      users: 3,
      id: "123",
    },
  ];

  const goToWorkstationDetails = (workstationId: string) => {
    router.push(`/workstations/${workstationId}`);
  };
  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workstations</h1>
          <p className="text-gray-600">
            Manage your facility&apos;s workstations here.
          </p>
        </div>
        <DialogModal
          title="Add a user workstation"
          description="add a new workstation"
          trigger={<>Add workstation</>}
          onSave={() => alert("A save occurred")}
        >
          <form>
            <label>Workstation name</label>
            <input
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Pharmacy"
            ></input>

            <label>Description</label>
            <input
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="dispensing"
            ></input>
          </form>
        </DialogModal>
      </div>
      {workStations.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* <Button>Create one</Button> */}
          {workStations.map((station, index) => (
            <Card className="bg-white p-4 rounded-lg shadow-md" key={index}>
              <div className="flex gap-4 justify-between">
                <div className="flex gap-4">
                  <h2 className="text-lg font-semibold">{station.name}</h2>
                  {station.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
                <Button
                  variant={"roundedOutline"}
                  className="w-10 h-10"
                  onClick={() => goToWorkstationDetails(station.id)}
                >
                  <LucideChevronRight />
                </Button>
              </div>
              <p>{station.description}</p>
              <div className="flex justify-end">
                <div className="flex">
                  <LucideUsers />
                  <p className="rounded-full bg-primary w-6 h-6 text-white text-xs flex items-center justify-center">
                    {station.users > 99 ? "99+" : station.users}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 items-center">
          <LucideMonitorX className="text-primary" size={64} />
          <p>No workstations available</p>
        </div>
      )}
    </div>
  );
}
