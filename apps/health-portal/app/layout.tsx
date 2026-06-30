import type { Metadata } from "next";
import "./globals.css";
import "@veridoctor/design/styles/globals.css";
import StoreProvider from "./StoreProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "VeriDoctor — Book Verified Doctors in Kenya",
    template: "%s | VeriDoctor",
  },
  description:
    "Find and book appointments with verified, licensed healthcare providers across Kenya. Virtual and in-person consultations available.",
  openGraph: {
    siteName: "VeriDoctor",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <StoreProvider>
        <body className="antialiased font-sans">
          <div>{children}</div>
          <Toaster richColors position="top-right" />
        </body>
      </StoreProvider>
    </html>
  );
}
