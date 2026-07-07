"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

const SLIDES = [
  {
    title: "Smarter, more accessible healthcare.",
    body: "Book appointments, consult virtually, and manage your health records — all in one place.",
  },
  {
    title: "Consult from anywhere.",
    body: "Talk to a verified doctor over video, no clinic visit required for most concerns.",
  },
  {
    title: "Your records, always with you.",
    body: "Prescriptions, visit history, and test results, securely stored and available on demand.",
  },
  {
    title: "Find the right specialist, fast.",
    body: "Search by speciality, location, or language, and book the next available slot.",
  },
];

const SLIDE_INTERVAL_MS = 4000;

function BenefitsCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto">
      <div className="min-h-[180px] flex flex-col justify-center">
        <p className="text-4xl font-bold leading-snug mb-5 text-white">
          {SLIDES[current].title}
        </p>
        <p className="text-lg leading-relaxed text-blue-100">
          {SLIDES[current].body}
        </p>
      </div>
      <div className="flex gap-2 mt-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Show slide ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-[3px] w-6 rounded-full transition-colors ${
              i === current ? "bg-white" : "bg-white/35"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center lg:justify-start w-full min-h-svh">
      {/* ── Branding panel — logo top, carousel centered in remaining space ── */}
      <div className="bg-blue-500 hidden lg:flex flex-col w-1/2 py-12 px-10">
        <Link href={"/"} className="flex gap-2 w-fit">
          <p className="text-2xl font-bold text-white">
            VERI <span className="text-blue-100">DOCTOR</span>
          </p>
        </Link>

        {/* flex-1 + items-center justify-center centers the carousel both
            vertically and horizontally in the space below the logo,
            instead of pinning it to the bottom-left via justify-between. */}
        <div className="flex-1 flex items-center justify-center">
          <BenefitsCarousel />
        </div>
      </div>

      {/* ── Form column ── */}
      <div className="flex flex-col w-full lg:w-1/2 py-6 min-h-svh">
        <p className="text-2xl lg:hidden font-bold text-center">
          VERI <span className="text-primary">DOCTOR</span>
        </p>

        <div className="flex-1 flex items-center justify-center px-4">
          {children}
        </div>

        <div className="flex flex-col items-center w-full justify-center gap-2 pb-2">
          <div className="flex gap-2 font-bold text-blue-500 text-sm">
            <Link href={"/"}>Home</Link>
            <Link href={"/privacy-policy"}>Privacy policy</Link>
            <Link href={"/terms-and-conditions"}>Terms and conditions</Link>
          </div>
          <p className="text-blue-500 font-bold text-sm">
            &copy;2026 Veri doctor
          </p>
        </div>
      </div>
    </div>
  );
}
