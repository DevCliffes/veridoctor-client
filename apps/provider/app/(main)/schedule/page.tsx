"use client";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@veridoctor/design/components";
import {
  LucideCirclePlus,
  LucideCircleSlash,
  LucideCopy,
  LucidePlus,
} from "@veridoctor/design/icons";
import { CalendarViewer, DialogModal } from "@veridoctor/design/shared";
import { toast } from "sonner";

export default function Schedule() {
  const schedule = [
    { day: "Sun", start: "9:00am", end: "5:00pm" },
    { day: "Mon", start: "9:00am", end: "5:00pm" },
    { day: "Tue", start: "9:00am", end: "5:00pm" },
    { day: "Wed", start: "9:00am", end: "5:00pm" },
    { day: "Thu", start: "9:00am", end: "5:00pm" },
    { day: "Fri", start: "9:00am", end: "5:00pm" },
    { day: "Sat", isUnavailable: true },
  ];
  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-bold">Schedule</h1>
          <p className="text-gray-600 mt-2">Manage your schedule.</p>
        </div>
        <DialogModal
          title="Add To schedule"
          description="Add a work time to your schedule"
          trigger={
            <>
              <LucidePlus size={20} />
              Add to calendar
            </>
          }
          onSave={() => {
            toast.error("An error occurred while adding your schedule");
          }}
        >
          <form className="flex flex-col gap-2">
            <label>Title</label>
            <input
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="General Consultation"
            ></input>
            <label>Appointment duration</label>
            <Select>
              <SelectTrigger className="w-full max-w-48">
                <SelectValue placeholder="select a duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 Minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="1.5">1.5 hours</SelectItem>
              </SelectContent>
            </Select>
            <label>Availability</label>
            <div className="rounded-xl max-w-md">
              <div className="flex flex-col gap-1">
                {schedule.map((item) => (
                  <AvailabilityRow
                    key={item.day}
                    day={item.day}
                    startTime={item.start}
                    endTime={item.end}
                    isUnavailable={item.isUnavailable}
                  />
                ))}
              </div>
            </div>
          </form>
        </DialogModal>
      </div>
      <div>
        <CalendarViewer appointments={[]} />
      </div>
    </div>
  );
}

const AvailabilityRow = ({
  day,
  startTime,
  endTime,
  isUnavailable = false,
}: {
  day: string;
  startTime?: string;
  endTime?: string;
  isUnavailable?: boolean;
}) => {
  return (
    <div className="flex items-center h-12">
      {/* Day Label */}
      <span className="w-10 text-sm font-medium">{day}</span>

      {/* Time Range or Unavailable Text */}
      <div className="flex-1 flex items-center gap-2">
        {isUnavailable ? (
          <span className="text-sm">Unavailable</span>
        ) : (
          <>
            <input
              defaultValue={startTime}
              className="border rounded px-3 py-1.5 text-sm w-24 text-center"
            ></input>
            <span className="text-zinc-600">—</span>
            <input
              defaultValue={endTime}
              className="border rounded px-3 py-1.5 text-sm w-24 text-center"
            ></input>
          </>
        )}
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-3">
        {!isUnavailable && (
          <>
            <Button
              variant="roundedOutline"
              size="icon"
              className="cursor-pointer text-primary"
            >
              <LucideCircleSlash />
            </Button>
            <Button
              variant="roundedOutline"
              size="icon"
              className="cursor-pointer text-primary"
            >
              <LucideCirclePlus size={20} />
            </Button>
            <Button
              variant="roundedOutline"
              size="icon"
              className="cursor-pointer text-primary"
            >
              <LucideCopy size={18} />
            </Button>
          </>
        )}
        {isUnavailable && (
          <Button
            variant="roundedOutline"
            size="icon"
            className="cursor-pointer text-primary"
          >
            <LucideCirclePlus size={20} />
          </Button>
        )}
      </div>
    </div>
  );
};
