"use client";
import { useEffect } from "react";
import { Provider } from "react-redux";
import store from "./store";
import { setUserId, setAuthCode } from "@veridoctor/store";

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Rehydrate identity/auth_code from localStorage AFTER mount, not at
  // module load. Running this synchronously at import time (the old
  // approach) patched the store before React's first client render,
  // so the client's initial render already reflected "logged in" while
  // the server-rendered HTML did not — a hydration mismatch (React
  // error #418). Doing it in an effect guarantees it runs after
  // hydration, not during it.
  useEffect(() => {
    try {
      const identity = localStorage.getItem("vd_identity");
      const auth_code = localStorage.getItem("vd_auth_code");
      if (identity) {
        store.dispatch(setUserId(identity));
        if (auth_code) store.dispatch(setAuthCode(auth_code));
      }
    } catch {
      // localStorage unavailable (privacy mode, etc.) — fail silently,
      // same as the old try/catch in getPreloadedAuth.
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
