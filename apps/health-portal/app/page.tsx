"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "./hooks";
import { useEffect, Suspense } from "react";
import { setAuthCode, setUserId } from "@veridoctor/store";
import { PageLoader } from "@veridoctor/design/shared";

function HomeContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();

  useEffect(() => {
    dispatch(setAuthCode(searchParams.get("auth_tkn")));
    dispatch(setUserId(searchParams.get("identity")));

    // If the user was sent here from the public homepage "View profile"
    // button, a `redirect` param will be present, e.g:
    //   ?auth_tkn=...&identity=...&redirect=/book/provider/abc-123
    // Send them there instead of the default dashboard.
    const redirect = searchParams.get("redirect");
    router.push(redirect ?? "/dashboard");
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
