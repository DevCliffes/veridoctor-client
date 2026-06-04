import { VariantProps } from "class-variance-authority";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
} from "../components";
import { Loader2, LucideMoreVertical } from "lucide-react";
import * as React from "react";

// TODO: add nested value source to show nested values
export type ColumnType = "string" | "number";
export type DatatableColumnHeader = {
  name: string;
  type: ColumnType;
  key: string;
};
export type DatatableFilterTabs = {
  tabs: {
    name: string;
    value: string;
    action: (filterValue: string) => any;
  }[];
  defaultTab: string;
};

type ButtonAction = {
  name: string;
  action: () => any;
  // TODO: find a better way of typechecknign the button variant
  variant?: string; // should be one of the allowed variant strings
};
export type DatatableActions = {
  primary?: ButtonAction[];
  secondary?: ButtonAction[];
};

export type DatatableProps = {
  rows: any[];
  columns: DatatableColumnHeader[];
  filterTabs?: DatatableFilterTabs;
  tableActions?: DatatableActions;
  isLoading: boolean;
};

function DataTable({
  rows,
  columns,
  filterTabs,
  isLoading,
  tableActions,
}: DatatableProps) {
  const hasPrimaryActions = (tableActions?.primary?.length ?? 0) > 0;
  const hasSecondaryActions = (tableActions?.secondary?.length ?? 0) > 0;

  return (
    <div className="relative min-h-52 overflow-x-auto">
      {filterTabs && (
        <Tabs defaultValue={filterTabs.defaultTab}>
          <TabsList variant="line">
            {filterTabs.tabs.map((tab, index) => (
              <TabsTrigger
                key={index}
                value={tab.value}
                onClick={() => tab.action(tab.value)}
              >
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* loader overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      <table className="min-w-full text-left text-sm whitespace-nowrap">
        <thead className="tracking-wider border-b-2 border-gray-200 bg-gray-100">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className="px-6 py-3 font-semibold text-gray-700"
              >
                {column.name}
              </th>
            ))}

            {(hasPrimaryActions || hasSecondaryActions) && (
              <th className="px-6 py-3">Actions</th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.length > 0
            ? rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-gray-200 hover:bg-gray-100"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      {row[col.key]}
                    </td>
                  ))}

                  {((tableActions && tableActions.primary) ||
                    (tableActions && tableActions.secondary)) && (
                    <td className="px-6 py-4 flex gap-2">
                      {tableActions.primary?.map((button, index) => (
                        <Button
                          variant={button.variant as any}
                          key={index}
                          size="sm"
                          onClick={button.action}
                        >
                          {button.name}
                        </Button>
                      ))}
                      {tableActions.secondary &&
                        tableActions.secondary?.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="hover:cursor-pointer items-center">
                              <LucideMoreVertical className="cursor-pointer" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {tableActions.secondary.map((button, index) => (
                                <DropdownMenuItem
                                  key={index}
                                  className="cursor-pointer"
                                  onClick={button.action}
                                >
                                  <p>{button.name}</p>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                    </td>
                  )}
                </tr>
              ))
            : !isLoading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="text-center py-10"
                  >
                    Nothing here for now.
                  </td>
                </tr>
              )}
        </tbody>
      </table>
    </div>
  );
}

export { DataTable };
