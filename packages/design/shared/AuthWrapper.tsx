import * as React from "react";

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

// FIX: treat the literal strings "null"/"undefined" the same as a real
// missing value — these can end up in props if an upstream cookie/store
// value was ever poisoned (see cookieStorage.ts / authSlice.ts fixes).
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

  // FIX: this used to run as a synchronous side effect during render,
  // which meant it also fired during Next.js's server-side render pass
  // (before cookies/hydration were available) — that's why requests
  // were showing up server-side with literal "undefined" params and
  // userAgent="node" in the logs. Moving this into useEffect ensures
  // it only ever runs client-side, after real values are available.
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

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise?auth_code=${authInfo.auth_code}&identity=${authInfo.identity}`,
      { method: "POST" }
    )
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then((result: TokenPayload) => {
        setAuthInfo(result);
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
