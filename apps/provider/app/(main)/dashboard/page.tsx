"use client";
import { Button } from "@veridoctor/design/components";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideArrowUpRight,
  LucidePlus,
  LucideVideo,
} from "@veridoctor/design/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { RootState } from "../../store";

interface GotoSectionButtonProps {
  onClick?: () => void;
}

const GotoSectionButton = ({
  onClick,
}: GotoSectionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      variant="roundedOutline"
      className="border-black w-10 h-10"
    >
      <LucideArrowUpRight />
    </Button>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [nextVirtualAppointment, setNextVirtualAppointment] = useState<{
    patient_name: string;
    start_time: string;
    meet_id: string;
  } | null>(null);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(
        `provider/${userId}/appointments?appointment_type=virtual&filter=upcoming`,
      )
      .then((res) => setNextVirtualAppointment(res.data?.[0] ?? null))
      .catch(() => setNextVirtualAppointment(null));
  }, [userId]);

  const joinNextCall = () => {
    if (!nextVirtualAppointment?.meet_id) {
      toast.info("Create a virtual appointment first");
      router.push("/appointments?appointment_type=virtual");
      return;
    }

    router.push(`/calls/${nextVirtualAppointment.meet_id}`);
  };

  return (
    <div className="p-4 rounded-lg mx-4">
      {/* top section */}
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-xl font-bold">Dashboard</p>
          <p>Plan and care for your patients with ease.</p>
        </div>
        <Button onClick={() => router.push("/appointments")}>
          <LucidePlus /> New appointment
        </Button>
      </div>
      {/* main dashboard section */}
      <div className="grid lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 grid md:grid-cols-2 lg:grid-cols-3 gap-4 container">
          {/* total patients served card */}
          <div className="bg-white shadow-md p-4 rounded-lg h-32 h-full flex flex-col gap-4">
            <p className="font-bold">Patients served.</p>
            <p className="text-4xl">23</p>
          </div>
          {/* upcoming appointments card */}
          <div className="shadow-md p-4 rounded-lg bg-white flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <p className="font-bold">Physical appointments.</p>
              <GotoSectionButton
                onClick={() =>
                  navigateTo("/appointments?appointment_type=physical")
                }
              />
            </div>
            <p>
              Appointment with <span className="font-bold">Michael B.</span>
            </p>
            <p>Today 8:30 PM</p>
          </div>
          {/* virtual appointments card */}
          <div className="shadow-md p-4 rounded-lg bg-white">
            <div className="flex justify-between items-center">
              <p className="font-bold">Virtual appointments.</p>
              <GotoSectionButton
                onClick={() =>
                  navigateTo("/appointments?appointment_type=virtual")
                }
              />
            </div>
            <div>
              <p>
                {nextVirtualAppointment?.patient_name ??
                  "No upcoming virtual appointment"}
              </p>
              <p>
                {nextVirtualAppointment
                  ? new Date(nextVirtualAppointment.start_time).toLocaleString()
                  : "Create an appointment to start a call"}
              </p>
              <Button variant="rounded" onClick={joinNextCall}>
                <LucideVideo /> Join call
              </Button>
            </div>
          </div>
          <div className="lg:col-span-2 shadow-md p-4 rounded-lg bg-white">
            <p className="font-bold">Weekly analysis</p>
            {/* TODO: Add bar chart here */}
            <p>43</p>
          </div>
          <div className="shadow-md p-4 rounded-lg bg-white">
            <div className="flex justify-between items-center">
              <p className="font-bold">Schedule.</p>
              <GotoSectionButton onClick={() => navigateTo("/schedule")} />
            </div>
            <p>Working today</p>
          </div>
        </div>
        {/* Appointments calendar card */}
        <div className="shadow-md p-4 bg-white row-span-2">
          <p className="font-bold">Appointment calendar</p>
        </div>
      </div>
    </div>
  );
}
