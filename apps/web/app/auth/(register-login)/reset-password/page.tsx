"use client";

import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import { ArrowLeft } from "@veridoctor/design/icons";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendResetLink = () => {
    setLoading(true);
    axiosClient
      .post("identity/reset-password", { email: email })
      .then((res) => {
        if (res.status === 200) {
          toast.success("Password reset link sent to your email");
          setTimeout(() => {
            toast.info("Redirecting to login page...");
            redirect("/auth/login");
          }, 2000);
        }
      })
      .catch((err) => {
        setLoading(false);
        if (err?.response?.status === 404) {
          toast.info("Please provide a valid email.");
        } else {
          toast.error("An error occurred. Please try again later.");
        }
      });
  };
  return (
    <div className="min-h-4/5 flex flex-col items-center justify-center">
      <div className="flex flex-col gap-4 w-full max-w-[400px] lg:max-w-[600px] px-4">
        <p className="text-xl font-bold text-center">Reset password</p>
        <label className="">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          name="email"
          placeholder="johndoe@email.com"
          className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
          onChange={(event) => setEmail(event.target.value)}
        ></input>
        {/* Add email validation here */}
        <Button onClick={sendResetLink} disabled={loading}>
          Send reset link
        </Button>
        <div className="flex text-primary font-bold">
          <ArrowLeft />
          <Link href={"/auth/login"}>Back to login</Link>
        </div>
      </div>
    </div>
  );
}
