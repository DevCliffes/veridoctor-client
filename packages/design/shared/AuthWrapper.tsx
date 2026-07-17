import * as React from "react";

export type TokenPayload = {
  a_token: string;
  refresh_token: string;
};

// Same key/shape as setPendingRedirect()/consumePendingRedirect() in
// @veridoctor/api-client's axios-client.ts. Duplicated here (rather than
// importing from api-client) to avoid adding a new cross-package
// dependency from @veridoctor/design/shared -- this component is already
// shared between apps/provider and apps/health-portal on its own, and
// keeping it self-contained matches how the rest of the auth cookie logic
// in this codebase is already duplicated per-package rather than shared.
const PENDING_REDIRECT_KEY = "vd_pending_redirect";
const PENDING_REDIRECT_MAX_AGE_SECONDS = 600; // 10 minutes

function setPendingRedirectCookie(path: string): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (!path || path === "/") return; // nothing worth remembering
  const domain = window.location.hostname.includes("veridoctor.com")
    ? "; domain=.veridoctor.com"
    : "";
  document.cookie = `${PENDING_REDIRECT_KEY}=${encodeURIComponent(
    path
  )};path=/${domain};max-age=${PENDING_REDIRECT_MAX_AGE_SECONDS};secure;samesite=lax`;
}

function getSafeLoginUrl(loginUrl?: string): string {
  if (loginUrl && loginUrl.startsWith("https://")) {
    return loginUrl;
  }
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
  ensureAccessToken,
}: {
  authInfo: {
    isLoggedIn: boolean;
    auth_code: string | null;
    identity: string | null;
    loginUrl?: string;
  };
  setAuthInfo: (token: TokenPayload) => void;
  ensureAccessToken: () => Promise<string | null>;
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
    // whatever auth_code sat in Redux -- with no idea whether that code was
    // already consumed elsewhere (e.g. page.tsx's handoff flow already
    // exchanged it via the cookie-based ensure-fn). A one-time-use
    // auth_code being spent twice always fails the second time, which
    // marked the user unauthenticated and bounced them to /auth/login even
    // though a valid session already existed. Routing through the
    // ensureAccessToken prop instead means: if a valid access-token
    // cookie already exists, it's reused with no network call; if a
    // cookie-based exchange is already in flight, this awaits the same
    // promise instead of racing it with a second, redundant exchange.
    // FIX 2: ensureAccessToken is now passed in as a prop rather than
    // hardcoded to ensurePatientAccessToken, since this component is
    // shared between apps/provider and apps/health-portal -- each app
    // must supply the ensure-fn that matches its own cookie namespace.
    ensureAccessToken()
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
      // CHANGED: previously redirected straight to
      // `${loginBase}/auth/login?redirect=<path>`. Now we stash the path
      // in the same pending-redirect cookie the axios-client response
      // interceptor uses, and send the user to the homepage instead --
      // the login page reads it back via consumePendingRedirect() once
      // they log in again.
      const loginBase = getSafeLoginUrl(authInfo.loginUrl);
      setPendingRedirectCookie(window.location.pathname + window.location.search);
      const timer = setTimeout(() => {
        window.location.href = `${loginBase}/`;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [checked, isAuthenticated, authInfo.loginUrl]);

  if (!checked) return null;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}

export { AuthWrapper };
