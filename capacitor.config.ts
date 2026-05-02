import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nonoisescores.app",
  appName: "No Noise Scores",
  // webDir is used for static export builds ("npm run build && next export").
  // Currently we use server.url to load directly from Vercel, so webDir is
  // only needed if you switch to a fully-local static build.
  webDir: "out",
  server: {
    url: "https://nba-live-scores-three.vercel.app",
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
