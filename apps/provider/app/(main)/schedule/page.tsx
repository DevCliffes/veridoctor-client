"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { axiosClient } from "@veridoctor/api-client";
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

type Service = {
  id: string;
  name: string;
  estimated_duration: number;
};

const DEFAULT_SCHEDULE = [
  { day: "Sun", start: "9:00am", end: "5:00pm" },
  { day: "Mon", start: "9:00am", end: "5:00pm" },
  { day: "Tue", start: "9:00am", end: "5:00pm" },
  { day: "Wed", start: "9:00am", end: "5:00pm" },
  { day: "Thu", start: "9:00am", end: "5:00pm" },
  { day: "Fri", start: "9:00am", end: "5:00pm" },
  { day: "Sat", isUnavailable: true },
];

export default function Schedule() {
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<string>("");

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(`provider/${userId}/services`)
      .then((res) => {
        const data: Service[] = res.data ?? [];
        setServices(data);
      })
      .catch(() => {});
  }, [userId]);

  // When a service is selected, auto-fill duration from its estimated_duration
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      // Map to closest duration option
      const mins = svc.estimated_duration;
      if (mins <= 15) setSelectedDuration("15");
      else if (mins <= 30) setSelectedDuration("30");
      else if (mins <= 60) setSelectedDuration("60");
      else setSelectedDuration("90");
    }
  };

  const handleSave = () => {
    if (!selectedServiceId) {
      toast.error("Please select a service first");
      return;
    }
    // TODO: wire up actual schedule save API
    toast.error("An error occurred while adding your schedule");
  };

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
          onSave={handleSave}
        >
          <div className="flex flex-col gap-3">
            {/* Title — pulled from services */}
            <div>
              <label className="text-sm font-medium">Service / Title</label>
              {services.length === 0 ? (
                <p className="text-sm text-gray-400 mt-1 italic">
                  No services found.{" "}
                  <a href="/services" className="text-blue-600 hover:underline">
                    Add a service first →
                  </a>
                </p>
              ) : (
                <select
                  value={selectedServiceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mt-1 text-sm"
                >
                  <option value="">Select a service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Duration — auto-filled from service, but still editable */}
            <div>
              <label className="text-sm font-medium">Appointment duration</label>
              <Select
                value={selectedDuration}
                onValueChange={setSelectedDuration}
              >
                <SelectTrigger className="w-full max-w-48 mt-1">
                  <SelectValue placeholder="Select a duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div>
              <label className="text-sm font-medium">Availability</label>
              <div className="rounded-xl max-w-md mt-1">
                <div className="flex flex-col gap-1">
                  {DEFAULT_SCHEDULE.map((item) => (
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
            </div>
          </div>
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
      <span className="w-10 text-sm font-medium">{day}</span>

      <div className="flex-1 flex items-center gap-2">
        {isUnavailable ? (
          <span className="text-sm text-gray-400">Unavailable</span>
        ) : (
          <>
            <input
              defaultValue={startTime}
              className="border rounded px-3 py-1.5 text-sm w-24 text-center"
            />
            <span className="text-zinc-600">—</span>
            <input
              defaultValue={endTime}
              className="border rounded px-3 py-1.5 text-sm w-24 text-center"
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isUnavailable && (
          <>
            <Button variant="roundedOutline" size="icon" className="cursor-pointer text-primary">
              <LucideCircleSlash />
            </Button>
            <Button variant="roundedOutline" size="icon" className="cursor-pointer text-primary">
              <LucideCirclePlus size={20} />
            </Button>
            <Button variant="roundedOutline" size="icon" className="cursor-pointer text-primary">
              <LucideCopy size={18} />
            </Button>
          </>
        )}
        {isUnavailable && (
          <Button variant="roundedOutline" size="icon" className="cursor-pointer text-primary">
            <LucideCirclePlus size={20} />
          </Button>
        )}
      </div>
    </div>
  );
};
