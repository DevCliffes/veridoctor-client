import type { Metadata } from "next";
import "@veridoctor/design/styles/globals.css";
import { Toaster } from "sonner";
import Script from "next/script";
import StoreProvider from "./StoreProvider";
import { ThemeProvider } from "@veridoctor/design";

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
    <html lang="en" suppressHydrationWarning>
      <StoreProvider>
        <body className="antialiased font-sans">
          {/* Google Analytics (GA4) — gtag.js loads after the page becomes
              interactive so it doesn't block/delay first paint or hydration.
              Stream: "Veri Doctor", measurement ID G-KHXK82ZFFX. */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-KHXK82ZFFX"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-KHXK82ZFFX');
            `}
          </Script>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Toaster richColors position="top-center" />
            {children}
          </ThemeProvider>
        </body>
      </StoreProvider>
    </html>
  );
}
