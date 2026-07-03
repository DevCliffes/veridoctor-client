import { createSlice } from "@reduxjs/toolkit";
import { safeStorage } from "../../services/useLocalStorage.hook";
import CookieService from "../../services/cookieStorage";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  LOGGED_IN_KEY,
  AUTH_CODE_KEY,
  IDENTITY_KEY,
  PATIENT_IDENTITY_KEY,
  PATIENT_LOGGED_IN_KEY,
  PATIENT_ACCESS_TOKEN_KEY,
  PATIENT_AUTH_CODE_KEY,
  PROVIDER_IDENTITY_KEY,
  PROVIDER_LOGGED_IN_KEY,
  PROVIDER_ACCESS_TOKEN_KEY,
  PROVIDER_AUTH_CODE_KEY,
} from "../../../../api-client/constants";

// Detect which app we're running in based on hostname.
// Falls back to generic keys if hostname is unavailable (SSR).
function getAppScope(): "patient" | "provider" | "generic" {
  if (typeof window === "undefined") return "generic";
  const host = window.location.hostname;
  if (host.startsWith("app.")) return "patient";
  if (host.startsWith("provider.")) return "provider";
  return "generic";
}

function getScopedKeys() {
  const scope = getAppScope();
  if (scope === "patient") {
    return {
      identityKey: PATIENT_IDENTITY_KEY,
      loggedInKey: PATIENT_LOGGED_IN_KEY,
      accessTokenKey: PATIENT_ACCESS_TOKEN_KEY,
      authCodeKey: PATIENT_AUTH_CODE_KEY,
      refreshTokenKey: REFRESH_TOKEN_KEY,
      userStorageKey: "vd_patient_user",
    };
  }
  if (scope === "provider") {
    return {
      identityKey: PROVIDER_IDENTITY_KEY,
      loggedInKey: PROVIDER_LOGGED_IN_KEY,
      accessTokenKey: PROVIDER_ACCESS_TOKEN_KEY,
      authCodeKey: PROVIDER_AUTH_CODE_KEY,
      refreshTokenKey: REFRESH_TOKEN_KEY,
      userStorageKey: "vd_provider_user",
    };
  }
  // Generic fallback (web app / SSR)
  return {
    identityKey: IDENTITY_KEY,
    loggedInKey: LOGGED_IN_KEY,
    accessTokenKey: ACCESS_TOKEN_KEY,
    authCodeKey: AUTH_CODE_KEY,
    refreshTokenKey: REFRESH_TOKEN_KEY,
    userStorageKey: "user",
  };
}

const keys = getScopedKeys();

// FIX: some cookie writes have historically stored the literal strings
// "null"/"undefined" (see cookieStorage.ts fix). This guards every place
// identity enters Redux state so a bad stored value can never leak into
// components again, even for users who already have a poisoned cookie
// from before that fix shipped.
function sanitizeIdentity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value === "" || value === "null" || value === "undefined") return null;
  return value;
}

export type authState = {
  isLoggedIn: boolean;
  access_token: string | null;
  refresh_token: string | null;
  auth_code: string | null;
  identity: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

const initialAuthState: authState = {
  isLoggedIn: CookieService.get(keys.loggedInKey) === "true",
  access_token: CookieService.get(keys.accessTokenKey) || null,
  refresh_token: CookieService.get(keys.refreshTokenKey) || null,
  auth_code: CookieService.get(keys.authCodeKey) || null,
  user: safeStorage.get(keys.userStorageKey),
  identity: sanitizeIdentity(CookieService.get(keys.identityKey)),
};

export const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {
    setIsLoggedIn: (state) => {
      state.isLoggedIn = true;
      CookieService.set(keys.loggedInKey, "true");
    },
    setAccessToken: (state, action) => {
      state.access_token = action.payload;
      CookieService.set(keys.accessTokenKey, action.payload);
    },
    setRefreshToken: (state, action) => {
      state.refresh_token = action.payload;
      CookieService.set(keys.refreshTokenKey, action.payload);
    },
    setAuthCode: (state, action) => {
      state.auth_code = action.payload;
      CookieService.set(keys.authCodeKey, action.payload);
    },
    setUser: (state, action) => {
      state.user = action.payload;
      safeStorage.set(keys.userStorageKey, action.payload);
    },
    setUserId: (state, action) => {
      const clean = sanitizeIdentity(action.payload);
      state.identity = clean;
      CookieService.set(keys.identityKey, clean);
    },
    revokeTokens: (state) => {
      state.access_token = null;
      state.refresh_token = null;
      state.auth_code = null;
      state.isLoggedIn = false;
      state.identity = null;
      state.user = null;
      CookieService.remove(keys.accessTokenKey);
      CookieService.remove(keys.refreshTokenKey);
      CookieService.remove(keys.authCodeKey);
      CookieService.remove(keys.loggedInKey);
      CookieService.remove(keys.identityKey);
      safeStorage.remove(keys.userStorageKey);
    },
  },
});

export const {
  setIsLoggedIn,
  setUser,
  setAccessToken,
  setRefreshToken,
  setAuthCode,
  setUserId,
  revokeTokens,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
