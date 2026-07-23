"use client";
import { axiosClient } from "@veridoctor/api-client";
import { Button, Checkbox } from "@veridoctor/design/components";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function FacilityForm({ authTkn }: { authTkn: string }) {
  const router = useRouter();
  const pathParams: { userId: string } = useParams();

  /**
   * creates a healthcare facility account for the user
   */
  const createFacilityAccount = () => {
    axiosClient
      .post(
        `identity/${pathParams.userId}/accounts`,
        { account_type: "facility_manager" },
        { params: { auth_tkn: authTkn } },
      )
      .then((res) => {
        if (res.status === 201) {
          toast.success("Healthcare facility account created successfully");
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

  return (
    <div className="flex flex-col gap-2 p-4 w-full max-w-[400px] lg:max-w-[600px]">
      <p>
        Provide facility details. All fields marked with{" "}
        <span className="text-red-500">*</span> are mandatory.
      </p>
      <div className="w-full">
        <div className="w-full">
          <label className="block">
            Facility name <span className="text-red-500">*</span>
          </label>
          <input
            name="facilityName"
            placeholder="Veridoctor Medical Center"
            className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
            // onChange={handleLoginFormChange}
          ></input>
        </div>
        <div className="w-full">
          <label className="block">
            Licence number <span className="text-red-500">*</span>
          </label>
          <input
            name="licenceNumber"
            placeholder="GP/2026/123456"
            className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
            // onChange={handleLoginFormChange}
          ></input>
        </div>
        <div className="w-full">
          <label className="block">
            Address <span className="text-red-500">*</span>
          </label>
          <input
            name="address"
            placeholder="123 Ngong Avenue, Nairobi"
            className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
            // onChange={handleLoginFormChange}
          ></input>
        </div>
        <div className="w-full">
          <label className="block">
            Contact <span className="text-red-500">*</span>
          </label>
          <input
            name="contact"
            placeholder="0712345678"
            className="border border-gray-400 rounded focus:outline-none px-2 w-full h-10"
            // onChange={handleLoginFormChange}
          ></input>
        </div>
        <div className="my-4">
          <Checkbox
            name="acceptedTC"
            // onCheckedChange={(checked: boolean) => setAcceptedTc(checked)}
            className="border-gray-500 cursor-pointer"
          />{" "}
          I confirm that the information provided is accurate and up-to-date.
        </div>
      </div>
      <Button onClick={createFacilityAccount}>Add Facility details</Button>
    </div>
  );
}
