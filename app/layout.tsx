import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "No Noise Scores",
  description: "Live sports scores, no noise. NBA Playoffs + FIFA World Cup 2026.",
  applicationName: "No Noise Scores",
  metadataBase: new URL("https://nonoisescores.app"),
  alternates: {
    canonical: "https://nonoisescores.app",
  },
  openGraph: {
    title: "No Noise Scores",
    description: "Live sports scores, no noise. NBA Playoffs + FIFA World Cup 2026.",
    url: "https://nonoisescores.app",
    siteName: "No Noise Scores",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "No Noise Scores",
    description: "Live sports scores, no noise.",
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
  themeColor: "#f5f1ea",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}