"use client";

import AccordionEl from "@/components/AccordionEl";
import { Button, Card, CardHeader } from "@veridoctor/design/components";
import { axiosClient } from "@veridoctor/api-client";
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
  ChevronLeft,
  ChevronRight,
  MapPin,
  Stethoscope,
} from "@veridoctor/design/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

// Health-portal base URL — all cross-app links point here.
const HEALTH_PORTAL_URL = "https://veridoctor-client-health-portal.vercel.app";

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

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  speciality: string;
  clinic_name: string;
  county: string;
  languages: string[];
  profile_picture_url?: string;
}

function DoctorAvatar({ provider }: { provider: Provider }) {
  const initials =
    (provider.first_name?.[0] ?? "") + (provider.last_name?.[0] ?? "");

  if (provider.profile_picture_url) {
    return (
      <img
        src={provider.profile_picture_url}
        alt={`Dr. ${provider.first_name} ${provider.last_name}`}
        className="w-16 h-16 rounded-full object-cover shrink-0 border border-gray-100"
      />
    );
  }

  return (
    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
      {initials.toUpperCase()}
    </div>
  );
}

function TopDoctorsSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    axiosClient
      .get("/provider/list")
      .then((res) => {
        if (cancelled) return;
        const list: Provider[] = Array.isArray(res.data) ? res.data : [];
        setProviders(list.slice(0, 10));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[TopDoctors] fetch failed:", msg);
        setError("Could not load doctors right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  const scrollBy = (amount: number) => {
    trackRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Clicking "View profile" sends the user to the health-portal login page.
  // After a successful login the health-portal's root page.tsx reads the
  // `redirect` param and forwards them straight to the doctor's profile.
  const goToProvider = (id: string) => {
    window.location.href = `${HEALTH_PORTAL_URL}/auth/login`;
  };

  return (
    <div className="bg-white py-12 px-4 md:px-8">
      <p className="text-2xl font-bold text-center mb-1">Meet our doctors</p>
      <p className="text-sm text-gray-500 text-center mb-8 max-w-md mx-auto">
        Verified healthcare providers ready to consult with you, virtually or
        in person.
      </p>

      {loading ? (
        <div className="flex gap-4 overflow-hidden max-w-6xl mx-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[230px] h-[230px] bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm mb-3">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="text-xs text-blue-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      ) : providers.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">
          No doctors listed yet — check back soon.
        </p>
      ) : (
        <div className="relative max-w-6xl mx-auto">
          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            {providers.map((p) => (
              <div
                key={p.id}
                className="shrink-0 w-[230px] bg-gray-50 border border-gray-100 rounded-xl p-5 flex flex-col items-center text-center gap-2"
              >
                <DoctorAvatar provider={p} />
                <p className="font-bold text-gray-800 mt-1">
                  Dr. {p.first_name} {p.last_name}
                </p>
                <p className="text-sm text-blue-600 flex items-center gap-1 justify-center">
                  <Stethoscope size={13} />
                  {p.speciality || "General Practitioner"}
                </p>
                {(p.clinic_name || p.county) && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 justify-center">
                    <MapPin size={12} className="shrink-0" />
                    {[p.clinic_name, p.county].filter(Boolean).join(", ")}
                  </p>
                )}
                <button
                  onClick={() => goToProvider(p.id)}
                  className="mt-2 w-full text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition-colors"
                >
                  View profile
                </button>
              </div>
            ))}
          </div>

          {providers.length > 3 && (
            <>
              <button
                onClick={() => scrollBy(-250)}
                aria-label="Scroll left"
                className="hidden md:flex absolute left-[-16px] top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollBy(250)}
                aria-label="Scroll right"
                className="hidden md:flex absolute right-[-16px] top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      )}

      <div className="text-center mt-8">
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = `${HEALTH_PORTAL_URL}/auth/login?redirect=/book`;
          }}
        >
          See all doctors <ArrowUpRight />
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const [newsLetterEmail, setNewsLetterEmail] = useState<string>("");
  const router = useRouter();

  const handleNewsLetterEmailChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { value } = event.target;
    setNewsLetterEmail(value);
  };

  return (
    <>
      <div className="relative flex flex-col lg:flex-row pt-10 pb-16 lg:py-20 items-center justify-around lg:gap-10">
        <div className="md:mx-8 lg:mx-20 py-8 px-4 text-center lg:text-left">
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
          <div className="w-full grid md:grid-cols-2 md:max-w-lg md:m-auto lg:mx-0 gap-4 mt-10 md:mt-20">
            <Button
              size={"lg"}
              onClick={() => {
                window.location.href = `${HEALTH_PORTAL_URL}/auth/signup`;
              }}
            >
              Get started <ArrowUpRight />
            </Button>
            <Button
              className="border-primary text-primary"
              variant={"outline"}
              size={"lg"}
              onClick={() => {
                window.location.href = `${HEALTH_PORTAL_URL}/auth/login`;
              }}
            >
              Login
            </Button>
          </div>
        </div>

        <div className="hidden lg:block shrink-0 w-[400px]">
          <Image
            src="/hero_img.png"
            alt="veridoctor hero image"
            className="hidden lg:block -z-10 w-full h-auto aspect-[400/430]"
            width={400}
            height={430}
          />
        </div>
      </div>

      <div className="bg-blue-500 pb-12 text-white pt-8 px-2 md:p-4">
        <p className="text-2xl font-bold mb-5 text-center">Key features</p>
        <div className="flex flex-wrap justify-center items-stretch gap-4 w-full text-left">
          {features.map((item, index) => (
            <Card key={index} className="max-w-[300px] flex-1 min-w-[240px]">
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

      {/* Top doctors carousel */}
      <TopDoctorsSection />

      <div className="bg-gray-200 text-center py-12">
        <p className="text-2xl">It is this easy</p>
        <p className="font-bold text-2xl">Find, book, consult</p>
        <p className="font-extrabold text-5xl lg:text-7xl whitespace-nowrap overflow-x-hidden overflow-y-clip opacity-20 mt-8 w-full">
          VERI <span className="text-blue-600">DOCTOR</span>
        </p>
        <div className="flex flex-wrap items-stretch justify-center gap-4 mt-6 px-4">
          <Card className="bg-white p-4 rounded-lg text-center shadow-lg hover:bg-blue-300 w-full sm:w-[220px] min-h-[180px] flex flex-col items-center justify-center">
            <SearchCheck className="m-auto text-blue-500" />
            <p className="font-bold text-lg mt-2">Find</p>
            <p className="text-sm">Search for a healthcare provider.</p>
          </Card>
          <Card className="bg-white p-4 rounded-lg text-center shadow-lg hover:bg-blue-300 w-full sm:w-[220px] min-h-[180px] flex flex-col items-center justify-center">
            <CalendarRange className="m-auto text-blue-500" />
            <p className="font-bold text-lg mt-2">Book</p>
            <p className="text-sm">
              Book an appointment with a specialized healthcare provider.
            </p>
          </Card>
          <Card className="bg-white p-4 rounded-lg text-center shadow-lg hover:bg-blue-300 w-full sm:w-[220px] min-h-[180px] flex flex-col items-center justify-center">
            <ClipboardPen className="text-4xl m-auto mb-2 text-blue-500" />
            <p className="font-bold text-lg">Consult</p>
            <p className="text-sm">Consult a verified healthcare provider.</p>
          </Card>
        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-16 px-4">
        <p className="text-center font-bold text-2xl mb-4">FAQ</p>
        <AccordionEl />
      </div>

      <div className="text-center mt-16 mb-16 px-4">
        <p className="font-bold text-2xl">Don&apos;t miss out</p>
        <p className="">Subscribe to our newsletter</p>
        <div className="flex border-2 p-3 rounded-xl w-full max-w-[300px] m-auto my-6 items-center">
          <MailCheck className="text-3xl shrink-0" />
          <input
            onChange={(event) => handleNewsLetterEmailChange(event)}
            className="focus:outline-none ml-2 w-full min-w-0"
            placeholder="Your email address"
          />
        </div>
      </div>
    </>
  );
}

