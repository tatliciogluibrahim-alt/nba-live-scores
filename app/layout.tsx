import type { Metadata, Viewport } from "next";
import { Archivo_Black, Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { CompanionProviders } from "./companion/providers";
import "./globals.css";

// Functional UI body type. 900 is required by the Stadium Panel wordmark.
const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "No Noise Scores — the calm sports app.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "No Noise Scores",
    description: "Live scores for the sports moments that matter.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.svg",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
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
