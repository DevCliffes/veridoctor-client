import { Button } from "@veridoctor/design/components";
import { LucideVideo } from "@veridoctor/design/icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Appointment } from "../../app/(main)/dashboard/page";

interface TodayScheduleProps {
  appointments: Appointment[];
  nextVirtual?: Appointment;
  loading: boolean;
  onNavigate: (path: string) => void;
}

const statusBadge = (status: Appointment["status"]) => {
  const styles: Record<Appointment["status"], string> = {
    confirmed: "bg-green-100 text-green-800",
    pending: "bg-amber-100 text-amber-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const typeBadge = (type: Appointment["appointment_type"]) =>
  type === "virtual" ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
      Virtual
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
      Physical
    </span>
  );

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const avatarColor = (name: string) => {
  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-teal-100 text-teal-800",
    "bg-purple-100 text-purple-800",
    "bg-amber-100 text-amber-800",
  ];
  return colors[name.charCodeAt(0) % colors.length];
};

const getCountdown = (startTime: string) => {
  const diff = new Date(startTime).getTime() - Date.now();
  if (diff < 0) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `in ${hrs}h`;
};

export function TodaySchedule({
  appointments,
  nextVirtual,
  loading,
  onNavigate,
}: TodayScheduleProps) {
  const router = useRouter();

  const joinCall = () => {
    if (!nextVirtual?.meet_id) {
      toast.info("No upcoming virtual appointment");
      onNavigate("/appointments?appointment_type=virtual");
      return;
    }
    onNavigate(`/calls/${nextVirtual.meet_id}`);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <p className="font-bold">Today&apos;s schedule</p>
        <button
          onClick={() => onNavigate("/schedule")}
          className="text-xs text-blue-600 hover:underline"
        >
          View full schedule →
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No appointments today</p>
          <Button
            variant="roundedOutline"
            className="mt-3"
            onClick={() => onNavigate("/appointments")}
          >
            + Schedule one
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {appointments.map((appt) => {
            const countdown = getCountdown(appt.start_time);
            const isNext =
              appt.appointment_type === "virtual" &&
              appt.id === nextVirtual?.id;

            return (
              <div
                key={appt.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${avatarColor(appt.patient_name)}`}
                >
                  {getInitials(appt.patient_name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {appt.patient_name}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    {typeBadge(appt.appointment_type)}
                    {statusBadge(appt.status)}
                  </div>
                </div>

                {/* Time + action */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    {new Date(appt.start_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {countdown && (
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                      {countdown}
                    </span>
                  )}
                </div>

                {/* Join button for next virtual */}
                {isNext && (
                  <Button variant="rounded" onClick={joinCall} className="ml-1">
                    <LucideVideo className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
