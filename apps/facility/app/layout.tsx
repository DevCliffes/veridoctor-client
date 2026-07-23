import type { Metadata } from "next";
import "@veridoctor/design/styles/globals.css";
import StoreProvider from "./components/StoreProvider";
import { ThemeProvider } from "@veridoctor/design";

export const metadata: Metadata = {
  title: "Veridoctor telehealth",
  description: "Veridoctor telehealth application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
