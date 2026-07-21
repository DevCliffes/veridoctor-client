"use client";
import { useEffect } from "react";
import { Provider } from "react-redux";
import store from "./store";
import { hydrateAuth } from "@veridoctor/store";

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Runs once, client-side, after mount -- i.e. strictly after hydration
  // has completed. This is what actually syncs real cookie/localStorage
  // values into Redux; the slice's initial state is always the SSR-safe
  // logged-out shape so server and client render identical output on
  // first pass.
  useEffect(() => {
    store.dispatch(hydrateAuth());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
