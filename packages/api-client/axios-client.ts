import axios from "axios";
import { ACCESS_TOKEN_KEY, AUTH_CODE_KEY, IDENTITY_KEY } from "./constants";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/`;
}

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
});

async function maybeAuthorise(): Promise<string | null> {
  const token = getCookie(ACCESS_TOKEN_KEY);
  if (token) return token;

  const authCode = getCookie(AUTH_CODE_KEY);
  const identity = getCookie(IDENTITY_KEY);
  if (!authCode || !identity) return null;

  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise`,
      null,
      { params: { auth_code: authCode, identity } }
    );
    const { a_token } = res.data;
    setCookie(ACCESS_TOKEN_KEY, a_token);
    return a_token;
  } catch {
    return null;
  }
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
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export { axiosClient };
