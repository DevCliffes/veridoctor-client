"use client";
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
  const [loading, setLoading] = useState(false);
  // mock table data
  const tableRows: { name: string; date: string; status: string }[] = [];
  const tableColumns: DatatableColumnHeader[] = [
    {
      name: "Branch name",
      type: "string",
      key: "name",
    },
    {
      name: "Location",
      type: "string",
      key: "date",
    },
    {
      name: "Status",
      type: "string",
      key: "status",
    },
  ];

  const actions: DatatableActions = {
    primary: [
      {
        name: "view",
        action: () => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            toast.error(
              "An error occurred while retrieving branch information, please try again later",
            );
          }, 1000);
        },
      },
      {
        name: "deactivate",
        variant: "destructive",
        action: () => {
          toast.error(
            "An error occurred while retrieving branch information, please try again later",
          );
        },
      },
    ],
  };

  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Branches</h1>
          <p className="text-gray-600 mt-2">Manage your branches here.</p>
        </div>
        <DialogModal
          title="Add branch"
          description="Create a new branch"
          trigger={<p>Add branch</p>}
          onSave={() =>
            toast.error(
              "An error occured while creating the branch. Please try again later",
            )
          }
        >
          <form>
            <label>Name</label>
            <input
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Tibu medical center, kilimani"
            ></input>
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
          </form>
        </DialogModal>
      </div>
      <DataTable
        rows={tableRows}
        columns={tableColumns}
        isLoading={loading}
        tableActions={actions}
      />
    </div>
  );
}
