import { Button } from "@veridoctor/design/components";
import {
  LucideBarChart2,
  LucideCalendar,
  LucideVideo,
} from "@veridoctor/design/icons";
import Link from "next/link";
import { ReactNode } from "react";

const benefits: { name: string; icon: ReactNode; description: string }[] = [
  {
    name: "Telehealth Consultations",
    icon: <LucideVideo />,
    description: "See a doctor from anywhere.",
  },
  {
    name: "Effortless Appointment Booking",
    icon: <LucideCalendar />,
    description: "No more waiting in queues.",
  },
  {
    name: "Secure Health Records",
    icon: <LucideBarChart2 />,
    description: "All your medical history in one safe place.",
  },
];

const reasons: { description: string }[] = [
  {
    description: "Access quality healthcare, anytime, anywhere.",
  },
  {
    description: "Save time with simplified booking processes.",
  },
  {
    description:
      "Gain peace of mind with secure and reliable medical record management.",
  },
];
export default function ForPatients() {
  return (
    <>
      <div className="relative min-h-[50vh] md:min-h-[40vh] bg-[image:url('/afro_patient.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="flex flex-col gap-4 justify-end h-full text-white absolute inset-0 py-8 px-4">
          <p className="text-3xl md:text-5xl font-extrabold">
            Your health simplified
          </p>
          <p className="max-w-[800px] text-lg">
            With Veri Doctor, accessing quality healthcare has never been
            easier. Our platform connects you with trusted doctors and
            healthcare facilities, ensuring timely and reliable care for you and
            your loved ones.
          </p>
        </div>
      </div>
      {/* BENEFITS SECTION */}
      <div className="bg-white bg-clip-border min-h-[400px] flex justify-end flex-col">
        <div className="bg-blue-500 py-10 flex flex-col items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((item, index) => (
              <div
                key={index}
                className="h-[250px] bg-white p-4 rounded-lg w-[300px] mx-auto"
              >
                <div className="text-6xl">{item.icon}</div>
                <p className="font-bold text-lg">{item.name}</p>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* WHY CHOOSE US SECTION */}
      <div className="flex flex-col items-center flex-wrap gap-4 my-10 px-4">
        <h1 className="text-2xl md:text-4xl font-extrabold">
          Why Choose Veri Doctor?
        </h1>
        {reasons.map((item, index) => (
          <div key={index} className="flex flex-wrap gap-2 items-center">
            <div className="bg-blue-500 rounded-full w-[40px] h-[40px] flex items-center justify-center text-white font-bold text-lg">
              {index + 1}
            </div>
            <p className="w-[300px] md:w-[400px] text-lg">{item.description}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-4 px-4">
        <p className="text-xl md:text-4xl">
          Start Your Heathcare Journey Today With Veri Doctor
        </p>
        <Link href={"/auth/signup"}>
          <Button className="bg-blue-500 rounded-md p-6 w-fit cursor-pointer hover:px-8 hover:bg-blue-900 transition-all ease-in-out">
            Get started
          </Button>
        </Link>
      </div>
    </>
  );
}
