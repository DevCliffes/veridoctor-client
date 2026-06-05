"use client";

import AccordionEl from "@/components/AccordionEl";
import { Button, Card, CardHeader } from "@veridoctor/design/components";
import {
  Video,
  CalendarCheck,
  ChartLine,
  FileChartColumn,
  ArrowUpRight,
  CalendarRange,
  SearchCheck,
  ClipboardPen,
  MailCheck,
} from "@veridoctor/design/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { useAppSelector } from "../hooks";

/**  A list of features to be shown in the feature section */
const features: { name: string; description: string; icon: ReactNode }[] = [
  {
    name: "Telehealth Tools",
    description: "Access virtual consultations from the comfort of your home.",
    icon: <Video />,
  },
  {
    name: "Appointment management",
    description: "Book and manage appointments effortlessly.",
    icon: <CalendarCheck />,
  },
  {
    name: "Digital Marketplace",
    description:
      "Designed to bridge the gap between doctors, healthcare facilities, and patients.",
    icon: <ChartLine />,
  },
  {
    name: "Health Records Management",
    description: "Securely store and access your medical records anytime.",
    icon: <FileChartColumn />,
  },
];

export default function Home() {
  const [newsLetterEmail, setNewsLetterEmail] = useState<string>("");
  const router = useRouter();
  const handleNewsLetterEmailChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { value } = event.target;
    setNewsLetterEmail(value);
    // make api call to handle newseletter email
    console.log("THE NEWSLETTER EMAIL IS", newsLetterEmail);
  };
  return (
    <>
      {/* Hero section */}
      <div className="relative min-h-[80vh] flex pt-10 h-fit items-center lg:items-end justify-around lg:gap-10">
        <div className="relative min-h-[80vh] flex pt-10 h-fit items-center lg:items-end justify-around lg:gap-10">
          {/* <div className="absolute w-[60%] h-[80%] border rounded-full blur-3xl bg-pink-500/30 -z-20"></div> */}
          <div className="md:mx-8 lg:mx-20 lg:min-h-[50vh] py-8 px-4 text-center lg:text-left">
            <div className="text-2xl md:text-4xl xl:text-5xl font-bold max-w-[90vw] flex flex-col gap-4">
              <h1>
                Powering <span className="text-primary">Smarter,</span>
              </h1>
              <h1>
                More <span className="text-primary">Accessible</span>{" "}
                Healthcare.
              </h1>
            </div>
            <p className="max-w-[90vw] lg:max-w-[700px] mt-8 m-auto">
              Veri Doctor is a comprehensive digital healthcare platform that
              simplifies how patients access care and how healthcare providers
              deliver it.
            </p>
            {/* <p>We connect patients to verified doctors, clinics, and hospitals while equipping healthcare facilities with powerful tools to manage appointments, consultations, records, and operations—securely and efficiently.</p> */}
            <div className="w-full grid md:grid-cols-2 md:max-w-lg md:m-auto lg:mx-0 gap-4 mt-10 md:mt-20">
              <Button size={"lg"} onClick={() => router.push("/auth/signup")}>
                Get started <ArrowUpRight />
              </Button>

              <Button
                className="border-primary text-primary"
                variant={"outline"}
                size={"lg"}
                onClick={() => router.push("/auth/login")}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
        <div className="hidden -mb-2 lg:block min-w-1/3 w-[400px]">
          <Image
            src="/hero_img.png"
            alt="veridoctor hero image"
            className="hidden lg:block -z-10 lg:h-[430px] xl:h-[500px] xl:w-[400px] w-[400px] aspect-auto"
            width={330}
            height={430}
          />
        </div>
      </div>
      {/* Features section */}
      <div className="bg-blue-500 h-fit pb-12 text-white pt-8 px-2 md:p-4">
        <p className="text-2xl font-bold mb-5 text-center">Key features</p>
        <div className="flex flex-wrap justify-center items-center gap-4 w-full text-left">
          {/* <div className="w-full grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] justify-center"> */}
          {features.map((item, index) => (
            <Card key={index} className="max-w-[300px]">
              <CardHeader>
                <div className="text-6xl">{item.icon}</div>
                <p className="font-bold">{item.name}</p>
              </CardHeader>
              <div className="p-4">
                <p className="text-sm">{item.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-gray-200 text-center min-h-[300px] py-8 mt-8">
        <p className="text-2xl">It is this easy</p>
        <p className="font-bold text-2xl">Find, book, consult</p>
        <p className="font-extrabold text-5xl lg:text-7xl whitespace-nowrap overflow-x-hidden overflow-y-clip opacity-20 mt-8 w-full">
          VERI <span className="text-blue-600">DOCTOR</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Card className="bg-white p-2 rounded-lg text-center shadow-lg hover:bg-blue-300 w-[220px] h-[180px]">
            <SearchCheck className="m-auto text-blue-500" />
            <p className="font-bold text-lg">Find</p>
            <p className="text-sm">Search for a healthcare provider.</p>
          </Card>
          <Card className="bg-white p-2 rounded-lg text-center shadow-lg hover:bg-blue-300 w-[220px] h-[180px]">
            <CalendarRange className="m-auto text-blue-500" />
            <p className="font-bold text-lg">Book</p>
            <p className="text-sm">
              Book an appointment with a specialized healthcare provider.
            </p>
          </Card>
          <Card className="bg-white p-2 rounded-lg text-center shadow-lg hover:bg-blue-300 w-[220px] h-[180px]">
            <ClipboardPen className="text-4xl m-auto mb-2 text-blue-500" />
            <p className="font-bold text-lg">Consult</p>
            <p className="text-sm">Consult a verified healthcare provider.</p>
          </Card>
        </div>
      </div>
      <div className="m-auto mt-16">
        <p className="text-center font-bold text-2xl mb-4">FAQ</p>
        {/* TODO: check the ref issue with the accordion element */}
        <AccordionEl />
      </div>
      <div className="text-center mt-16">
        <p className="font-bold text-2xl">Don&apos;t miss out</p>
        <p className="">Subscribe to our newsletter</p>
        <div className="flex border-2 p-4 rounded-xl w-[300px] h-[48px] m-auto my-6 items-center">
          <MailCheck className="text-3xl" />
          <input
            onChange={(event) => handleNewsLetterEmailChange(event)}
            className="focus:outline-none ml-2 w-full"
            placeholder="Your email address"
          ></input>
        </div>
        {/* {validEmail(newsLetterEmail) ? (
          <Button
            onClick={() => alert(`Thank you for subscribing to our newsletter`)}
            className="rounded-md cursor-pointer py-5 px-8"
          >
            Subscribe
          </Button>
        ) : (
          <Button disabled className="rounded cursor-pointer py-5 px-8">
            Subscribe
          </Button>
        )} */}
      </div>
    </>
  );
}
