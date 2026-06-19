import type { Metadata } from "next";
import "@veridoctor/design/styles/globals.css";
import StoreProvider from "./components/StoreProvider";

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
    <html lang="en">
      <body className="antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
