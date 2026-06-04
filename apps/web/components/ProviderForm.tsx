"use client";

import { axiosClient } from "@veridoctor/api-client";
import {
  Button,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@veridoctor/design/components";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ProviderForm = {
  phone: { value: string; valid: boolean };
  licenceNumber: { value: string; valid: boolean };
  licenceType: { value: string; valid: boolean };
  speciality: { value: string; valid: boolean };
  subSpeciality: { value: string; valid: boolean };
  acceptedTC: boolean;
};
export default function ProviderForm() {
  const router = useRouter();
  const pathParams: { userId: string } = useParams();
  const [form, setForm] = useState<ProviderForm>({
    phone: { value: "", valid: true },
    licenceNumber: { value: "", valid: true },
    licenceType: { value: "", valid: true },
    speciality: { value: "", valid: true },
    subSpeciality: { value: "", valid: true },
    acceptedTC: false,
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /**
   * creates a provider account
   *
   */
  const createProviderAccount = () => {
    const payload = {
      identity: pathParams.userId,
      phone_number: form.phone.value,
      licence_number: form.licenceNumber.value,
      licence_type: form.licenceType.value,
      speciality: form.speciality.value,
      sub_speciality: form.subSpeciality.value,
    };
    axiosClient
      .post("identity/accounts/create/healthcare_provider", payload)
      .then((res) => {
        if (res.status === 201) {
          toast.success("Healthcare provider account created successfully");
          router.push("/auth/login");
        }
      })
      .catch((err) => {
        if (!(err.response instanceof Object)) {
          toast.error("An error occurred. Please try again later.");
          return;
        }
        Object.keys(err.response.data).forEach((key) => {
          toast.error(`${err.response.data[key]}`);
        });
      });
  };

  const checkNum = (str: string): boolean => {
    const regex = /^\d+$/;
    console.log("THE RESULT OF THE CHECK NUMBER FUNCTION IS", regex.test(str));
    console.log("THE STRING BEING TESTED IS", str);
    return regex.test(str);
  };
  return (
    <div className="flex flex-col gap-2 p-4 w-full max-w-[400px] lg:max-w-[600px]">
      <div className="w-full">
        <label className="block">
          Phone number <span className="text-red-500">*</span>
        </label>
        <div className="flex border border-gray-400 rounded w-full h-10">
          <Select name="countryCode" defaultValue="+254">
            <SelectTrigger className="w-fit border border-gray-400 rounded focus:outline-primary px-2 h-10">
              <SelectValue placeholder="country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+254">{"\u{1F1F0}\u{1F1EA}"}+254</SelectItem>
            </SelectContent>
          </Select>

          <input
            name="phone"
            placeholder="712345678"
            maxLength={9}
            className="px-4 focus:outline-primary w-full h-full"
            onChange={(event) => {
              setForm({
                ...form,
                phone: {
                  value: event.target.value,
                  valid:
                    event.target.value.length === 9 &&
                    checkNum(event.target.value),
                },
              });
              handleFormChange(event);
            }}
          ></input>
        </div>
        {!form.phone.valid && (
          <p className="text-sm text-red-400 italic">
            Please enter a valid phone number
          </p>
        )}
      </div>
      <div className="w-full">
        <label className="block">
          KMPDC registration number <span className="text-red-500">*</span>
        </label>
        <input
          name="licenceNumber"
          placeholder="GP/2026/123456"
          className="border border-gray-400 rounded focus:outline-primary px-2 w-full h-10"
          onChange={handleFormChange}
        ></input>
      </div>
      <div className="w-full">
        <label className="block">
          Specialization <span className="text-red-500">*</span>
        </label>
        <Select
          name="licenceType"
          onValueChange={(e) =>
            setForm((prev) => ({
              ...prev,
              licenceType: { value: e, valid: true },
            }))
          }
        >
          <SelectTrigger className="w-full border border-gray-400 rounded focus:outline-primary px-2 h-10">
            <SelectValue placeholder="Select a specialization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general-practice">General Practice</SelectItem>
            <SelectItem value="specialist">Specialist</SelectItem>
            <SelectItem value="registrar">Registrar</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.licenceType.value === "specialist" && (
        <div className="w-full">
          <label className="block">
            Specialty <span className="text-red-500">*</span>
          </label>
          <input
            name="speciality"
            placeholder="General Practice"
            className="border border-gray-400 rounded focus:outline-primary px-2 w-full h-10"
            onChange={handleFormChange}
          ></input>
        </div>
      )}
      <div className="my-4">
        <Checkbox
          name="acceptedTC"
          onCheckedChange={(checked: boolean) =>
            setForm((prev) => ({ ...prev, acceptedTC: checked }))
          }
          className="border-gray-500 cursor-pointer"
        />{" "}
        I confirm that the information provided is accurate and up-to-date.
      </div>
      <Button onClick={createProviderAccount} disabled={!form.acceptedTC}>
        Create account
      </Button>
    </div>
  );
}
