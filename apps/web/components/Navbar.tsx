"use client";
import { Button } from "@veridoctor/design/components";
import { Menu, X } from "@veridoctor/design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const pathname = usePathname();
  const navItems: { name: string; href: string }[] = [
    {
      name: "Home",
      href: "/",
    },
    {
      name: "For Practitioners",
      href: "/for-healthcare-providers",
    },
    {
      name: "For Patients",
      href: "/for-patients",
    },
    {
      name: "About",
      href: "/about",
    },
  ];
  // TODO: get the logged in state from redux store and place the my account button else the login and signup
  return (
    <>
      {/* desktop navigation */}
      <nav className="hidden sticky top-0 pt-4 lg:flex justify-center items-center w-full bg-white/90 z-10 pb-2">
        <div className="flex justify-between items-center min-w-[80vw]">
          <Link href={"/"}>
            <p className="font-bold text-2xl cursor-pointer">
              VERI <span className="text-blue-500">DOCTOR</span>
            </p>
          </Link>
          <div className="flex gap-3 xl:text-lg items-center">
            {navItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={`px-1 ${pathname === item.href ? "text-blue-500 underline" : ""}`}
              >
                {item.name}
              </Link>
            ))}
            {/* TODO: when logged in show user my account button instead, listing all user account info therein */}
            <Link href={"/auth/signup"}>
              <Button>Get started</Button>
            </Link>
            <Link href={"/auth/login"}>
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </nav>
      {/* mobile navigation */}
      {showDropdown ? (
        <div className="lg:hidden bg-white fixed top-0 right-0 w-full h-full z-30">
          <X
            className="absolute right-8 top-4 cursor-pointer"
            onClick={() => setShowDropdown(false)}
          />
          <div className="flex flex-col gap-3 text-xl max-w-[600px] m-auto text-center items-center mt-20">
            <div className="flex flex-col w-3/4">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setShowDropdown(false)}
                  className={`py-2 ${pathname === item.href ? "bg-blue-300 rounded-2xl font-bold" : ""}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-4 w-full mt-16 items-center">
              <Link href={"/auth/signup"} className="w-3/4">
                <Button className="w-full">Get started</Button>
              </Link>
              <Link href={"/auth/login"} className="w-3/4">
                <Button variant="outline" className="w-full">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <nav className="lg:hidden flex bg-white px-8 justify-between sticky top-0 pt-4 w-full z-30">
          <Link href={"/"}>
            <p className="font-bold text-xl cursor-pointer">
              VERI <span className="text-blue-500">DOCTOR</span>
            </p>
          </Link>
          <Menu
            className="cursor-pointer"
            onClick={() => setShowDropdown(true)}
          />
        </nav>
      )}
    </>
  );
}
