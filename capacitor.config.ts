import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nonoisescores.app",
  appName: "No Noise Scores",
  // webDir is used for static export builds ("npm run build && next export").
  // Currently we use server.url to load directly from production, so webDir is
  // only needed if you switch to a fully-local static build.
  webDir: "out",
  server: {
    // Points at the canonical /app route per AGENTS.md ("Two products,
    // one domain" — /app is the explicit cross-device entry into the
    // PWA surface, not the marketing landing).
    url: "https://nonoisescores.app/app",
    cleartext: false,
    // Keep all same-origin navigation inside the WebView. Without this,
    // tapping internal links opens Safari/Chrome instead of navigating
    // in-app. Patterns are matched against the URL origin.
    allowNavigation: ["nonoisescores.app"],
  },
  ios: {
    // Match the app's cream background so the overscroll bounce area
    // doesn't flash white/black behind the content.
    backgroundColor: "#f1ead8",
    // Disable the rubber-band bounce on scroll edges so pulling down
    // doesn't reveal an awkward gap above the content.
    scrollEnabled: true,
  },
  plugins: {
    PushNotifications: {
      // iOS only: present the system alert, sound, and badge by default.
      // Users can adjust in iOS Settings → No Noise Scores → Notifications.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
