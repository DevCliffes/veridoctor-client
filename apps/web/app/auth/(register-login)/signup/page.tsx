"use client";

import { Button, Checkbox } from "@veridoctor/design/components";
import { LucideEye, LucideEyeClosed } from "@veridoctor/design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "@veridoctor/design/icons";
import React, { useEffect, useRef, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import { validateEmail, validatePassword } from "@/utils/validators";

type SignupForm = {
  firstName: { value: string; valid: boolean };
  lastName: { value: string; valid: boolean };
  email: { value: string; valid: boolean };
  password: { value: string; valid: boolean };
  repeatPass: { value: string; valid: boolean };
};

function extractApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "An error occurred. Please try again.";
  const obj = data as Record<string, unknown>;

  if (typeof obj.detail === "string") return obj.detail;

  const fieldOrder = ["email", "password", "first_name", "last_name", "non_field_errors"];
  for (const field of fieldOrder) {
    if (Array.isArray(obj[field]) && (obj[field] as unknown[]).length > 0) {
      const label =
        field === "first_name" ? "First name" :
        field === "last_name" ? "Last name" :
        field === "non_field_errors" ? "" :
        field.charAt(0).toUpperCase() + field.slice(1);
      const msg = String((obj[field] as unknown[])[0]);
      return label ? `${label}: ${msg}` : msg;
    }
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0) return String(val[0]);
    if (typeof val === "string") return val;
  }

  return "An error occurred. Please try again.";
}

export default function Signup() {
  const [passwordType, setPasswordType] = useState<"password" | "text">("password");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [signupForm, setSignupForm] = useState<SignupForm>({
    firstName: { value: "", valid: true },
    lastName: { value: "", valid: true },
    email: { value: "", valid: true },
    password: { value: "", valid: true },
    repeatPass: { value: "", valid: true },
  });
  const signupFormValid = useRef(false);
  const [acceptedTc, setAcceptedTc] = useState(false);
  const runFormValidChecksRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (runFormValidChecksRef.current) {
      const formValid = Object.values(signupForm).every((field) => field.valid === true);
      signupFormValid.current = formValid;
      runFormValidChecksRef.current = false;
    }
  }, [signupForm]);

  const handleSignupFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (!Object.hasOwn(signupForm, name)) return;
    setApiError(null);
    setSignupForm((prev) => ({
      ...prev,
      [name]: { value, valid: true },
    }));
  };

  const validateFormInput = (fieldName: string, value?: string) => {
    const name = fieldName as keyof SignupForm;
    if (!Object.hasOwn(signupForm, fieldName)) return;
    let valid = false;
    if (["lastName", "firstName"].includes(name)) {
      valid = signupForm[name].value.length >= 3;
    }
    if (name === "email") valid = validateEmail(signupForm.email.value);
    if (name === "password") valid = validatePassword(signupForm.password.value);
    if (name === "repeatPass") valid = signupForm.password.value === value;
    setSignupForm((prev) => ({
      ...prev,
      [name]: { ...(prev[name] as object), valid },
    }));
  };

  const validateInput = async () => {
    runFormValidChecksRef.current = true;
    const fields = ["firstName", "lastName", "email", "password"];
    for (const field of fields) validateFormInput(field);
  };

  const handleSignup = async (
    event:
      | React.FormEvent<SubmitEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();
    setApiError(null);
    setLoading(true);
    await validateInput();
    if (!signupFormValid.current) {
      toast.error("Please ensure all fields are valid");
      setLoading(false);
      return;
    }
    if (!acceptedTc) {
      setApiError("Please accept the terms and conditions to continue.");
      setLoading(false);
      return;
    }
    axiosClient
      .post("identity/register", {
        first_name: signupForm.firstName.value,
        last_name: signupForm.lastName.value,
        email: signupForm.email.value,
        password: signupForm.password.value,
      })
      .then((res) => {
        if (res.status === 201) {
          router.push(`/auth/verify-email/${res.data.id}?prev=signup`);
          return;
        }
        // FIX: an email that already exists but was never verified now
        // comes back as 200 + requires_verification instead of a 400
        // error, so we route the user straight to the OTP screen (which
        // has just sent them a fresh code) instead of dead-ending them
        // on the signup form.
        if (res.status === 200 && res.data?.requires_verification) {
          toast.success("This email was already registered. We've sent a new verification code.");
          router.push(`/auth/verify-email/${res.data.id}?prev=signup`);
          return;
        }
      })
      .catch((err) => {
        const message =
          err.response?.status >= 500
            ? "Something went wrong on our end. Please try again later."
            : extractApiError(err.response?.data);
        setApiError(message);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col items-center w-full">
      <p className="text-xl font-bold mb-5">Get started with veri doctor</p>

      <form className="flex flex-col gap-2 p-4 rounded-lg max-w-[400px] lg:max-w-[600px] w-full">

        {apiError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-1">
            <span className="mt-0.5 shrink-0">⚠</span>
            <span>{apiError}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label>First name <span className="text-destructive">*</span></label>
            <input
              name="firstName"
              onChange={handleSignupFormChange}
              onBlur={(e) => validateFormInput(e.target.name)}
              className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
            />
            {!signupForm.firstName.valid && (
              <p className="text-sm text-destructive italic">Please enter a name (min 3 characters)</p>
            )}
          </div>
          <div className="flex flex-col">
            <label>Last name <span className="text-destructive">*</span></label>
            <input
              name="lastName"
              onChange={handleSignupFormChange}
              onBlur={(e) => validateFormInput(e.target.name)}
              className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
            />
            {!signupForm.lastName.valid && (
              <p className="text-sm text-destructive italic">Please enter a name (min 3 characters)</p>
            )}
          </div>
        </div>

        <div className="w-full">
          <label className="block">Email <span className="text-destructive">*</span></label>
          <input
            name="email"
            onChange={handleSignupFormChange}
            onBlur={(e) => validateFormInput(e.target.name)}
            placeholder="johndoe@email.com"
            className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
          />
          {!signupForm.email.valid && (
            <p className="text-sm text-destructive italic">Please enter a valid email</p>
          )}
        </div>

        <div>
          <label className="block">Password <span className="text-destructive">*</span></label>
          <div className="flex w-full h-10 border border-gray-400 rounded justify-between items-center px-2">
            <input
              name="password"
              onChange={handleSignupFormChange}
              onBlur={(e) => validateFormInput(e.target.name)}
              type={passwordType}
              className="focus:outline-none w-[95%]"
            />
            {passwordType === "password" ? (
              <LucideEyeClosed onClick={() => setPasswordType("text")} className="text-gray-400 cursor-pointer" />
            ) : (
              <LucideEye onClick={() => setPasswordType("password")} className="text-gray-400 cursor-pointer" />
            )}
          </div>
          {!signupForm.password.valid && (
            <p className="text-sm text-destructive italic">
              Password must contain letters, numbers and at least one special character
            </p>
          )}
        </div>

        <div className="w-full">
          <label className="block">Repeat password <span className="text-destructive">*</span></label>
          <input
            name="repeatPass"
            onChange={(e) => { handleSignupFormChange(e); validateFormInput(e.target.name, e.target.value); }}
            onBlur={(e) => validateFormInput(e.target.name, e.target.value)}
            type="password"
            className={`border ${signupForm.repeatPass.valid ? "border-gray-400" : "border-destructive"} rounded focus:outline-none px-2 w-full h-10`}
          />
          {!signupForm.repeatPass.valid && (
            <p className="text-sm text-destructive italic">Passwords do not match</p>
          )}
        </div>

        <div className="my-4">
          <Checkbox
            name="acceptedTC"
            onCheckedChange={(checked: boolean) => setAcceptedTc(checked)}
            className="border-gray-500 cursor-pointer"
          />{" "}
          Accept{" "}
          <a className="text-primary hover:underline" href="/terms-and-conditions">
            terms and conditions
          </a>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            disabled={!acceptedTc || loading}
            onClick={(event) => handleSignup(event)}
            className={`p-5 cursor-pointer w-full ${loading ? "bg-primary/50" : ""}`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating account..." : "signup"}
          </Button>
        </div>
      </form>

      <div className="text-center my-4">
        <p>
          Have an account?{" "}
          <Link href="/auth/login" className="text-blue-500 font-bold">Login</Link>
        </p>
      </div>
    </div>
  );
}
