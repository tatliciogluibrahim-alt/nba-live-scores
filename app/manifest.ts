import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No Noise Scores",
    short_name: "No Noise",
    description: "Live scores for the sports moments that matter. No noise.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1ead8",
    theme_color: "#f1ead8",
    categories: ["sports", "news"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
