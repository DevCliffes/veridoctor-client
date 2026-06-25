import axios from "axios";
import { ACCESS_TOKEN_KEY, AUTH_CODE_KEY, IDENTITY_KEY } from "./constants";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  // Share cookies across all *.veridoctor.com subdomains (www, app, provider,
  // telehealth) instead of scoping to whichever subdomain happened to set it.
  const domain = window.location.hostname.includes("veridoctor.com")
    ? "; domain=.veridoctor.com"
    : "";
  document.cookie = `${name}=${encodeURIComponent(value)};path=/${domain};secure;samesite=lax`;
}

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
});

// Shared in-flight promise so concurrent requests don't each trigger their
// own /identity/authorise call against a single-use auth_code.
let authorisePromise: Promise<string | null> | null = null;

async function maybeAuthorise(): Promise<string | null> {
  const token = getCookie(ACCESS_TOKEN_KEY);
  if (token) return token;

  if (authorisePromise) return authorisePromise;

  const authCode = getCookie(AUTH_CODE_KEY);
  const identity = getCookie(IDENTITY_KEY);
  if (!authCode || !identity) return null;

  authorisePromise = axios
    .post(
      `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise`,
      null,
      { params: { auth_code: authCode, identity } }
    )
    .then((res) => {
      const { a_token } = res.data;
      setCookie(ACCESS_TOKEN_KEY, a_token);
      return a_token as string;
    })
    .catch(() => null)
    .finally(() => {
      authorisePromise = null;
    });

  return authorisePromise;
}

axiosClient.interceptors.request.use(async (config) => {
  const token = await maybeAuthorise();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "/";
      window.location.href = `${webAppUrl}/auth/login`;
    }
    return Promise.reject(error);
  }
);

export { axiosClient };
