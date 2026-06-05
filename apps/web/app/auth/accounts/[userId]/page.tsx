import { axiosServer } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import {
  LucideHospital,
  LucideStethoscope,
  UserStar,
} from "@veridoctor/design/icons";
import Link from "next/link";
import { redirect } from "next/navigation";

type AccountType =
  | "patient"
  | "healthcare_provider"
  | "facility_manager"
  | "branch_manager";
type AccountsResponse = {
  identity: {
    first_name: string;
    last_name: string;
  };
  accounts: [
    {
      account_type: AccountType;
      id: string;
      name: string;
    },
  ];
};
export default async function AccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let accountsData: AccountsResponse | null = null;
  const pathParams = await params;
  const { auth_tkn } = await searchParams;
  const PROVIDER_APP_URL = process.env.NEXT_PROVIDER_APP_URL ?? "/";
  const PATIENT_APP_URL = process.env.NEXT_PATIENT_APP_URL ?? "/";
  const FACILITY_APP_URL = process.env.NEXT_FACILITY_APP_URL ?? "/";
  const accountDetails: Record<
    AccountType,
    { accountUrl: string; icon: React.ReactNode; accountName: string }
  > = {
    patient: {
      accountUrl: PATIENT_APP_URL,
      icon: <UserStar size="30" />,
      accountName: "Patient Account",
    },
    healthcare_provider: {
      accountUrl: PROVIDER_APP_URL,
      icon: <LucideStethoscope size="30" />,
      accountName: "Healthcare Provider Account",
    },
    facility_manager: {
      accountUrl: FACILITY_APP_URL,
      icon: <LucideHospital size="30" />,
      accountName: "Facility Account",
    },
    branch_manager: {
      accountUrl: FACILITY_APP_URL,
      icon: <LucideHospital size="30" />,
      accountName: "Facility Account",
    },
  };

  try {
    const res = await axiosServer.get(`identity/${pathParams.userId}/accounts`);
    accountsData = res.data;
    console.log("AUTH", res.data);
  } catch (err: unknown) {
    console.error(err);
  }
  return (
    <>
      {accountsData ? (
        accountsData?.accounts.length === 1 ? (
          redirect(
            `${accountDetails[accountsData.accounts[0].account_type].accountUrl}?identity=${pathParams.userId}&auth_tkn=${auth_tkn}`,
          )
        ) : (
          <div className="min-h-screen p-4">
            <p className="text-2xl font-bold">
              VERI <span className="text-blue-500">DOCTOR</span>
            </p>
            <div className="w-full flex flex-col items-center justify-center min-h-[70vh] my-8">
              {accountsData ? (
                <>
                  <p className="font-bold">
                    Hi, {accountsData?.identity?.first_name}
                  </p>
                  {accountsData.accounts.length > 1 ? (
                    <>
                      <p>Select an account to proceed.</p>
                      <div className="flex flex-wrap gap-4 my-4">
                        {accountsData.accounts.map((account, index) => (
                          <Link
                            key={index}
                            href={`${accountDetails[account.account_type].accountUrl}?identity=${pathParams.userId}&auth_tkn=${auth_tkn}`}
                          >
                            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg w-[250px] min-h-[200px] cursor-pointer bg-white shadow-sm border hover:border-none hover:bg-primary/20 transition-colors">
                              {accountDetails[account.account_type]?.icon}
                              <p>{account?.name}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p>You have no accounts.</p>
                      <Link href={`/auth/create-account/${pathParams.userId}`}>
                        <Button>Create one</Button>
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <p> No accounts found. Please contact support. </p>
              )}
            </div>
          </div>
        )
      ) : (
        <p>Something went wrong. Please check back later or contact support</p>
      )}
    </>
  );
}
