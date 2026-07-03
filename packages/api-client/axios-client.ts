import axios from "axios";
import {
  PATIENT_ACCESS_TOKEN_KEY,
  PATIENT_AUTH_CODE_KEY,
  PATIENT_IDENTITY_KEY,
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

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
});

let authorisePromise: Promise<string | null> | null = null;

async function maybeAuthorise(): Promise<string | null> {
  // health-portal is patient-facing, so it must read the patient-scoped
  // cookies (vd_patient_*), not the legacy generic ones (access_token,
  // auth_code, identity) which are no longer being written by login and
  // were causing every authenticated request to go out with no token.
  const token = getCookie(PATIENT_ACCESS_TOKEN_KEY);
  if (token) return token;
  if (authorisePromise) return authorisePromise;
  const authCode = getCookie(PATIENT_AUTH_CODE_KEY);
  const identity = getCookie(PATIENT_IDENTITY_KEY);
  if (!authCode || !identity) return null;
  authorisePromise = axios
    .post(
      `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise`,
      null,
      { params: { auth_code: authCode, identity } }
    )
    .then((res) => {
      const { a_token } = res.data;
      setCookie(PATIENT_ACCESS_TOKEN_KEY, a_token);
      return a_token as string;
    })
    .catch(() => null)
    .finally(() => {
      authorisePromise = null;
    });
  return authorisePromise;
}

// FIX: endpoints a user hits *before* having a valid session must never
// carry a stale/expired Authorization header. Previously every request —
// including the login POST itself — ran through maybeAuthorise() and, if a
// leftover (expired or otherwise invalid) vd_patient_access_token cookie
// existed from a prior session, attached it to /identity/login. The backend's
// global JWTAuthentication class then rejected the whole request with 401
// before LoginView.post() ever inspected the email/password — which the
// response interceptor below then treated as a session expiry and bounced
// straight back to the login page. Net effect: entering correct credentials
// still "logged you out immediately".
const PUBLIC_PATHS = [
  "/identity/login",
  "/identity/authorise",
  "/identity/register",
  "/identity/reset-password",
  "/identity/confirm-reset-password",
  "/identity/send-otp",
  "/identity/verify-otp",
];

function isPublicPath(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_PATHS.some((p) => url.includes(p));
}

axiosClient.interceptors.request.use(async (config) => {
  if (isPublicPath(config.url)) {
    return config;
  }
  const token = await maybeAuthorise();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // FIX: a 401 from a public endpoint (e.g. genuinely wrong login
    // credentials) must not trigger the "session expired, redirect to
    // login" flow — that's only meaningful for authenticated requests.
    // Without this check, a real "invalid credentials" response from
    // LoginView itself would immediately redirect back to /auth/login,
    // which looks identical to being logged out and swallows the actual
    // error message the login form is supposed to show.
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

export { axiosClient };
