"use client";

import { useAppDispatch } from "@/app/hooks";
import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import { LucideEye, LucideEyeClosed } from "@veridoctor/design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { setIsLoggedIn, setUser } from "@veridoctor/store";

type LoginForm = {
  email: {
    value: string;
    valid: boolean;
  };
  password: string;
};
type LoginResponse = {
  user: {
    id: string;
    first_name: string;
    last_name: string;
  };
  detail: string;
  auth_code: string;
};

export default function Login() {
  const [passwordType, setPasswordType] = useState<"password" | "text">(
    "password",
  );
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: { value: "", valid: true },
    password: "",
  });
  const dispatch = useAppDispatch();
  const router = useRouter();

  /**
   * Validates an email format using a regex pattern
   * @param email email to run validations on
   * @returns true if email matches pattern, false otherwise
   */
  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleLoginFormChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === "email") {
      setLoginForm({
        ...loginForm,
        email: {
          valid: validateEmail(value),
          value: value,
        },
      });
    } else {
      setLoginForm({ ...loginForm, [name]: value });
    }
  };

  const handleLogin = (
    event:
      | React.FormEvent<SubmitEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();
    if (loginForm.email.value === "" || loginForm.password === "") {
      toast.error("Please fill in all required fields.");
      return;
    }
    const payload = {
      email: loginForm.email.value,
      password: loginForm.password,
    };
    axiosClient
      .post<LoginResponse>("identity/login", payload)
      .then((res) => {
        if (res.status === 200 && res.data.user) {
          toast.success("Login successful!");
          dispatch(setIsLoggedIn());
          dispatch(setUser(res.data.user));
          router.push(
            `/auth/accounts/${res.data.user.id}?auth_tkn=${res.data.auth_code}`,
          );
        }
      })
      .catch((err) => {
        if (err.response.status === 403) {
          toast.info("Please verify your email to proceed.");
          router.push(
            `/auth/verify-email/${err.response.data.user.id}?prev=login`,
          );
        } else if (err.response.status) {
          /**TODO: find a better way to show the errors */

          // Object.keys(err.response.data).forEach((key) => {
          //   toast.error(`${err.response.data[key]}`);
          // });
          toast.error("An error occurred. Please try again later");
        } else {
          toast.error("An error occurred during login. Please try again.");
        }
      });
  };
  return (
    <>
      <div className="flex flex-col items-center m-auto w-full">
        <p className="text-xl font-bold mb-5">Login to your account</p>
        <form className="flex flex-col gap-2 p-4 w-full max-w-[400px] lg:max-w-[600px]">
          <div className="w-full">
            <label className="block">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              placeholder="johndoe@email.com"
              className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
              onChange={handleLoginFormChange}
            ></input>
            {!loginForm.email.valid && (
              <p className="text-sm text-red-400 italic">
                Please enter a valid email
              </p>
            )}
          </div>
          <div>
            <label className="block">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="flex w-full h-10 border border-gray-400 rounded justify-between items-center px-2">
              <input
                name="password"
                type={passwordType}
                className="focus:outline-none w-[95%]"
                onChange={handleLoginFormChange}
              ></input>
              {passwordType === "password" ? (
                <LucideEyeClosed
                  onClick={() => setPasswordType("text")}
                  className="text-gray-400"
                />
              ) : (
                <LucideEye
                  onClick={() => setPasswordType("password")}
                  className="text-gray-400"
                />
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 mt-5">
            <Button
              onClick={(event) => handleLogin(event)}
              className="p-5 cursor-pointer w-full"
              //   loading={isLoading}
            >
              Login
            </Button>
          </div>
        </form>
        <div className="text-center my-4">
          <p>
            Don`&apos;t have an account?{" "}
            <Link href={"/auth/signup"} className="text-blue-500 font-bold">
              create one
            </Link>
          </p>
          <p className="text-blue-500 font-bold">
            <Link href={`/auth/reset-password`}>Forgot password?</Link>
          </p>
        </div>
      </div>
    </>
  );
}
