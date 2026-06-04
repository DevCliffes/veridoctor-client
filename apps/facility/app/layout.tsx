"use client";

import AppLayout from "@/components/AppLayout";
import "@veridoctor/design/styles/globals.css";
import { Toaster } from "sonner";
import StoreProvider from "./StoreProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <StoreProvider>
          <Toaster richColors position="top-center" />
          <AppLayout>{children}</AppLayout>
        </StoreProvider>
      </body>
    </html>
  );
}
