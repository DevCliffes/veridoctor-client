"use client";
import FacilityForm from "@/components/FacilityForm";
import ProviderForm from "@/components/ProviderForm";
import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import {
  LucideCheck,
  LucideHospital,
  LucideStethoscope,
  UserStar,
} from "@veridoctor/design/icons";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

type AccountType = "patient" | "healthProvider" | "healthFacility" | undefined;
const accounts: {
  type: AccountType;
  icon: ReactNode;
  title: string;
  description: string;
}[] = [
  {
    type: "patient",
    icon: <UserStar size="42" />,
    title: "Patient",
    description: "Book, schedule and monitor your health with veridoctor.",
  },
  {
    type: "healthProvider",
    icon: <LucideStethoscope size="42" />,
    title: "Healthcare Provider",
    description:
      "Create your schedule manage patients and track your perfomance.",
  },
  // Healthcare Facility account type is temporarily hidden from signup.
  // The underlying flow (FacilityForm, additional-info step handling) is
  // left intact below in case this needs to be re-enabled later — just
  // uncomment this entry to restore it.
  // {
  //   type: "healthFacility",
  //   icon: <LucideHospital size="42" />,
  //   title: "Healthcare Facility",
  //   description:
  //     "Build a great care system with the veridoctor operating system.",
  // },
];
export default function RegisterAccount() {
  const [selectedAccount, setSelectedAccount] = useState<AccountType>();
  const [additionalInfoStep, setAdditionalInfoStep] = useState(false);
  const router = useRouter();
  const pathParams: { userId: string } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const step = searchParams.get("step");
    const selectedAccount = searchParams.get("account");
    // ensure type of selected account from params and step are of AccountType
    if (selectedAccount) setSelectedAccount(selectedAccount as AccountType);
    if (step !== null && step === "additional-info") {
      setAdditionalInfoStep(true);
    }
  }, [searchParams]);

  /**
   * sets query parameters in pathname
   * @param key key for the query param
   * @param value value of the query param
   */
  const setParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  /**
   * creates a patient account for the user
   */
  const createPatientAccount = () => {
    axiosClient
      .post(`identity/${pathParams.userId}/accounts`, { account_type: "patient" })
      .then((res) => {
        if (res.status === 201) {
          toast.success("Patient account created successfully");
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

  /**
   * handles the next button click
   */
  const goToNextStep = () => {
    if (typeof window !== "undefined") {
      if (selectedAccount === "patient") {
        createPatientAccount();
      } else if (selectedAccount === "healthFacility") {
        setAdditionalInfoStep(true);
        setParams("step", "additional-info");
        return;
      } else if (selectedAccount === "healthProvider") {
        setAdditionalInfoStep(true);
        setParams("step", "additional-info");
        return;
      }
    }
  };

  const handleSelectAccount = (accountType: AccountType) => {
    if (accountType) {
      setSelectedAccount(accountType);
      setParams("account", accountType);
    }
  };

  return (
    <>
      <div className="min-h-screen p-4">
        <p className="text-2xl font-bold">
          VERI <span className="text-primary">DOCTOR</span>
        </p>
        <div className="w-full flex flex-col items-center justify-center min-h-[70vh] my-8">
          {additionalInfoStep ? (
            <>
              {selectedAccount === "healthProvider" && <ProviderForm />}
              {selectedAccount === "healthFacility" && <FacilityForm />}
            </>
          ) : (
            <>
              <p className="font-bold">Finish setting up your account</p>
              <p>Select an account type you want to create</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 my-4">
                {accounts.map((account) => (
                  <div
                    key={account.type}
                    onClick={() => handleSelectAccount(account.type)}
                    className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg max-w-[300px] lg:min-h-[300px] border-2 cursor-pointer ${selectedAccount === account.type && "bg-primary/20 border-primary"}`}
                  >
                    <div
                      className={`absolute top-0 right-0 border p-1 ${selectedAccount === account.type && "border-primary rounded-md bg-primary text-white"}`}
                    >
                      <LucideCheck size={"16"} />
                    </div>
                    <p className="font-bold text-lg">{account.title}</p>
                    {account.icon}
                    <p className="text-sm">{account.description}</p>
                  </div>
                ))}
              </div>
              <div className="my-4">
                <Button onClick={goToNextStep}>Next</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
