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

// Used on hard-failure (refresh token itself dead/invalid) so a stale,
// unusable cookie doesn't get picked up again on the next request and
// keep failing silently. Setting max-age=0 deletes the cookie outright.
function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  const domain = window.location.hostname.includes("veridoctor.com")
    ? "; domain=.veridoctor.com"
    : "";
  document.cookie = `${name}=;path=/${domain};max-age=0;secure;samesite=lax`;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ── Patient auth ────────────────────────────────────────────────
let authorisePromise: Promise<string | null> | null = null;

// Exchanges a still-valid refresh token for a new access token via
// /identity/refresh-token. This is the normal path for a session that's
// been open a while — it does NOT touch auth_code at all, so it works
// even though auth_code was already consumed (one-time-use) back at
// initial login. Returns null on any failure (refresh token expired,
// tampered, or missing) so the caller can fall back appropriately.
async function refreshPatientAccessToken(): Promise<string | null> {
  const refreshToken = getCookie(PATIENT_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${API_URL}/identity/refresh-token`, {
      refresh_token: refreshToken,
    });
    const { a_token } = res.data;
    if (!a_token) return null;
    setCookie(PATIENT_ACCESS_TOKEN_KEY, a_token);
    return a_token as string;
  } catch {
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
    // 1. Access token is missing/expired — try the refresh token first.
    // This is the path that runs every time a session that's been open
    // a while needs a new access token. auth_code is one-time-use and
    // will already be gone by this point in any long-lived session, so
    // it must never be the primary path here.
    const refreshed = await refreshPatientAccessToken();
    if (refreshed) return refreshed;

    // 2. No usable refresh token (e.g. very first token issuance right
    // after the login handoff, before a refresh token has ever been
    // stored, or the refresh token itself has now expired/been revoked).
    // Fall back to the auth_code exchange -- but only ever as a
    // best-effort attempt. If auth_code has already been consumed (the
    // normal case for anything but a brand-new login), this will fail
    // and that's expected, not a bug.
    const authCode = getCookie(PATIENT_AUTH_CODE_KEY);
    const identity = getCookie(PATIENT_IDENTITY_KEY);
    if (!authCode || !identity) return null;

    try {
      const res = await axios.post(
        `${API_URL}/identity/authorise`,
        null,
        { params: { auth_code: authCode, identity } }
      );
      const { a_token, refresh_token } = res.data;
      setCookie(PATIENT_ACCESS_TOKEN_KEY, a_token);
      if (refresh_token) setCookie(PATIENT_REFRESH_TOKEN_KEY, refresh_token);
      return a_token as string;
    } catch {
      // 3. Both refresh and auth_code exchange failed -- this is a genuine
      // dead session, not a transient hiccup. Clear the stale auth_code/
      // identity cookies so they can't be retried again on every
      // subsequent request (which previously just kept silently failing
      // forever until the response interceptor's 401 handler happened to
      // fire). Letting this fall through to a real 401 and a real
      // redirect-to-login is the correct behaviour here.
      clearCookie(PATIENT_AUTH_CODE_KEY);
      clearCookie(PATIENT_IDENTITY_KEY);
      clearCookie(PATIENT_ACCESS_TOKEN_KEY);
      clearCookie(PATIENT_REFRESH_TOKEN_KEY);
      return null;
    }
  })().finally(() => {
    authorisePromise = null;
  });

  return authorisePromise;
}

function persistPatientSession(authCode: string, identity: string): void {
  setCookie(PATIENT_AUTH_CODE_KEY, authCode);
  setCookie(PATIENT_IDENTITY_KEY, identity);
}

async function ensurePatientAccessToken(): Promise<string | null> {
  return maybeAuthorise();
}

// ── Provider auth ───────────────────────────────────────────────
let providerAuthorisePromise: Promise<string | null> | null = null;

async function refreshProviderAccessToken(): Promise<string | null> {
  const refreshToken = getCookie(PROVIDER_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${API_URL}/identity/refresh-token`, {
      refresh_token: refreshToken,
    });
    const { a_token } = res.data;
    if (!a_token) return null;
    setCookie(PROVIDER_ACCESS_TOKEN_KEY, a_token);
    return a_token as string;
  } catch {
    return null;
  }
}

async function maybeAuthoriseProvider(): Promise<string | null> {
  // Mirrors maybeAuthorise() but reads/writes the vd_provider_* cookies
  // instead of vd_patient_*.
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
        `${API_URL}/identity/authorise`,
        null,
        { params: { auth_code: authCode, identity } }
      );
      const { a_token, refresh_token } = res.data;
      setCookie(PROVIDER_ACCESS_TOKEN_KEY, a_token);
      if (refresh_token) setCookie(PROVIDER_REFRESH_TOKEN_KEY, refresh_token);
      return a_token as string;
    } catch {
      clearCookie(PROVIDER_AUTH_CODE_KEY);
      clearCookie(PROVIDER_IDENTITY_KEY);
      clearCookie(PROVIDER_ACCESS_TOKEN_KEY);
      clearCookie(PROVIDER_REFRESH_TOKEN_KEY);
      return null;
    }
  })().finally(() => {
    providerAuthorisePromise = null;
  });

  return providerAuthorisePromise;
}

function persistProviderSession(authCode: string, identity: string): void {
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
  "/identity/confirm-reset-password",
  "/identity/send-otp",
  "/identity/verify-otp",
  "/identity/refresh-token",
];

function isPublicPath(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_PATHS.some((p) => url.includes(p));
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
    if (
      !isPublic &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      if (typeof window !== "undefined") {
        const loginBase = getSafeLoginUrl();
        const redirectPath = encodeURIComponent(window.location.pathname);
        window.location.href = `${loginBase}/auth/login?redirect=${redirectPath}`;
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
};
