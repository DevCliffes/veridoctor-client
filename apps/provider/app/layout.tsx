import type { Metadata } from "next";
import "./globals.css";
import "@veridoctor/design/styles/globals.css";
import { Toaster } from "sonner";
import StoreProvider from "./StoreProvider";
import { ThemeProvider } from "@veridoctor/design";

export const metadata: Metadata = {
  title: "VeriDoctor Provider",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <StoreProvider>{children}</StoreProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
