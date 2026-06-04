"use client";

import { Button } from "@veridoctor/design/components";
import Link from "next/link";

export default function Error404() {
  return (
    <div className="flex flex-col items-center m-auto w-full justify-center text-center">
      <h1 className="mt-20">
        The page you are looking for is either deleted or does not exist.
      </h1>
      <h1 className="font-bold text-[200px]">404</h1>
      <Link href={"/"} className="cursor-pointer">
        <Button>Go to Homepage</Button>
      </Link>
    </div>
  );
}
