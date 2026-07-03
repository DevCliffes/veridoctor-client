"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "./hooks";
import { useEffect, Suspense } from "react";
import { setAuthCode, setUserId, setAccessToken, setIsLoggedIn } from "@veridoctor/store";
import { persistPatientSession, ensurePatientAccessToken } from "@veridoctor/api-client";
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
        // Write the vd_patient_auth_code / vd_patient_identity cookies that
        // maybeAuthorise() in axios-client.ts actually reads, then wait for
        // the code -> access-token exchange to finish before navigating.
        persistPatientSession(authTkn, identity);
        const token = await ensurePatientAccessToken();

        // FIX: without this, Redux's access_token stays undefined even
        // though the cookie-based exchange above succeeded. (main)/layout.tsx
        // builds authInfo.isLoggedIn from Redux's access_token, so
        // AuthWrapper never saw us as logged in — it fell through to its
        // own independent re-exchange using the SAME auth_code, which had
        // already been consumed by ensurePatientAccessToken() above. That
        // second call failed (one-time-use code), AuthWrapper marked us
        // unauthenticated, and bounced us straight back to /auth/login.
        // Dispatching here makes authInfo.isLoggedIn true immediately, so
        // AuthWrapper takes its early-return branch instead of re-exchanging.
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
