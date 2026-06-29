// import { getFullyear } from "../../../utils/helpers";
import Link from "next/link";
import { ReactNode } from "react";
// TODO: replace all deprecated icons with their svg variants
import {
  Facebook,
  Instagram,
  Linkedin,
  TwitterIcon,
} from "@veridoctor/design/icons";
import Image from "next/image";

const socialItems: { name: string; href: string; icon: ReactNode }[] = [
  {
    name: "WhatsApp",
    href: "https://wa.me/+254705590527",
    icon: <Instagram />,
  },
  {
    name: "instagram",
    href: "https://www.instagram.com/veri_doctor/",
    icon: <Instagram />,
  },
  {
    name: "facebook",
    href: "https://www.facebook.com/people/Veri-Doctor/100066543586030/",
    icon: <Facebook />,
  },
  {
    name: "twitter",
    href: "https://x.com/Veri_doctor",
    icon: <TwitterIcon />,
  },
  {
    name: "linkedin",
    href: "https://www.linkedin.com/company/veridoctor-ke/",
    icon: <Linkedin />,
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
