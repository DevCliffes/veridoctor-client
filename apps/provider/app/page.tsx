"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "./hooks";
import { useEffect, Suspense } from "react";
import { setAuthCode, setUserId, setAccessToken, setIsLoggedIn } from "@veridoctor/store";
import { persistProviderSession, ensureProviderAccessToken } from "@veridoctor/api-client";
import { PageLoader } from "@veridoctor/design/shared";

function HomeContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();

  useEffect(() => {
    const authTkn = searchParams.get("auth_tkn");
    const identity = searchParams.get("identity");
    const redirect = searchParams.get("redirect");

    async function completeHandoff() {
      if (authTkn) dispatch(setAuthCode(authTkn));
      if (identity) dispatch(setUserId(identity));

      if (authTkn && identity) {
        // Mirrors health-portal's fixed handoff: write the vd_provider_auth_code /
        // vd_provider_identity cookies that maybeAuthoriseProvider() in
        // axios-client.ts actually reads, then wait for the one-time
        // code -> access-token exchange to finish before navigating.
        persistProviderSession(authTkn, identity);
        const token = await ensureProviderAccessToken();
        // Without this, Redux's access_token stays undefined even though the
        // cookie-based exchange above succeeded, so AuthWrapper would see
        // isLoggedIn as false and attempt its own re-exchange using the SAME
        // (already-consumed) auth_code — which fails and bounces to login.
        if (token) {
          dispatch(setAccessToken(token));
          dispatch(setIsLoggedIn());
        }
      }
      router.push(redirect ?? "/dashboard");
    }
    completeHandoff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <PageLoader />;
}

export default function Home() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HomeContent />
    </Suspense>
  );
}
