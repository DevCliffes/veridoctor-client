"use client";
import "@veridoctor/design/styles/globals.css";
import { navITem } from "@veridoctor/design/shared";
import {
  LayoutDashboard,
  LucideCalendarCheck,
  LucideClipboardClock,
  LucideClipboardPen,
  LucideCog,
  LucideStethoscope,
  Video,
} from "@veridoctor/design/icons";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";

import StoreProvider from "./StoreProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <StoreProvider>
        <body className="antialiased font-sans">
          <Toaster richColors position="top-center" />
          {children}
        </body>
      </StoreProvider>
    </html>
  );
}
