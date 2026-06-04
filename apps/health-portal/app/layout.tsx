import "./globals.css";
import "@veridoctor/design/styles/globals.css";

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
          <div>{children}</div>
        </body>
      </StoreProvider>
    </html>
  );
}
