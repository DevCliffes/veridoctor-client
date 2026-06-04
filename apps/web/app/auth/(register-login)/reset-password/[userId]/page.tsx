"use client";

import { validatePassword } from "@/utils/validators";
import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import {
  ArrowLeft,
  LucideEye,
  LucideEyeClosed,
} from "@veridoctor/design/icons";
import Link from "next/link";
import { redirect, useParams, useSearchParams } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";

export default function ConfirmResetPassword() {
  const [passwordType, setPasswordType] = useState<"password" | "text">(
    "password",
  );
  const [passwordForm, setPasswordForm] = useState<{
    password: { valid: boolean; value: string };
    confirmPassword: { valid: boolean; value: string };
  }>({
    password: { valid: true, value: "" },
    confirmPassword: { valid: true, value: "" },
  });
  const params: { userId: string } = useParams();
  const queryParams = useSearchParams();
  const token = queryParams.get("tkn") || "";

  /**
   * handles input changes in the password reset form
   * @param event input change event
   */
  const handleFormChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    let valid = false;
    if (name === "password") {
      valid = validatePassword(value);
    } else if (name === "confirmPassword") {
      valid = value === passwordForm.password.value;
    }
    setPasswordForm((prev) => ({
      ...prev,
      [name]: { value: value, valid: valid },
    }));
  };

  /**
   * runs validation on a specific form input
   * @param name name of input to validate
   * @returns
   */
  const validateFormInput = (name: string) => {
    let valid = false;
    if (name === "password") {
      valid = validatePassword(passwordForm.password.value);
    } else if (name === "confirmPassword") {
      valid =
        passwordForm.confirmPassword.value === passwordForm.password.value;
    }
    setPasswordForm((prev) => ({
      ...prev,
      [name]: {
        value: prev[name as "password" | "confirmPassword"].value,
        valid: valid,
      },
    }));
    return valid;
  };

  /**
   * Resets the user's password using the provided token and new password.
   */
  const resetPassword = () => {
    const passwordValid = validateFormInput("password");
    const passwordsMatch = validateFormInput("confirmPassword");
    if (!passwordValid || !passwordsMatch) {
      toast.error("Please fix the errors in the form before submitting.");
      return;
    }
    axiosClient
      .post("identity/reset-password/confirm", {
        token: token,
        new_password: passwordForm.password.value,
        identity: params.userId,
      })
      .then((res) => {
        if (res.status === 200) {
          toast.success(
            "Password reset successful. You can now log in with your new password.",
          );
          setTimeout(() => {
            toast.info("redirecting to login page");
            redirect("/auth/login");
          }, 1000);
        }
      })
      .catch((err) => {
        if (err?.response?.status === 400) {
          toast.error("Invalid or expired token. Please request a new reset.");
        } else if (err?.response?.status === 410) {
          toast.error(
            "This password reset link has expired, please request for a new one",
          );
        } else {
          toast.error("An error occurred. Please try again later.");
        }
        // Handle error
      });
  };

  return (
    <div className="min-h-4/5  flex flex-col  gap-4 justify-center items-center">
      <div className="px-4 max-w-[400px] lg:max-w-[600px] w-full flex flex-col items-center gap-4">
        <div className="w-full">
          <label className="block">
            New Password <span className="text-destructive">*</span>
          </label>
          <div className="flex w-full h-10 border border-gray-400 rounded justify-between items-center px-2">
            <input
              name="password"
              onChange={handleFormChange}
              // onBlur={(event) => validateFormInput(event.target.name)}
              type={passwordType}
              className="focus:outline-none w-[95%]"
            ></input>
            {passwordType === "password" ? (
              <LucideEyeClosed
                onClick={() => setPasswordType("text")}
                className="text-gray-400 cursor-pointer"
              />
            ) : (
              <LucideEye
                onClick={() => setPasswordType("password")}
                className="text-gray-400 cursor-pointer"
              />
            )}
          </div>
          {!passwordForm.password.valid && (
            <p className="text-sm text-destructive italic">
              Password must contain a combination of letters, numbers and
              atleast one special character
            </p>
          )}
        </div>
        <div className="w-full">
          <label className="block">
            Repeat password <span className="text-destructive">*</span>
          </label>
          <input
            name="confirmPassword"
            onChange={handleFormChange}
            type="password"
            className={`border ${passwordForm.confirmPassword.valid ? "border-gray-400" : "border-destructive"} rounded focus:outline-none px-2 w-full h-10`}
          ></input>
        </div>
        <Button
          className="w-full"
          disabled={
            !passwordForm.password.valid || !passwordForm.confirmPassword.valid
          }
          onClick={resetPassword}
        >
          Reset Password
        </Button>
        <div className="w-full flex text-primary font-bold">
          <ArrowLeft />
          <Link href={"/auth/login"}>Back to login</Link>
        </div>
      </div>
    </div>
  );
}
