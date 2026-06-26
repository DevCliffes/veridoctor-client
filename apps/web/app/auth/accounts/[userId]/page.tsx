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
  identity: { first_name: string; last_name: string };
  accounts: [{ account_type: AccountType; id: string; name: string }];
};

function buildDestination(
  appBaseUrl: string,
  userId: string,
  authCode: string,
  redirectPath: string,
): string {
  const safeBase =
    appBaseUrl && appBaseUrl.startsWith("https://") ? appBaseUrl : null;

  if (!safeBase) {
    return `/?identity=${userId}&auth_tkn=${authCode}`;
  }

  const landing =
    redirectPath && redirectPath !== "/" && redirectPath !== "%2F"
      ? redirectPath
      : "";

  return `${safeBase}${landing}?identity=${userId}&auth_tkn=${authCode}`;
}

export default async function AccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const pathParams = await params;
  const resolvedSearch = await searchParams;

  const auth_tkn = resolvedSearch["auth_tkn"];
  const redirectParam = resolvedSearch["redirect"];

  const authCode = Array.isArray(auth_tkn) ? auth_tkn[0] : (auth_tkn ?? "");
  const redirectPath = redirectParam
    ? decodeURIComponent(
        Array.isArray(redirectParam) ? redirectParam[0] : redirectParam,
      )
    : "/";

  const PROVIDER_APP_URL = process.env.NEXT_PUBLIC_PROVIDER_APP_URL ?? "";
  const PATIENT_APP_URL = process.env.NEXT_PUBLIC_PATIENT_APP_URL ?? "";
  const FACILITY_APP_URL = process.env.NEXT_PUBLIC_FACILITY_APP_URL ?? "";

  const accountDetails: Record
    AccountType,
    { appBaseUrl: string; icon: React.ReactNode; accountName: string }
  > = {
    patient: {
      appBaseUrl: PATIENT_APP_URL,
      icon: <UserStar size="30" />,
      accountName: "Patient Account",
    },
    healthcare_provider: {
      appBaseUrl: PROVIDER_APP_URL,
      icon: <LucideStethoscope size="30" />,
      accountName: "Healthcare Provider Account",
    },
    facility_manager: {
      appBaseUrl: FACILITY_APP_URL,
      icon: <LucideHospital size="30" />,
      accountName: "Facility Account",
    },
    branch_manager: {
      appBaseUrl: FACILITY_APP_URL,
      icon: <LucideHospital size="30" />,
      accountName: "Facility Account",
    },
  };

  let accountsData: AccountsResponse | null = null;

  try {
    const res = await axiosServer.get(`identity/${pathParams.userId}/accounts`);
    accountsData = res.data;
  } catch (err) {
    console.error(err);
  }

  if (accountsData?.accounts.length === 1) {
    const account = accountsData.accounts[0];
    const destination = buildDestination(
      accountDetails[account.account_type].appBaseUrl,
      pathParams.userId,
      authCode,
      redirectPath,
    );
    redirect(destination);
  }

  return (
    <>
      {accountsData ? (
        <div className="min-h-screen p-4">
          <p className="text-2xl font-bold">
            VERI <span className="text-blue-500">DOCTOR</span>
          </p>
          <div className="w-full flex flex-col items-center justify-center min-h-[70vh] my-8">
            <p className="font-bold">Hi, {accountsData.identity?.first_name}</p>
            {accountsData.accounts.length > 1 ? (
              <>
                <p>Select an account to proceed.</p>
                <div className="flex flex-wrap gap-4 my-4">
                  {accountsData.accounts.map((account, index) => {
                    const destination = buildDestination(
                      accountDetails[account.account_type].appBaseUrl,
                      pathParams.userId,
                      authCode,
                      redirectPath,
                    );
                    return (
                      <Link key={index} href={destination}>
                        <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg w-[250px] min-h-[200px] cursor-pointer bg-white shadow-sm border hover:border-none hover:bg-primary/20 transition-colors">
                          {accountDetails[account.account_type]?.icon}
                          <p>{account?.name}</p>
                        </div>
                      </Link>
                    );
                  })}
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
          </div>
        </div>
      ) : (
        <p>Something went wrong. Please check back later or contact support</p>
      )}
    </>
  );
}
