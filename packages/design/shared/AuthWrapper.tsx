import * as React from "react";
import { ensurePatientAccessToken } from "@veridoctor/api-client";

export type TokenPayload = {
  a_token: string;
  refresh_token: string;
};

function getSafeLoginUrl(): string {
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL;
  if (webAppUrl && webAppUrl.startsWith("https://")) {
    return webAppUrl;
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return "";
}

function isRealValue(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value !== "" &&
    value !== "null" &&
    value !== "undefined"
  );
}

function AuthWrapper({
  authInfo,
  children,
  setAuthInfo,
}: {
  authInfo: {
    isLoggedIn: boolean;
    auth_code: string | null;
    identity: string | null;
  };
  setAuthInfo: (token: TokenPayload) => void;
  children: React.ReactNode;
}) {
  const [checked, setChecked] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    authInfo.isLoggedIn
  );

  React.useEffect(() => {
    if (authInfo.isLoggedIn) {
      setIsAuthenticated(true);
      setChecked(true);
      return;
    }
    if (!isRealValue(authInfo.identity) || !isRealValue(authInfo.auth_code)) {
      setIsAuthenticated(false);
      setChecked(true);
      return;
    }

    // FIX: this used to fire its own raw POST to /identity/authorise using
    // whatever auth_code sat in Redux — with no idea whether that code was
    // already consumed elsewhere (e.g. page.tsx's handoff flow already
    // exchanged it via the cookie-based maybeAuthorise()). A one-time-use
    // auth_code being spent twice always fails the second time, which
    // marked the user unauthenticated and bounced them to /auth/login even
    // though a valid session already existed. Routing through
    // ensurePatientAccessToken() instead means: if a valid access-token
    // cookie already exists, it's reused with no network call; if a
    // cookie-based exchange is already in flight, this awaits the same
    // promise instead of racing it with a second, redundant exchange.
    ensurePatientAccessToken()
      .then((token) => {
        if (!token) throw new Error("No access token");
        setAuthInfo({ a_token: token, refresh_token: "" });
        setIsAuthenticated(true);
      })
      .catch((err) => {
        console.error(err);
        setIsAuthenticated(false);
      })
      .finally(() => {
        setChecked(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authInfo.isLoggedIn, authInfo.identity, authInfo.auth_code]);

  React.useEffect(() => {
    if (!checked || isAuthenticated) return;
    if (typeof window !== "undefined") {
      const loginBase = getSafeLoginUrl();
      const redirectPath = encodeURIComponent(window.location.pathname);
      const timer = setTimeout(() => {
        window.location.href = `${loginBase}/auth/login?redirect=${redirectPath}`;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [checked, isAuthenticated]);

  if (!checked) return null;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}

export { AuthWrapper };
