import Link from "next/link";
import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center lg:justify-start w-full min-h-svh">
      <div className="bg-blue-500 hidden lg:block w-1/2 py-12 px-4">
        <Link href={"/"} className="flex gap-2 w-full">
          <p className="text-2xl font-bold">
            VERI <span className="text-white">DOCTOR</span>
          </p>
        </Link>
      </div>
      <div className="flex flex-col w-full lg:w-1/2 py-6">
        <p className="text-2xl lg:hidden font-bold text-center">
          VERI <span className="text-primary">DOCTOR</span>
        </p>
        {children}
        <div className="flex flex-col items-center mt-12 w-full justify-center gap-2">
          <div className="flex gap-2 font-bold text-blue-500 text-sm">
            <Link href={"/"}>Home</Link>
            <Link href={"/privacy-policy"}>Privacy policy</Link>
            <Link href={"/terms-and-conditions"}>Terms and conditions</Link>
          </div>
          <p className="text-blue-500 font-bold text-sm">
            {/* TODO: create a helper function to handle date events */}
            {/* &copy;{getFullyear()} Veri doctor */}
            &copy;2026 Veri doctor
          </p>
        </div>
      </div>
    </div>
  );
}
