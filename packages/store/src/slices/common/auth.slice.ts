// TODO: Add search
import { createSlice } from "@reduxjs/toolkit";
import { safeStorage } from "../../services/useLocalStorage.hook";
import CookieService from "../../services/cookieStorage";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  LOGGED_IN_KEY,
  AUTH_CODE_KEY,
  IDENTITY_KEY
} from "../../../../api-client/constants";

// state types
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
  } | null;
  // for safety add doctor and patient types
};

const initialAuthState: authState = {
  isLoggedIn: CookieService.get(LOGGED_IN_KEY) === "true",
  access_token: CookieService.get(ACCESS_TOKEN_KEY) || null,
  refresh_token: CookieService.get(REFRESH_TOKEN_KEY) || null,
  auth_code: CookieService.get(AUTH_CODE_KEY) || null,
  user: safeStorage.get("user"),
  identity: CookieService.get(IDENTITY_KEY) || null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {
    setIsLoggedIn: (state) => {
      state.isLoggedIn = true;
      CookieService.set(LOGGED_IN_KEY, "true");
    },
    /**sets the access token */
    setAccessToken: (state, action) => {
      state.access_token = action.payload;
      CookieService.set(ACCESS_TOKEN_KEY, action.payload);
    },
    /**sets the refresh token */
    setRefreshToken: (state, action) => {
      state.refresh_token = action.payload;
      CookieService.set(REFRESH_TOKEN_KEY, action.payload);
    },
    /** sets the temporary auth cod  */
    setAuthCode: (state, action) => {
      state.auth_code = action.payload;
      CookieService.set(AUTH_CODE_KEY, action.payload);
    },
    setUser: (state, action) => {
      state.user = action.payload;
      safeStorage.set("user", action.payload);
    },
    setUserId: (state, action) => {
      state.identity = action.payload;
      CookieService.set(IDENTITY_KEY, action.payload);
    },
    revokeTokens: (state) => {
      state.access_token = null;
      state.refresh_token = null;
      state.auth_code = null;
      CookieService.remove(ACCESS_TOKEN_KEY);
      CookieService.remove(REFRESH_TOKEN_KEY);
      CookieService.remove(AUTH_CODE_KEY);
      CookieService.remove(LOGGED_IN_KEY);
    },
  },
});

// Actions
export const {
  setIsLoggedIn,
  setUser,
  setAccessToken,
  setRefreshToken,
  setAuthCode,
  setUserId,
  revokeTokens,
} = authSlice.actions;

// Reducers
export const authReducer = authSlice.reducer;
