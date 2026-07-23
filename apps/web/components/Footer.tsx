// import { getFullyear } from "../../../utils/helpers";
import Link from "next/link";
import { ReactNode } from "react";
import Image from "next/image";

// FIX: lucide-react has been progressively dropping brand/logo icons
// (Facebook, Instagram, LinkedIn, the old Twitter bird) in favor of
// staying a purely generic UI icon set -- as of lucide-react 1.25.0 these
// three are no longer exported at all, which breaks the build the moment
// that version is installed. Replaced with self-contained inline SVGs
// (same pattern already used for WhatsAppIcon/XIcon below) so this file
// no longer depends on lucide-react for any brand marks, and the
// lucide-react version bump PR can be merged safely going forward.

function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.05 2C6.505 2 2 6.478 2 12c0 1.87.517 3.673 1.5 5.256L2 22l4.87-1.475A9.98 9.98 0 0012.05 22C17.596 22 22 17.522 22 12S17.596 2 12.05 2zm0 18.187a8.13 8.13 0 01-4.152-1.14l-.298-.177-3.09.936.94-3.006-.194-.31A8.157 8.157 0 013.87 12c0-4.51 3.674-8.187 8.18-8.187 4.507 0 8.181 3.678 8.181 8.187 0 4.51-3.674 8.187-8.181 8.187z" />
    </svg>
  );
}

function XIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.508 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.878h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94z" />
    </svg>
  );
}

function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37a4 4 0 11-7.914 1.174A4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const socialItems: { name: string; href: string; icon: ReactNode }[] = [
  {
    name: "WhatsApp",
    href: "https://wa.me/+254705590527",
    icon: <WhatsAppIcon />,
  },
  {
    name: "instagram",
    href: "https://www.instagram.com/veri_doctor/",
    icon: <InstagramIcon />,
  },
  {
    name: "facebook",
    href: "https://www.facebook.com/people/Veri-Doctor/100066543586030/",
    icon: <FacebookIcon />,
  },
  {
    name: "x",
    href: "https://x.com/Veri_doctor",
    icon: <XIcon />,
  },
  {
    name: "linkedin",
    href: "https://www.linkedin.com/company/veridoctor-ke/",
    icon: <LinkedinIcon />,
  },
];

export default function Footer() {
  return (
    <div className="bg-blue-500 mt-12 py-8 text-white mb-0 min-h-[300px] flex flex-col items-center justify-center">
      <div className="flex flex-wrap items-start justify-left lg:justify-center gap-12 mb-8 mx-4">
        <div className="flex flex-col gap-4 items-center">
          {/* replave logo with another variant to maintain contrast */}
          <Image
            src={"/veri-logo.svg"}
            height={60}
            width={60}
            alt="veri doctor logo"
          ></Image>
          <div>
            <p className="text-2xl font-bold">VERI</p>
            <p className="text-sm font-bold text-black">DOCTOR</p>
          </div>
        </div>
        <div>
          <p className="font-bold text-xl">Platform</p>
          <Link href={"/for-healthcare-providers"}>
            <p>For Healthcare Providers</p>
          </Link>
          <Link href={"/for-patients"}>
            <p>For Patients</p>
          </Link>
          <Link href={"/about"}>
            <p>About</p>
          </Link>
          <Link href={"/contact"}>
            <p>Contact Us</p>
          </Link>
        </div>
        <div>
          <p className="font-bold text-xl">Accounts</p>
          <Link href={"/auth/signup"}>
            <p>Signup</p>
          </Link>
          <Link href={"/auth/signup"}>
            <p>Login</p>
          </Link>
        </div>
        <div>
          <p className="font-bold text-xl">Legal</p>
          <Link href={"/privacy-policy"}>
            <p>Cookie & Privacy Policy</p>
          </Link>
          <Link href={"/terms-and-conditions"}>
            <p>Terms & Conditions</p>
          </Link>
        </div>
        <div>
          <p className="font-bold text-xl">Help</p>
          <Link href={"/faq"}>
            <p>FAQ</p>
          </Link>
          <Link href={"/contact"}>
            <p>Contact</p>
          </Link>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 p-4">
        <p className="font-bold text-xl">Get In Touch</p>
        <div className="flex gap-2 flex-wrap">
          {socialItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="p-4 bg-white/90 rounded-full text-blue-500 text-3xl"
            >
              {item.icon}
            </Link>
          ))}
        </div>
        {/* TODO: create a utility to get full year */}
        <p className="text-center text-sm italic">
          &copy;2026 Veri Doctor Limited. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
