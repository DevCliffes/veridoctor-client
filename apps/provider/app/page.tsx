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
    dispatch(setAuthCode(searchParams.get("auth_tkn")));
    dispatch(setUserId(searchParams.get("identity")));
    router.push("/dashboard");
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
