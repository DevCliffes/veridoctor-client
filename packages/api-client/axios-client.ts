import axios from "axios";
import {
  PATIENT_ACCESS_TOKEN_KEY,
  PATIENT_AUTH_CODE_KEY,
  PATIENT_IDENTITY_KEY,
  PATIENT_REFRESH_TOKEN_KEY,
  PROVIDER_ACCESS_TOKEN_KEY,
  PROVIDER_AUTH_CODE_KEY,
  PROVIDER_IDENTITY_KEY,
  PROVIDER_REFRESH_TOKEN_KEY,
} from "./constants";

// Shared across patient + provider apps: where to stash the path a user was
// on before we bounce them to the homepage on timeout/unauthenticated
// access, so the login page can send them back after they log in again.
const PENDING_REDIRECT_KEY = "vd_pending_redirect";
const PENDING_REDIRECT_MAX_AGE_SECONDS = 600; // 10 minutes -- long enough to
// cover "got timed out, went and made coffee, came back and logged in",
// short enough that a stale cookie from a long-abandoned session doesn't
// resurface and redirect someone somewhere unexpected days later.

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const domain = window.location.hostname.includes("veridoctor.com")
    ? "; domain=.veridoctor.com"
    : "";
  document.cookie = `${name}=${encodeURIComponent(value)};path=/${domain};secure;samesite=lax`;
}

function setCookieWithMaxAge(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  const domain = window.location.hostname.includes("veridoctor.com")
    ? "; domain=.veridoctor.com"
    : "";
  document.cookie = `${name}=${encodeURIComponent(value)};path=/${domain};max-age=${maxAgeSeconds};secure;samesite=lax`;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  const domain = window.location.hostname.includes("veridoctor.com")
    ? "; domain=.veridoctor.com"
    : "";
  document.cookie = `${name}=;path=/${domain};max-age=0;secure;samesite=lax`;
}

// Call before redirecting an involuntarily-logged-out user to the homepage,
// so the login page can send them back to where they were.
function setPendingRedirect(path: string): void {
  if (!path || path === "/") return; // nothing worth remembering
  setCookieWithMaxAge(PENDING_REDIRECT_KEY, path, PENDING_REDIRECT_MAX_AGE_SECONDS);
}

// Call once, on the login page, to read AND clear the pending redirect so
// it can't leak into an unrelated later visit. Returns null if there
// wasn't one (e.g. the user navigated to /auth/login directly).
function consumePendingRedirect(): string | null {
  const value = getCookie(PENDING_REDIRECT_KEY);
  if (value) clearCookie(PENDING_REDIRECT_KEY);
  return value;
}

// FIX (login loop): wipes every auth cookie for both patient and provider
// apps. Called (a) whenever a brand-new session is persisted after a fresh
// login, and (b) on any forced logout (401/403). Previously, an expired
// session left the old access_token/refresh_token/auth_code cookies sitting
// on disk untouched. On the next login, maybeAuthorise() would try that
// stale refresh_token *before* ever looking at the brand-new auth_code just
// issued by the login the user is currently completing. If the old refresh
// token was dead server-side (which it is, by definition, once the session
// that issued it has expired), that request 401'd, the response interceptor
// treated it as a fresh auth failure, set vd_pending_redirect again, and
// bounced back to the homepage -- indistinguishable from the login never
// having worked at all. Clearing all auth cookies at both of these points
// means a dead token can never be picked back up again.
function clearAllAuthCookies(): void {
  clearCookie(PATIENT_ACCESS_TOKEN_KEY);
  clearCookie(PATIENT_REFRESH_TOKEN_KEY);
  clearCookie(PATIENT_AUTH_CODE_KEY);
  clearCookie(PATIENT_IDENTITY_KEY);
  clearCookie(PROVIDER_ACCESS_TOKEN_KEY);
  clearCookie(PROVIDER_REFRESH_TOKEN_KEY);
  clearCookie(PROVIDER_AUTH_CODE_KEY);
  clearCookie(PROVIDER_IDENTITY_KEY);
}

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

// NOTE: confirm this matches how apps/provider is actually served
// (subdomain vs path) before relying on this in the request interceptor.
function isProviderApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.startsWith("provider.");
}

// FIX: maybeAuthorise()/maybeAuthoriseProvider() previously returned a
// cached access-token cookie purely based on presence, with no check on
// whether it had actually expired. Once a token expired, every subsequent
// authenticated request went out with a dead token, got a 401 "Access
// token has expired" response, and the response interceptor bounced the
// user to /auth/login -- but the stale cookie was never cleared, so the
// same dead token was picked up again on the next load, causing a login
// loop. This decodes the JWT payload (no signature verification needed
// client-side, we just need `exp`) and treats it as expired slightly
// before its real expiry so a token that's about to die mid-request
// doesn't slip through.
function isTokenExpired(token: string): boolean {
  try {
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (!payload.exp) return false; // no exp claim -- treat as non-expiring
    // 30s buffer so a token that's about to expire mid-request doesn't slip through
    return Date.now() >= payload.exp * 1000 - 30_000;
  } catch {
    return true; // unparseable token -- treat as expired, force re-auth
  }
}

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
});

// ── Patient auth ────────────────────────────────────────────────
let authorisePromise: Promise<string | null> | null = null;

// FIX (intermittent 401s, e.g. on /records/pin/status): auth_code minted at
// login is single-use -- TokenView deletes the AuthCode row the moment it's
// exchanged. maybeAuthorise() previously re-used the *same* stored auth_code
// cookie every time the access token expired, which works exactly once. On
// every subsequent expiry the exchange 500s server-side (AuthCode.DoesNotExist),
// the .catch(() => null) below swallows that, and the request goes out with
// no Authorization header at all -- indistinguishable from "not logged in"
// to any endpoint using IsAuthenticated. This mints a fresh access token from
// the long-lived refresh_token instead (which TokenView already returns --
// it just wasn't being persisted), and only falls back to the one-time
// auth_code exchange if no refresh token has been stored yet.
//
// FIX (login loop): if the refresh call itself fails, the refresh_token is
// dead (expired/invalidated server-side) and must be cleared immediately.
// Previously it was left in place, so it kept getting tried -- and kept
// failing -- ahead of any newly-issued auth_code on every subsequent login
// attempt, which is what produced the post-expiry login loop.
async function refreshPatientAccessToken(): Promise<string | null> {
  const refreshToken = getCookie(PATIENT_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/identity/refresh-token`,
      { refresh_token: refreshToken }
    );
    const { a_token } = res.data;
    setCookie(PATIENT_ACCESS_TOKEN_KEY, a_token);
    return a_token as string;
  } catch {
    // Refresh token itself is dead/invalid (e.g. >1 day old, per
    // RefreshTokenView's own docstring). Clear both cookies so this dead
    // token isn't retried again on the next call -- fall through cleanly
    // to the auth_code exchange / eventual re-login instead.
    clearCookie(PATIENT_REFRESH_TOKEN_KEY);
    clearCookie(PATIENT_ACCESS_TOKEN_KEY);
    return null;
  }
}

async function maybeAuthorise(): Promise<string | null> {
  // health-portal is patient-facing, so it must read the patient-scoped
  // cookies (vd_patient_*), not the legacy generic ones (access_token,
  // auth_code, identity) which are no longer being written by login and
  // were causing every authenticated request to go out with no token.
  const token = getCookie(PATIENT_ACCESS_TOKEN_KEY);
  if (token && !isTokenExpired(token)) return token;
  if (authorisePromise) return authorisePromise;

  authorisePromise = (async () => {
    const refreshed = await refreshPatientAccessToken();
    if (refreshed) return refreshed;

    // No usable refresh token yet -- fall back to the original one-time
    // auth_code exchange (e.g. the very first authenticated request right
    // after the post-login handoff page, before any refresh token exists).
    const authCode = getCookie(PATIENT_AUTH_CODE_KEY);
    const identity = getCookie(PATIENT_IDENTITY_KEY);
    if (!authCode || !identity) return null;
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise`,
        null,
        { params: { auth_code: authCode, identity } }
      );
      const { a_token, refresh_token } = res.data;
      setCookie(PATIENT_ACCESS_TOKEN_KEY, a_token);
      if (refresh_token) setCookie(PATIENT_REFRESH_TOKEN_KEY, refresh_token);
      return a_token as string;
    } catch {
      return null;
    }
  })().finally(() => {
    authorisePromise = null;
  });

  return authorisePromise;
}

// FIX (login loop, primary fix): a brand-new login must always win over
// whatever auth state is left from a previous session. Previously this
// only wrote the new auth_code/identity, leaving any old access_token /
// refresh_token cookies in place. maybeAuthorise() checks refresh_token
// *before* auth_code, so a stale (server-dead) refresh token from the
// expired session kept getting tried first on the very login that was
// meant to replace it -- 401, forced logout, redirect home, loop. Clearing
// the old tokens here guarantees the fresh auth_code is what actually gets
// used on the first authenticated request after this login.
//
// FIX: the post-login handoff page (apps/health-portal/app/page.tsx) receives
// ?auth_tkn=...&identity=... as URL query params and previously only
// dispatched them into Redux, which maybeAuthorise() above never reads --
// it reads document.cookie. That meant vd_patient_auth_code /
// vd_patient_identity were never written, so maybeAuthorise() always
// returned null immediately, every request went out with no Authorization
// header, and the response interceptor's 401 handler bounced straight back
// to /auth/login on every page load. These two exports let the handoff page
// write the cookies maybeAuthorise() actually reads, and wait for the
// code -> access-token exchange to finish before navigating anywhere.
function persistPatientSession(authCode: string, identity: string): void {
  clearCookie(PATIENT_ACCESS_TOKEN_KEY);
  clearCookie(PATIENT_REFRESH_TOKEN_KEY);
  setCookie(PATIENT_AUTH_CODE_KEY, authCode);
  setCookie(PATIENT_IDENTITY_KEY, identity);
}

async function ensurePatientAccessToken(): Promise<string | null> {
  return maybeAuthorise();
}

// ── Provider auth ───────────────────────────────────────────────
let providerAuthorisePromise: Promise<string | null> | null = null;

// Mirrors refreshPatientAccessToken() but for the vd_provider_* cookies,
// including the same dead-refresh-token cleanup on failure.
async function refreshProviderAccessToken(): Promise<string | null> {
  const refreshToken = getCookie(PROVIDER_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/identity/refresh-token`,
      { refresh_token: refreshToken }
    );
    const { a_token } = res.data;
    setCookie(PROVIDER_ACCESS_TOKEN_KEY, a_token);
    return a_token as string;
  } catch {
    clearCookie(PROVIDER_REFRESH_TOKEN_KEY);
    clearCookie(PROVIDER_ACCESS_TOKEN_KEY);
    return null;
  }
}

async function maybeAuthoriseProvider(): Promise<string | null> {
  // Mirrors maybeAuthorise() but reads/writes the vd_provider_* cookies
  // instead of vd_patient_*. AuthWrapper is shared between apps/provider
  // and apps/health-portal, so each app must supply its own ensure-fn
  // rather than both silently sharing the patient-only implementation
  // (that mismatch was the root cause of the provider auto-logout bug).
  const token = getCookie(PROVIDER_ACCESS_TOKEN_KEY);
  if (token && !isTokenExpired(token)) return token;
  if (providerAuthorisePromise) return providerAuthorisePromise;

  providerAuthorisePromise = (async () => {
    const refreshed = await refreshProviderAccessToken();
    if (refreshed) return refreshed;

    const authCode = getCookie(PROVIDER_AUTH_CODE_KEY);
    const identity = getCookie(PROVIDER_IDENTITY_KEY);
    if (!authCode || !identity) return null;
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise`,
        null,
        { params: { auth_code: authCode, identity } }
      );
      const { a_token, refresh_token } = res.data;
      setCookie(PROVIDER_ACCESS_TOKEN_KEY, a_token);
      if (refresh_token) setCookie(PROVIDER_REFRESH_TOKEN_KEY, refresh_token);
      return a_token as string;
    } catch {
      return null;
    }
  })().finally(() => {
    providerAuthorisePromise = null;
  });

  return providerAuthorisePromise;
}

// FIX (login loop): mirrors persistPatientSession() -- clear any stale
// provider access/refresh tokens before writing the fresh auth_code/identity
// from this login, so a dead token from a previous session can't be tried
// ahead of it.
function persistProviderSession(authCode: string, identity: string): void {
  clearCookie(PROVIDER_ACCESS_TOKEN_KEY);
  clearCookie(PROVIDER_REFRESH_TOKEN_KEY);
  setCookie(PROVIDER_AUTH_CODE_KEY, authCode);
  setCookie(PROVIDER_IDENTITY_KEY, identity);
}

async function ensureProviderAccessToken(): Promise<string | null> {
  return maybeAuthoriseProvider();
}

const PUBLIC_PATHS = [
  "/identity/login",
  "/identity/authorise",
  "/identity/register",
  "/identity/reset-password",
  "/identity/reset-password/confirm",   // corrected — was "/identity/confirm-reset-password"
  "/identity/send-otp",
  "/identity/verify-otp",
];

function isPublicPath(url?: string): boolean {
  if (!url) return false;
  let path = url.split("?")[0];
  if (!path.startsWith("/")) path = "/" + path;
  return PUBLIC_PATHS.includes(path);
}

// Endpoints where a 403 is an expected, non-auth business response (e.g.
// "no approved access grant for this category" or "grant has expired")
// rather than a sign the practitioner's own session/token is invalid.
// Without this, the global response interceptor below can't tell the two
// cases apart and force-logs the practitioner out just for clicking an
// approved-record category whose grant happens to be expired or missing --
// a 403 there is a normal, anticipated outcome, not an auth failure.
//
// NOTE (separate, known issue -- not fixed here): this list is a substring
// allowlist and is not exhaustive -- e.g. /records/pin/status is not
// covered by either pattern below, so a business 403 from that endpoint
// still force-logs the user out. Track/fix this separately from the login
// loop fix above; ideally replace this with an explicit error-code check
// in the 403 response body instead of a path allowlist.
const EXPECTED_FORBIDDEN_PATH_PATTERNS = [
  "/granted-records/",
  "/records/patient/",
];

function isExpectedForbidden(url?: string): boolean {
  if (!url) return false;
  return EXPECTED_FORBIDDEN_PATH_PATTERNS.some((p) => url.includes(p));
}

axiosClient.interceptors.request.use(async (config) => {
  if (isPublicPath(config.url)) {
    return config;
  }
  const token = isProviderApp()
    ? await maybeAuthoriseProvider()
    : await maybeAuthorise();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url as string | undefined;
    const isPublic = isPublicPath(requestUrl);
    const status = error.response?.status;

    // A 401 always means the practitioner's own token is bad -- always log
    // out. A 403 means "not allowed to do this specific thing", which is
    // sometimes an auth problem and sometimes just an expected business
    // rule (see isExpectedForbidden above) -- only log out for the former.
    const shouldLogout =
      !isPublic &&
      (status === 401 || (status === 403 && !isExpectedForbidden(requestUrl)));

    if (shouldLogout) {
      if (typeof window !== "undefined") {
        // CHANGED: previously redirected straight to
        // `${loginBase}/auth/login?redirect=<path>`. Now we stash the path
        // in a short-lived cookie and send the user to the homepage
        // instead -- the login page picks the pending redirect back up via
        // consumePendingRedirect() once they log in again. This lets an
        // involuntary logout (timeout / expired session) land people on
        // the main site rather than dropping them straight on a bare login
        // form, while still returning them to what they were doing.
        const loginBase = getSafeLoginUrl();
        setPendingRedirect(window.location.pathname + window.location.search);

        // FIX (login loop): wipe every auth cookie the moment we force a
        // logout. Previously the dead access_token/refresh_token/auth_code
        // cookies were left in place, so the next login attempt's very
        // first authenticated request picked the dead refresh_token back
        // up in maybeAuthorise(), 401'd again, hit this same branch again,
        // and looped indefinitely. A forced logout must always leave a
        // clean slate for the next login.
        clearAllAuthCookies();

        window.location.href = `${loginBase}/`;
      }
    }
    return Promise.reject(error);
  }
);

export {
  axiosClient,
  persistPatientSession,
  ensurePatientAccessToken,
  persistProviderSession,
  ensureProviderAccessToken,
  setPendingRedirect,
  consumePendingRedirect,
  clearAllAuthCookies,
};
