import axios from "axios";
import Cookies from "js-cookie";
import { ACCESS_TOKEN_KEY, AUTH_CODE_KEY, IDENTITY_KEY } from "./constants";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
});

// Exchange auth code for access token if we don't have one yet
async function maybeAuthorise(): Promise<string | null> {
  const token = Cookies.get(ACCESS_TOKEN_KEY);
  if (token) return token;

  const authCode = Cookies.get(AUTH_CODE_KEY);
  const identity = Cookies.get(IDENTITY_KEY);
  if (!authCode || !identity) return null;

  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise`,
      null,
      { params: { auth_code: authCode, identity } }
    );
    const { a_token } = res.data;
    Cookies.set(ACCESS_TOKEN_KEY, a_token);
    return a_token;
  } catch {
    return null;
  }
}

// Attach access token to every request
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
