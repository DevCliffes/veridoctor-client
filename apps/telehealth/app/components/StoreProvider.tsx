"use client";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/states/store/store";
import { hydrateAuth } from "@veridoctor/store";

export default function StoreProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    store.dispatch(hydrateAuth());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
