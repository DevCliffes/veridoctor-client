"use client";

import AppointmentForm from "@/components/AppointmentForm";
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function Appointments() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // appointments Loading state
  const [loading, setLoding] = useState(false);
  // mock table data
  const tableRows: { name: string; date: string; status: string }[] = [
    {
      name: "john Kamau",
      date: "12/13/2020",
      status: "pending",
    },
    {
      name: "john Kamau",
      date: "12/13/2020",
      status: "pending",
    },
    {
      name: "Mwirigi",
      date: "12/13/2020",
      status: "pending",
    },
  ];
  const tableColumns: DatatableColumnHeader[] = [
    {
      name: "Patient Name",
      type: "string",
      key: "name",
    },
    {
      name: "Date/Time",
      type: "string",
      key: "date",
    },
    {
      name: "Status",
      type: "string",
      key: "status",
    },
  ];

  const filterTabs: DatatableFilterTabs = {
    tabs: [
      {
        name: "Today",
        value: "pending",
        action: (filter) => {
          setLoding(true);
          setTimeout(() => {
            setLoding(false);
            updateQueryParams("filter", filter);
          }, 1000);
        },
      },
      {
        name: "Upcoming",
        value: "upcoming",
        action: (filter) => {
          setLoding(true);
          setTimeout(() => {
            setLoding(false);
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
          setLoding(true);
          setTimeout(() => {
            setLoding(false);
            toast.error(
              "An error occurred while retrieving branch information, please try again later",
            );
          }, 1000);
        },
      },
    ],
    secondary: [
      {
        name: "cancel",
        action: () => {
          setLoding(true);
          setTimeout(() => {
            setLoding(false);
            toast.error(
              "An error occurred while retrieving branch information, please try again later",
            );
          }, 1000);
        },
      },
      {
        name: "reschedule",
        action: () => {
          setLoding(true);
          setTimeout(() => {
            setLoding(false);
            toast.error(
              "An error occurred while retrieving branch information, please try again later",
            );
          }, 1000);
        },
      },
    ],
  };

  const updateQueryParams = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    router.replace(`${pathname}?${params.toString()}`);
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
          onSave={() =>
            toast.error(
              "An error occured while submitting your appointment. Please try again later",
            )
          }
        >
          <div>
            <Tabs defaultValue="now">
              <TabsList variant="line">
                <TabsTrigger value="now">now</TabsTrigger>
                <TabsTrigger value="schedule">Later</TabsTrigger>
              </TabsList>
              <TabsContent value="now">
                <AppointmentForm time="now" />
              </TabsContent>
              <TabsContent value="schedule">
                <AppointmentForm time="later" />
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
