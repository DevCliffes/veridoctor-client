import type { Metadata } from "next";
import "@veridoctor/design/styles/globals.css";
import { Toaster } from "sonner";
import StoreProvider from "./StoreProvider";

export const metadata: Metadata = {
  title: "VeriDoctor",
  description: "Revolutionizing healthcare one click at a time",
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
