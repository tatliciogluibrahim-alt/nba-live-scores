import type { Metadata, Viewport } from "next";
import { Archivo_Black, Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { CompanionProviders } from "./companion/providers";
import "./globals.css";

// Functional UI body type
const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Editorial display — used once per screen, only when the moment earns it
const displayFont = Archivo_Black({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

// Eyebrows + tabular numerals only
const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "No Noise Scores",
  description: "Live scores for the sports moments that matter. No noise.",
  applicationName: "No Noise Scores",
  metadataBase: new URL("https://nonoisescores.app"),
  alternates: {
    canonical: "https://nonoisescores.app",
  },
  openGraph: {
    title: "No Noise Scores",
    description: "Live scores for the sports moments that matter. No noise.",
    url: "https://nonoisescores.app",
    siteName: "No Noise Scores",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "No Noise Scores",
    description: "Live scores for the sports moments that matter.",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "No Noise Scores",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
  themeColor: "#f1ead8",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}
      >
        <CompanionProviders>{children}</CompanionProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
