import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nonoisescores.app",
  appName: "No Noise Scores",
  webDir: "public",
  server: {
    url: "https://nba-live-scores-three.vercel.app",
    cleartext: false,
  },
};

export default config;
