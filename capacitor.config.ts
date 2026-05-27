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
    // PWA surface, not the marketing landing). Was previously pointing
    // at the old preview deployment URL (nba-live-scores-three.vercel.app)
    // which would serve the same code but isn't the stable production
    // alias and risks breaking if that deployment is ever rotated.
    url: "https://nonoisescores.app/app",
    cleartext: false,
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
