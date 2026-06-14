import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "day" | "week" | "month";

interface Appointment {
  id: string;
  start: Date;
  end: Date;
  patientName: string;
}

interface CalendarViewerProps {
  appointments: Appointment[];
  onDayClick?: (date: Date) => void;
}

function CalendarViewer({ appointments, onDayClick }: CalendarViewerProps) {
  const [view, setView] = React.useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  });

  const weekDayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  return (
    <div className="rounded-lg border bg-card mt-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-bold min-w-[160px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex gap-2 px-4 py-2 border-2 rounded-lg capitalize">
            <p>{view}</p>
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setView("day")}>Day</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("week")}>Week</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("month")}>Month</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b">
        {weekDayLabels.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      {view === "month" && (
        <div className="grid grid-cols-7 border-l border-t">
          {days.map((day) => {
            const dayAppts = appointments.filter((a) => isSameDay(a.start, day));
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();

            return (
              <div
                key={day.toString()}
                onClick={() => onDayClick?.(day)}
                className={`h-28 border-r border-b p-2 flex flex-col cursor-pointer hover:bg-gray-50 transition-colors ${
                  !isCurrentMonth ? "bg-gray-50/50" : ""
                }`}
              >
                <span
                  className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium ${
                    isToday
                      ? "bg-blue-600 text-white"
                      : isCurrentMonth
                      ? "text-gray-700"
                      : "text-gray-300"
                  }`}
                >
                  {format(day, "d")}
                </span>

                {dayAppts.length > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayAppts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded truncate"
                        title={`${a.patientName} ${format(a.start, "HH:mm")}–${format(a.end, "HH:mm")}`}
                      >
                        {format(a.start, "HH:mm")} {a.patientName}
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <div className="text-xs text-gray-400 pl-1">
                        +{dayAppts.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Week view — placeholder */}
      {view === "week" && (
        <div className="p-6 text-center text-sm text-gray-400">
          Week view coming soon
        </div>
      )}

      {/* Day view — placeholder */}
      {view === "day" && (
        <div className="p-6 text-center text-sm text-gray-400">
          Day view coming soon
        </div>
      )}
    </div>
  );
}

export { CalendarViewer };
export type { CalendarViewerProps, Appointment };
