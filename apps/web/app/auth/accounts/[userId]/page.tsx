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

// FIX (post-login redirect loop / 404 on e.g. /records?identity=...):
// previously this appended redirectPath directly onto safeBase BEFORE the
// query string (e.g. `${safeBase}${redirectPath}?identity=...&auth_tkn=...`).
// That sent the browser straight to an arbitrary app page (e.g.
// /records?identity=<old-id>) carrying raw identity/auth_tkn query params
// which that page has no idea how to consume -- only the handoff route at
// the app's root (Home/page.tsx in apps/provider and apps/health-portal)
// knows to call persistProviderSession()/persistPatientSession() and write
// the actual auth cookies. It also meant redirectPath's own query string
// (e.g. "?identity=<record-id>") collided with our own identity/auth_tkn
// params in one flat query string, silently corrupting both -- which is
// why the identity you'd see on the final URL was sometimes the stashed
// record id instead of the fresh user id.
//
// Fix: always land on the app's root (the handoff route), and always pass
// the intended final destination through as a `redirect` param instead of
// appending it to the path directly. The handoff route persists the
// session first, then does its own clean client-side navigation to
// `redirect` with no tokens attached.
function buildDestination(
  appBaseUrl: string,
  userId: string,
  authCode: string,
  redirectPath: string,
): string {
  const safeBase =
    appBaseUrl && appBaseUrl.startsWith("https://") ? appBaseUrl : null;

  const params = new URLSearchParams({ identity: userId, auth_tkn: authCode });
  if (redirectPath && redirectPath !== "/") {
    params.set("redirect", redirectPath);
  }

  if (!safeBase) {
    // Local/relative fallback (e.g. no app-specific base URL configured)
    // must also route through the handoff route at "/", not straight to
    // redirectPath.
    return `/?${params.toString()}`;
  }

  return `${safeBase}?${params.toString()}`;
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

  type AccountDetail = { appBaseUrl: string; icon: React.ReactNode; accountName: string };
  const accountDetails: { [K in AccountType]: AccountDetail } = {
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
    // FIX: previously called with no auth at all -- authCode was parsed
    // from the URL above but never actually sent anywhere on this
    // request. That was harmless while IdentityAccountsView had no
    // permission check, but once that view started requiring proof of
    // ownership, every single call here failed (this page runs BEFORE
    // any access token/cookie exists -- the auth_code from LoginView is
    // the only credential available at this point in the flow). Passed
    // as a query param so the backend can validate it against the
    // pending AuthCode row without consuming it.
    const res = await axiosServer.get(`identity/${pathParams.userId}/accounts`, {
      params: { auth_tkn: authCode },
    });
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
                {/* FIX: this link previously dropped auth_tkn entirely, so
                    RegisterAccount (and everything under it -- ProviderForm,
                    FacilityForm) had no credential to send on account
                    creation and every POST /identity/<id>/accounts call
                    403'd. Carrying the same auth_tkn through here. */}
                <Link href={`/auth/create-account/${pathParams.userId}?auth_tkn=${authCode}`}>
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
