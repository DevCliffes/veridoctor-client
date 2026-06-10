"use client";
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

export default function Users() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

  const tableRows: { name: string; status: string }[] = [];

  const tableColumns: DatatableColumnHeader[] = [
    {
      name: "Name",
      type: "string",
      key: "name",
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
        name: "Active",
        value: "active",
        action: (filter) => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            updateQueryParams("filter", filter);
          }, 1000);
        },
      },
      {
        name: "Inactive",
        value: "inactive",
        action: (filter) => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            updateQueryParams("filter", filter);
          }, 1000);
        },
      },
    ],
    defaultTab: searchParams.get("filter") ?? "active",
  };

  const actions: DatatableActions = {
    primary: [
      {
        name: "view",
        action: () => {
          toast.error("An error occurred, please try again later");
        },
      },
      {
        name: "deactivate",
        variant: "destructive",
        action: () => {
          toast.error("An error occurred, please try again later");
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
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-gray-600 mt-2">Manage system users.</p>
        </div>
        <DialogModal
          title="Add a new user"
          description="Create a new user"
          trigger={<p>Add user</p>}
          onSave={() => {
            toast.error(
              "An error occured while creating the user. Please try again later",
            );
          }}
        >
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
          </form>
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
