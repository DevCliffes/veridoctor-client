import { createAppStore, themeReducer } from "@veridoctor/store";
import { configureStore, combineReducers } from "@reduxjs/toolkit";

// Rehydrate from localStorage
function getPreloadedAuth() {
  try {
    const identity = localStorage.getItem("vd_identity");
    const auth_code = localStorage.getItem("vd_auth_code");
    if (identity) {
      return {
        isLoggedIn: true,
        access_token: null,
        refresh_token: null,
        auth_code: auth_code ?? null,
        identity: identity,
        user: null,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

const store = createAppStore({ theme: themeReducer });

// Patch identity from localStorage after store creation
if (typeof window !== "undefined") {
  const identity = localStorage.getItem("vd_identity");
  const auth_code = localStorage.getItem("vd_auth_code");
  if (identity) {
    const { setUserId, setAuthCode } = require("@veridoctor/store");
    store.dispatch(setUserId(identity));
    if (auth_code) store.dispatch(setAuthCode(auth_code));
  }
}

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
