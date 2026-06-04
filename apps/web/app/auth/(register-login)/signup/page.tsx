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
  firstName: {
    value: string;
    valid: boolean;
  };
  lastName: {
    value: string;
    valid: boolean;
  };
  email: {
    value: string;
    valid: boolean;
  };
  password: {
    value: string;
    valid: boolean;
  };
  repeatPass: {
    value: string;
    valid: boolean;
  };
};
export default function Signup() {
  const [passwordType, setPasswordType] = useState<"password" | "text">(
    "password",
  );
  const [loading, setLoading] = useState(false);
  const [signupForm, setSignupForm] = useState<SignupForm>({
    firstName: { value: "", valid: true },
    lastName: { value: "", valid: true },
    email: { value: "", valid: true },
    password: { value: "", valid: true },
    repeatPass: { value: "", valid: true },
  });
  const signupFormValid = useRef(false);
  const [acceptedTc, setAcceptedTc] = useState(false);
  /** flag to whether to run form valid checks or not */
  const runFormValidChecksRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (runFormValidChecksRef.current) {
      const formValid = Object.values(signupForm).every(
        (field) => field.valid === true,
      );
      signupFormValid.current = formValid;
      runFormValidChecksRef.current = false;
    }
  }, [signupForm]);

  /**
   * handles signup, makes api call to create a veridoctor identity instance
   * @param event form input change event
   * @returns
   */
  const handleSignupFormChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    if (!Object.hasOwn(signupForm, name)) {
      return;
    }
    setSignupForm((prev) => ({
      ...prev,
      [name]: { value: value, valid: true },
    }));
  };

  /**
   * validates a single input field in the signupForm
   * @param fieldName name of the field to validate, a property of signupForm
   * @param value an optional value property for the value to check against
   * @returns
   */
  const validateFormInput = (fieldName: string, value?: string) => {
    const name = fieldName as keyof SignupForm;
    if (!Object.hasOwn(signupForm, fieldName)) {
      return;
    }
    let valid = false;

    if (["lastName", "firstName"].includes(name)) {
      valid = signupForm[name].value.length >= 3;
    }
    if (name === "email") {
      valid = validateEmail(signupForm.email.value);
    }
    if (name === "password") {
      valid = validatePassword(signupForm.password.value);
    }
    if (name === "repeatPass") {
      valid = signupForm.password.value === value;
    }
    setSignupForm((prev) => ({
      ...prev,
      [name]: { ...(prev[name] as object), valid: valid },
    }));
  };

  /**
   * runs checks for the all the signupForm input fields
   * sets up the flag to run checks for all the input fields
   */
  const validateInput = async () => {
    runFormValidChecksRef.current = true;
    const fields = ["firstName", "lastName", "email", "password"];
    for (let index = 0; index < fields.length; index++) {
      validateFormInput(fields[index]);
    }
  };

  /**
   * handles account signup
   * @param event input changeEvent
   * @returns
   */
  const handleSignup = async (
    event:
      | React.FormEvent<SubmitEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();
    setLoading(true);
    // ensure the effect has run to get updated signupFormValid ref
    await validateInput();
    if (!signupFormValid.current) {
      // Add a message toast here
      toast.error("Please ensure all fields are valid");
      setLoading(false);
      return;
    }
    const payload = {
      first_name: signupForm.firstName.value,
      last_name: signupForm.lastName.value,
      email: signupForm.email.value,
      password: signupForm.password.value,
    };
    axiosClient
      .post("identity/register", payload)
      .then((res) => {
        if (res.status === 201)
          router.push(`/auth/verify-email/${res.data.id}?prev=signup`);
      })
      .catch((err) => {
        if (err.response) {
          if (err.response.status >= 500) {
            toast.error("An error occurred. Please try again later.");
            return;
          }
          toast.error(
            err.response.data.detail || "An error occurred. Please try again.",
          );
        } else {
          toast.error("An error occurred. please try again later.");
        }
      })
      .finally(() => setLoading(false));
    return;
  };
  return (
    <>
      <div className="flex flex-col items-center m-auto w-full">
        <p className="text-xl font-bold mb-5">Get started with veri doctor</p>
        <form className="flex flex-col gap-2 p-4 rounded-lg max-w-[400px] lg:max-w-[600px] w-full">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label>
                First name <span className="text-destructive">*</span>
              </label>
              <input
                name="firstName"
                onChange={handleSignupFormChange}
                onBlur={(event) => validateFormInput(event.target.name)}
                className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
              ></input>
              {!signupForm.firstName.valid && (
                <p className="text-sm text-destructive italic">
                  Please enter a name
                </p>
              )}
            </div>
            <div className="flex flex-col">
              <label>
                Last name <span className="text-destructive">*</span>
              </label>
              <input
                name="lastName"
                onChange={handleSignupFormChange}
                onBlur={(event) => validateFormInput(event.target.name)}
                className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
              ></input>
              {!signupForm.lastName.valid && (
                <p className="text-sm text-destructive italic">
                  Please enter a name
                </p>
              )}
            </div>
          </div>
          <div className="w-full">
            <label className="block">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              name="email"
              onChange={handleSignupFormChange}
              onBlur={(event) => validateFormInput(event.target.name)}
              placeholder="johndoe@email.com"
              className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
            ></input>
            {!signupForm.email.valid && (
              <p className="text-sm text-destructive italic">
                Please enter a valid email
              </p>
            )}
          </div>
          <div>
            <label className="block">
              Password <span className="text-destructive">*</span>
            </label>
            <div className="flex w-full h-10 border border-gray-400 rounded justify-between items-center px-2">
              <input
                name="password"
                onChange={handleSignupFormChange}
                onBlur={(event) => validateFormInput(event.target.name)}
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
            {!signupForm.password.valid && (
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
              name="repeatPass"
              onChange={(event) => {
                handleSignupFormChange(event);
                validateFormInput(event.target.name, event.target.value);
              }}
              onBlur={(event) => {
                validateFormInput(event.target.name, event.target.value);
              }}
              type="password"
              className={`border ${signupForm.repeatPass.valid ? "border-gray-400" : "border-destructive"} rounded focus:outline-none px-2 w-full h-10`}
            ></input>
          </div>
          <div className="my-4">
            <Checkbox
              name="acceptedTC"
              onCheckedChange={(checked: boolean) => setAcceptedTc(checked)}
              className="border-gray-500 cursor-pointer"
            />{" "}
            Accept{" "}
            <a
              className="text-primary hover:underline"
              href="/terms-and-conditions"
            >
              terms and conditions
            </a>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              disabled={!acceptedTc}
              onClick={(event) => handleSignup(event)}
              className={`p-5 cursor-pointer w-full ${loading && "bg-primary/50"}`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "creating account..." : "signup"}
            </Button>
          </div>
        </form>
        <div className="text-center my-4">
          <p>
            Have an account?{" "}
            <Link href={"/auth/login"} className="text-blue-500 font-bold">
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
