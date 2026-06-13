import type { Metadata } from "next";
import "./globals.css";
import "@veridoctor/design/styles/globals.css";
import StoreProvider from "./StoreProvider";

export const metadata: Metadata = {
  title: "VeriDoctor Provider",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
