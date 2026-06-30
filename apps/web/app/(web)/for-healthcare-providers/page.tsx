import type { Metadata } from "next";
import { Button } from "@veridoctor/design/components";
import {
  LucideCalendar,
  LucideEye,
  LucideLineChart,
  LucideVideo,
} from "@veridoctor/design/icons";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "For Healthcare Providers",
  description:
    "Join VeriDoctor to reach more patients with telehealth tools, streamlined scheduling, and secure digital health records — built for Kenyan healthcare providers.",
  alternates: {
    canonical: "https://veridoctor.com/for-healthcare-providers",
  },
};

const benefits: { name: string; icon: ReactNode; description: string }[] = [
  {
    name: "Telehealth Tools",
    icon: <LucideVideo />,
    description: "Serve patients beyond your geographic location.",
  },
  {
    name: "Streamlined Scheduling",
    icon: <LucideCalendar />,
    description: "Simplify appointment management for your team.",
  },
  {
    name: "Health Records Solutions",
    icon: <LucideLineChart />,
    description: "Provide your patients with secure, digital record-keeping.",
  },
  {
    name: "Increased Visibility",
    icon: <LucideEye />,
    description: " Expand your reach to a wider audience.",
  },
];

const reasons: { description: string }[] = [
  {
    description: "Improve patient care delivery with telehealth services.",
  },
  {
    description: "Optimize your operations with our efficient tools.",
  },
  {
    description: "Expand your practice and reach more patients.",
  },
];
export default function ForProviders() {
  return (
    <>
      <div className="relative min-h-[1000px] md:min-h-[40vh] bg-[image:url('/afro_doctors.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="flex flex-col justify-end h-full text-white absolute inset-0 py-8 px-4">
          <p className="text-3xl md:text-5xl font-extrabold">
            Expand Your Reach with Veri Doctor
          </p>
          <p className="max-w-[800px] text-lg">
            We&apos;re here to help healthcare providers connect with more
            patients, streamline operations, and improve the overall healthcare
            experience.
          </p>
        </div>
      </div>
      {/* BENEFITS SECTION */}
      <div className="bg-white bg-clip-border min-h-[400px] flex justify-end flex-col">
        <div className="bg-blue-500 py-10 flex flex-col items-center justify-center">
          <p className="text-white font-extrabold text-3xl mb-10">
            What we offer
          </p>
          <div className="flex gap-4 flex-wrap">
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
          Why partner with Veri Doctor?
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
          Join Veri Doctor today and transform your healthcare delivery!
        </p>
        <Link href={"/auth/signup"}>
          <Button className="bg-blue-500 rounded-md p-6 w-[250px] cursor-pointer hover:px-8 hover:bg-blue-900 transition-all ease-in-out">
            Get started
          </Button>
        </Link>
      </div>
    </>
  );
}
