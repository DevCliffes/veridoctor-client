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
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

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

const HOUR_HEIGHT = 60;

function CalendarViewer({
  appointments,
  onDayClick,
  onEventClick,
}: CalendarViewerProps) {
  const [view, setView] = React.useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [expandedDay, setExpandedDay] = React.useState<Date | null>(null);
  const [popoverAppt, setPopoverAppt] = React.useState<Appointment | null>(null);

  const popoverLocationType = popoverAppt?.meta?.location_type as
    | string
    | undefined;
  const popoverServiceName = popoverAppt?.meta?.service_name as
    | string
    | undefined;

  const goBack = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };
  const goForward = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const headerLabel = React.useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      const we = endOfWeek(currentDate);
      return `${format(ws, "MMM d")} \u2013 ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }, [view, currentDate]);

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

  const monthStart = startOfMonth(currentDate);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  });

  const weekStart = startOfWeek(currentDate);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate),
  });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const eventStyle = (appt: Appointment) => {
    const startMins = appt.start.getHours() * 60 + appt.start.getMinutes();
    const endMins = appt.end.getHours() * 60 + appt.end.getMinutes();
    const top = (startMins / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 20);
    return { top, height };
  };

  const handleEventClick = (appt: Appointment) => {
    if (onEventClick) {
      onEventClick(appt);
    } else {
      setPopoverAppt(appt);
    }
  };

  function TimeGrid({ days }: { days: Date[] }) {
    return (
      <div className="flex overflow-auto" style={{ maxHeight: "600px" }}>
        <div className="w-14 shrink-0 border-r">
          <div className="h-10 border-b" />
          {hours.map((h) => (
            <div
              key={h}
              className="border-b text-right pr-2 text-xs text-gray-400"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="-translate-y-2 inline-block">
                {h === 0
                  ? ""
                  : format(new Date().setHours(h, 0, 0, 0), "h a")}
              </span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayAppts = appointments.filter((a) => isSameDay(a.start, day));
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toString()}
              className="flex-1 min-w-0 border-r last:border-r-0"
            >
              <div
                className={
                  "h-10 border-b flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 " +
                  (isToday ? "bg-blue-50" : "")
                }
                onClick={() => onDayClick?.(day)}
              >
                <span className="text-xs text-gray-500 uppercase">
                  {format(day, "EEE")}
                </span>
                <span
                  className={
                    "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full " +
                    (isToday ? "bg-blue-600 text-white" : "text-gray-700")
                  }
                >
                  {format(day, "d")}
                </span>
              </div>

              <div className="relative">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-b border-gray-100"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}
                {dayAppts.map((appt) => {
                  const { top, height } = eventStyle(appt);
                  return (
                    <button
                      key={appt.id}
                      onClick={() => handleEventClick(appt)}
                      style={{ top, height, left: 2, right: 2 }}
                      className={
                        "absolute rounded text-xs px-1 py-0.5 text-left font-medium truncate hover:opacity-80 transition-opacity " +
                        (nameColorMap[appt.patientName] ?? "bg-blue-500 text-white")
                      }
                    >
                      {format(appt.start, "h:mm a")} {appt.patientName}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const expandedDayAppts = expandedDay
    ? appointments
        .filter((a) => isSameDay(a.start, expandedDay))
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    : [];

  return (
    <div className="rounded-lg border bg-white mt-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold min-w-[200px] text-center">
            {headerLabel}
          </h2>
          <button
            onClick={goForward}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={goToday}
            className="ml-2 px-3 py-1 text-xs border rounded-md hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm">
            <span className="capitalize">{view}</span>
            <ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setView("month")}>
              Month
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("week")}>
              Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("day")}>
              Day
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Month view */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {weekDayLabels.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-semibold text-gray-500 tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>
          <div
            className="grid grid-cols-7"
            style={{ gridAutoRows: "120px" }}
          >
            {monthDays.map((day, idx) => {
              const dayAppts = appointments.filter((a) =>
                isSameDay(a.start, day)
              );
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth =
                day.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={day.toString()}
                  onClick={() => onDayClick?.(day)}
                  className={
                    "border-r border-b flex flex-col cursor-pointer hover:bg-gray-50/80 transition-colors overflow-hidden " +
                    (idx % 7 === 6 ? "border-r-0 " : "") +
                    (!isCurrentMonth ? "bg-gray-50/40" : "bg-white")
                  }
                >
                  <div className="px-2 pt-1.5 pb-0.5">
                    <span
                      className={
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full " +
                        (isToday
                          ? "bg-blue-600 text-white"
                          : isCurrentMonth
                          ? "text-gray-700"
                          : "text-gray-300")
                      }
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-1 overflow-hidden">
                    {dayAppts.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(a);
                        }}
                        className={
                          "text-xs px-1.5 py-0.5 rounded font-medium truncate text-left w-full hover:opacity-80 transition-opacity " +
                          (nameColorMap[a.patientName] ??
                            "bg-blue-500 text-white")
                        }
                        title={
                          a.patientName +
                          " \u00b7 " +
                          format(a.start, "HH:mm") +
                          "\u2013" +
                          format(a.end, "HH:mm")
                        }
                      >
                        {format(a.start, "HH:mm")} {a.patientName}
                      </button>
                    ))}
                    {dayAppts.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDay(day);
                        }}
                        className="text-xs text-blue-500 hover:text-blue-700 hover:underline px-1.5 text-left"
                      >
                        +{dayAppts.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "week" && <TimeGrid days={weekDays} />}
      {view === "day" && <TimeGrid days={[currentDate]} />}

      {/* Expanded day popover */}
      {expandedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setExpandedDay(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-800 text-sm">
                {format(expandedDay, "EEEE, MMMM d, yyyy")}
              </h3>
              <button
                onClick={() => setExpandedDay(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-2 flex flex-col gap-1.5">
              {expandedDayAppts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    handleEventClick(a);
                    setExpandedDay(null);
                  }}
                  className={
                    "text-sm px-3 py-2 rounded-lg font-medium text-left hover:opacity-80 transition-opacity " +
                    (nameColorMap[a.patientName] ?? "bg-blue-500 text-white")
                  }
                >
                  {format(a.start, "h:mm a")} \u2013 {format(a.end, "h:mm a")}{" "}
                  \u00b7 {a.patientName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Patient details popover — shown when no onEventClick prop is passed */}
      {popoverAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setPopoverAppt(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-800 text-sm">
                Appointment Details
              </h3>
              <button
                onClick={() => setPopoverAppt(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div
                  className={
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 " +
                    (nameColorMap[popoverAppt.patientName] ??
                      "bg-blue-500 text-white")
                  }
                >
                  {popoverAppt.patientName
                    .split(" ")
                    .map((n) => n[0] ?? "")
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {popoverAppt.patientName}
                  </p>
                  <p className="text-xs text-gray-400">Patient</p>
                </div>
              </div>

              {/* Time */}
              <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Time
                </p>
                <p className="text-sm font-medium text-gray-700">
                  {format(popoverAppt.start, "EEEE, MMM d")}
                </p>
                <p className="text-sm text-gray-600">
                  {format(popoverAppt.start, "h:mm a")} \u2013{" "}
                  {format(popoverAppt.end, "h:mm a")}
                </p>
              </div>

              {/* Meta fields if available */}
              {popoverAppt.meta && (
                <div className="space-y-1.5">
                  {popoverLocationType && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">Type</p>
                      <span
                        className={
                          "text-xs px-2 py-0.5 rounded-full font-medium capitalize " +
                          (popoverLocationType === "virtual"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-green-100 text-green-700")
                        }
                      >
                        {popoverLocationType}
                      </span>
                    </div>
                  )}
                  {popoverServiceName && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">Service</p>
                      <p className="text-xs text-gray-700 font-medium">
                        {popoverServiceName}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CalendarViewer };
export type { CalendarViewerProps, Appointment };
