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
  useEffect(() => {
    store.dispatch(hydrateAuth());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
