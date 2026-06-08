"use client";
import { Button } from "@veridoctor/design/components";

import { useRouter } from "next/navigation";

export default function Calls() {
  const router = useRouter();
  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <>
        <div className="flex justify-between">
          <div>
            <h1 className="text-xl font-bold">Forms</h1>
            <p className="text-gray-600 mt-2">
              Build forms you&apos;ll use to serve your patients.
            </p>
          </div>
          <Button onClick={() => router.push("forms/new")}>New form</Button>
        </div>
        <div>
          <p>You have no forms yet</p>
        </div>
      </>
    </div>
  );
}
