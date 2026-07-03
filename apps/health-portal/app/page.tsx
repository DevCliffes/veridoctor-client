"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "./hooks";
import { useEffect, Suspense } from "react";
import { setAuthCode, setUserId } from "@veridoctor/store";
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
        // maybeAuthorise() in axios-client.ts actually reads (Redux alone
        // isn't enough — axios never looks at the store), then wait for the
        // code -> access-token exchange to finish before navigating away.
        // Otherwise the dashboard's first requests (notifications,
        // appointments) fire before any token exists and 401 immediately,
        // which the response interceptor treats as session-expired and
        // bounces straight back to /auth/login.
        persistPatientSession(authTkn, identity);
        await ensurePatientAccessToken();
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
