"use client";

import { Button } from "@veridoctor/design/components";
import { LucideCog } from "@veridoctor/design/icons";
import Image from "next/dist/shared/lib/image-external";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";

export default function Home() {
  const [meetLink, setMeetLink] = useState("");
  const [dateTime, setDateTime] = useState<string>(
    new Date().toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const newDateTime = new Date().toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      });

      setDateTime(newDateTime);
    }, 60000);
    return () => {
      clearInterval(timer);
    };
  }, [dateTime]);

  const router = useRouter();

  const joinCall = () => {
    router.push(`/${meetLink}?userId=KISLDKSDIK`);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setMeetLink(value);
  };

  return (
    <div className="min-h-screen">
      {/* header */}
      <div className="p-4 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Image
            src="/favicon.ico"
            alt="Veridoctor Logo"
            width={50}
            height={50}
          />
          <p className="font-bold text-lg">Telehealth</p>
        </div>
        <div className="flex gap-4">
          <p>{dateTime}</p>
          <LucideCog className="cursor-pointer" />
        </div>
      </div>
      {/* main section */}
      <div className="flex flex-col items-center">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-wide">
            Veridoctor telehealth
          </h1>
          <p className="text-lg max-w-lg mx-auto mt-4">
            Connect with healthcare professionals from the comfort of your home
            and get the care you need, when you need it.
          </p>
        </div>
        <div className="flex gap-4 mt-4">
          <input
            type="text"
            placeholder="Enter meeting code"
            className="border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary px-2 w-full h-10"
            onChange={handleInputChange}
          ></input>
          <Button variant="rounded" onClick={joinCall}>
            Join call
          </Button>
        </div>
        <div className="absolute  bottom-10 flex gap-4 justify-center items-center">
          <Button variant="link">Learn more</Button>
          <Button variant="link">Contact us</Button>
          <p className="text-sm">&copy;2026 Veri doctor</p>
        </div>
      </div>
    </div>
  );
}
