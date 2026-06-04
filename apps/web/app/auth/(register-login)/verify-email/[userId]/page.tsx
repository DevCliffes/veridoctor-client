"use client";
import { axiosClient } from "@veridoctor/api-client";
import {
  Button,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@veridoctor/design/components";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function VerifyEmail() {
  const [otpValue, setOtpValue] = useState("");
  const router = useRouter();
  const pathParams: { userId: string } = useParams();
  const queryParams = useSearchParams();
  const prevPage: string = queryParams.get("prev") || "";

  const verifyOtp = () => {
    axiosClient
      .post("identity/otp-verify", { user: pathParams.userId, otp: otpValue })
      .then((res) => {
        if (res.status === 200) {
          toast.success("Email verified successfully!");
          // Add user information to the redirect
          if (prevPage === "signup") {
            router.push(`/auth/create-account/${pathParams.userId}`);
            return;
          } else if (prevPage === "login") {
            router.push(`/auth/accounts/${pathParams.userId}`);
            return;
          }
          router.push(`/`);
        }
      })
      .catch((err) => {
        if (err.response.status === 400) {
          Object.keys(err.response.data).forEach((key) => {
            toast.error(`${err.response.data[key]}`);
          });
        } else if (err.response.status === 404) {
          toast.error("User not found. Please register.");
        }
      });
  };

  const resendCode = () => {
    axiosClient
      .post("identity/otp-send", { user: pathParams.userId })
      .then((res) => {
        if (res.status === 200) {
          toast.success("Verification code resent successfully!");
        }
      })
      .catch((err) => {
        if (err.response) {
          if (err.response.status === 404) {
            toast.error("User not found. Please register.");
            return;
          }
          Object.keys(err.response.data).forEach((key) => {
            toast.error(`${err.response.data[key]}`);
          });
        } else {
          toast.error("An error occurred. Please try again later.");
        }
      });
  };

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-4/5">
      <p>Enter the six digit code sent to your email address.</p>
      <InputOTP
        maxLength={6}
        className="h-20"
        value={otpValue}
        onChange={(value) => setOtpValue(value)}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <Button onClick={verifyOtp} disabled={otpValue.length !== 6}>
        Verify
      </Button>
      <div>
        <p className="cursor-pointer hover:underline" onClick={resendCode}>
          Did not receive code? <span className="text-primary">Resend</span>
        </p>
      </div>
    </div>
  );
}
