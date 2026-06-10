"use client";
import {
  DataTable,
  DatatableActions,
  DatatableColumnHeader,
  DatatableFilterTabs,
  DialogModal,
} from "@veridoctor/design/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@veridoctor/design/components";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function Appointments() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

  const tableRows: { name: string; date: string; status: string }[] = [];

  const tableColumns: DatatableColumnHeader[] = [
    { name: "Patient Name", type: "string", key: "name" },
    { name: "Date/Time", type: "string", key: "date" },
    { name: "Status", type: "string", key: "status" },
  ];

  const updateQueryParams = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const filterTabs: DatatableFilterTabs = {
    tabs: [
      {
        name: "Today",
        value: "pending",
        action: (filter) => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            updateQueryParams("filter", filter);
          }, 1000);
        },
      },
      {
        name: "Upcoming",
        value: "upcoming",
        action: (filter) => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            updateQueryParams("filter", filter);
          }, 1000);
        },
      },
    ],
    defaultTab: searchParams.get("filter") ?? "pending",
  };

  const actions: DatatableActions = {
    primary: [
      {
        name: "view",
        action: () => {
          toast.error("An error occurred, please try again later");
        },
      },
    ],
    secondary: [
      {
        name: "cancel",
        action: () => {
          toast.error(
            "An error occurred while canceling the appointment, please try again later"
          );
        },
      },
      {
        name: "reschedule",
        action: () => {
          toast.error(
            "An error occurred while rescheduling the appointment, please try again later"
          );
        },
      },
    ],
  };

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex flex-wrap gap-4 justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Appointments</h1>
          <p className="text-gray-600 mt-2">Manage your appointments here.</p>
        </div>
        <DialogModal
          title="Add a new appointment"
          description="Create a new appointment"
          trigger={<p>New appointment</p>}
          onSave={() => {
            toast.error(
              "An error occured while submitting your appointment. Please try again later"
            );
          }}
        >
          <div>
            <Tabs defaultValue="now">
              <TabsList variant="line">
                <TabsTrigger value="now">Now</TabsTrigger>
                <TabsTrigger value="schedule">Later</TabsTrigger>
              </TabsList>
              <TabsContent value="now">
                {/* <AppointmentForm time="now" /> */}
              </TabsContent>
              <TabsContent value="schedule">
                {/* <AppointmentForm time="later" /> */}
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
