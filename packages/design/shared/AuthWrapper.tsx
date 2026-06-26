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
  const checkLoginStatus = (): boolean => {
    if (!authInfo.isLoggedIn) {
      if (!authInfo.identity || !authInfo.auth_code) return false;

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
          return true;
        })
        .catch((err) => {
          console.error(err);
          return false;
        });
    }
    return true;
  };

  const isAuthenticated = checkLoginStatus();

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      const loginBase = getSafeLoginUrl();
      const redirectPath = encodeURIComponent(window.location.pathname);
      setTimeout(() => {
        window.location.href = `${loginBase}/auth/login?redirect=${redirectPath}`;
      }, 300);
    }
    return null;
  }

  return <>{children}</>;
}

export { AuthWrapper };
