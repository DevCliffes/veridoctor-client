import { ThemeProvider } from "@veridoctor/design";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background">{children}</div>
    </ThemeProvider>
  );
}
