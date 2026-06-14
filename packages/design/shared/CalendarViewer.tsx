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
import { ChevronDown, ChevronLeft, ChevronRight, X, Trash2, Pencil } from "lucide-react";

type ViewMode = "day" | "week" | "month";

interface Appointment {
  id: string;
  start: Date;
  end: Date;
  patientName: string;
  meta?: Record<string, unknown>;
}

interface CalendarViewerProps {
  appointments: Appointment[];
  onDayClick?: (date: Date) => void;
  onEventClick?: (appointment: Appointment) => void;
}

const EVENT_COLORS = [
  "bg-blue-500 text-white",
  "bg-green-600 text-white",
  "bg-purple-500 text-white",
  "bg-orange-400 text-white",
  "bg-pink-500 text-white",
  "bg-teal-500 text-white",
];

function CalendarViewer({ appointments, onDayClick, onEventClick }: CalendarViewerProps) {
  const [view, setView] = React.useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  });

  const weekDayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const nameColorMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    let i = 0;
    appointments.forEach((a) => {
      if (!map[a.patientName]) {
        map[a.patientName] = EVENT_COLORS[i % EVENT_COLORS.length];
        i++;
      }
    });
    return map;
  }, [appointments]);

  return (
    <div className="rounded-lg border bg-white mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="ml-2 px-3 py-1 text-xs border rounded-md hover:bg-gray-50 transition-colors">
            Today
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm">
            <span className="capitalize">{view}</span>
            <ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setView("month")}>Month</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("week")}>Week</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("day")}>Day</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {weekDayLabels.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      {view === "month" && (
        <div className="grid grid-cols-7" style={{ gridAutoRows: "120px" }}>
          {days.map((day, idx) => {
            const dayAppts = appointments.filter((a) => isSameDay(a.start, day));
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();

            return (
              <div
                key={day.toString()}
                onClick={() => onDayClick?.(day)}
                className={`border-r border-b flex flex-col cursor-pointer hover:bg-gray-50/80 transition-colors overflow-hidden
                  ${idx % 7 === 6 ? "border-r-0" : ""}
                  ${!isCurrentMonth ? "bg-gray-50/40" : "bg-white"}
                `}
              >
                <div className="px-2 pt-1.5 pb-0.5">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? "bg-blue-600 text-white" : isCurrentMonth ? "text-gray-700" : "text-gray-300"}`}>
                    {format(day, "d")}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 px-1 overflow-hidden">
                  {dayAppts.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick?.(a); }}
                      className={`text-xs px-1.5 py-0.5 rounded font-medium truncate text-left w-full
                        ${nameColorMap[a.patientName] ?? "bg-blue-500 text-white"}
                        hover:opacity-80 transition-opacity`}
                      title={`${a.patientName} · ${format(a.start, "HH:mm")}–${format(a.end, "HH:mm")}`}
                    >
                      {format(a.start, "HH:mm")} {a.patientName}
                    </button>
                  ))}
                  {dayAppts.length > 3 && (
                    <div className="text-xs text-gray-400 px-1.5">+{dayAppts.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "week" && (
        <div className="p-8 text-center text-sm text-gray-400">Week view coming soon</div>
      )}
      {view === "day" && (
        <div className="p-8 text-center text-sm text-gray-400">Day view coming soon</div>
      )}
    </div>
  );
}

export { CalendarViewer };
export type { CalendarViewerProps, Appointment };
