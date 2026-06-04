import * as React from "react";

export type TokenPayload = {
  a_token: string;
  refresh_token: string;
};

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
      /** TODO: stabilize fetch to make use of it here */
      if (!authInfo.identity || !authInfo.auth_code) return false;
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise?auth_code=${authInfo.auth_code}&identity=${authInfo.identity}`,
        {
          method: "POST",
        },
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
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
    const authUrl = process.env.NEXT_PUBLIC_WEB_APP_URL;
    if (typeof window !== "undefined" && authUrl) {
      setTimeout(() => {
        window.location.href = `${authUrl}/auth/login?redirect=true`;
      }, 300);
      return;
    }
    return null;
  }

  return <>{children}</>;
}

export { AuthWrapper };
