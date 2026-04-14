import "./globals.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import { ReactNode } from "react";
import ThemeRegistry from "@/components/ThemeRegistry";
import { AuthProvider } from "@/auth/AuthProvider";

export const metadata = {
  title: "WareTrack",
  description: "WareTrack",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ThemeRegistry>
          <AuthProvider>{children}</AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
