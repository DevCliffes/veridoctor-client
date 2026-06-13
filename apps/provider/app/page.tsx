"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useDispatch } from "react-redux";
import { setAuthCode, setUserId } from "@veridoctor/store";
import { PageLoader } from "@veridoctor/design/shared";

function HomeContent() {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();

  useEffect(() => {
    const auth_tkn = searchParams.get("auth_tkn");
    const identity = searchParams.get("identity");

    if (auth_tkn) {
      dispatch(setAuthCode(auth_tkn));
      localStorage.setItem("vd_auth_code", auth_tkn);
    }
    if (identity) {
      dispatch(setUserId(identity));
      localStorage.setItem("vd_identity", identity);
    }

    router.push("/dashboard");
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
