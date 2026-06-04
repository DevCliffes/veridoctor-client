import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components";
import { ChevronDown } from "lucide-react";

type ViewMode = "day" | "week" | "month";
interface Appointment {
  id: string;
  start: Date;
  end: Date;
  patientName: string;
}

interface CalendarViewerProps {
  appointments: Appointment[];
}

const MOCK_APPOINTMENTS = [
  {
    id: "apt-1",
    patientName: "John Doe",
    start: new Date(2026, 1, 23, 9, 0), // Feb 23, 9:00 AM
    end: new Date(2026, 1, 23, 9, 30), // 30 min slot
    type: "Checkup",
    status: "confirmed",
  },
  {
    id: "apt-2",
    patientName: "Sarah Smith",
    start: new Date(2026, 1, 23, 14, 0), // Feb 23, 2:00 PM
    end: new Date(2026, 1, 23, 15, 0), // 1 hour slot
    type: "Follow-up",
    status: "pending",
  },
  {
    id: "apt-3",
    patientName: "Robert Chen",
    start: new Date(2026, 1, 24, 10, 0), // Feb 24, 10:00 AM
    end: new Date(2026, 1, 24, 11, 30),
    type: "Consultation",
    status: "confirmed",
  },
  {
    id: "apt-4",
    patientName: "Elena Rodriguez",
    start: new Date(2026, 1, 26, 11, 0), // Feb 26, 11:00 AM
    end: new Date(2026, 1, 26, 12, 0),
    type: "Emergency",
    status: "confirmed",
  },
];

function CalendarViewer({ appointments }: CalendarViewerProps) {
  appointments = MOCK_APPOINTMENTS;
  const [view, setView] = React.useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart)),
  });
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return (
    <div className="rounded-lg border bg-card">
      {/* Header with Navigation */}
      <div className="flex justify-between p-4 border-b">
        <h2 className="text-xl font-bold">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex gap-2 px-4 py-2 border-2 rounded-lg">
              <p>{view}</p>
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <p onClick={() => setView("day")}>Day</p>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <p onClick={() => setView("week")}>Week</p>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <p onClick={() => setView("month")}>Month</p>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Grid */}
      {view === "month" && (
        <div className="grid grid-cols-7 border-l border-t">
          {days.map((day) => {
            const dayAppointments = appointments.filter((apt) =>
              isSameDay(apt.start, day),
            );

            return (
              <div key={day.toString()} className="h-32 border-r border-b p-2">
                <span className="text-sm text-muted-foreground">
                  {format(day, "d")}
                </span>
                {dayAppointments.length > 0 && (
                  <div className="mt-2 bg-blue-100 text-blue-700 text-xs p-1 rounded">
                    {dayAppointments.length} Slots
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "week" && (
        <div>
          {/* days map */}
          {/* get specific weeks from the luxon library weeks in the current month */}
          <div className="grid grid-cols-7 text-center">
            {weekDays.map((day, index) => (
              <div key={day}>
                <p>{day}</p>
                <p>{index + 1}</p>
              </div>
            ))}
          </div>
          <div>
            <div></div>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CalendarViewer };
