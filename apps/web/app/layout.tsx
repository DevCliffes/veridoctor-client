import type { Metadata } from "next";
import "@veridoctor/design/styles/globals.css";
import { Toaster } from "sonner";
import StoreProvider from "./StoreProvider";

export const metadata: Metadata = {
  title: {
    default: "VeriDoctor — Smarter, More Accessible Healthcare in Kenya",
    template: "%s | VeriDoctor",
  },
  description:
    "VeriDoctor is Kenya's digital healthcare platform connecting patients with verified, licensed doctors. Book virtual or in-person appointments instantly.",
  openGraph: {
    siteName: "VeriDoctor",
    url: "https://veridoctor.com",
    locale: "en_KE",
    type: "website",
    images: [{ url: "https://veridoctor.com/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@veridoctor",
  },
  alternates: {
    canonical: "https://veridoctor.com",
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
          <Toaster richColors position="top-center" />
          {children}
        </body>
      </StoreProvider>
    </html>
  );
}
