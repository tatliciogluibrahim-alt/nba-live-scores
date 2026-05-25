import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No Noise Scores",
    short_name: "No Noise",
    description: "Live scores for the sports moments that matter. No noise.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1ead8",
    theme_color: "#f1ead8",
    categories: ["sports", "news"],
    // Icons: SVG covers vector-capable browsers; 192/512 are the two
    // sizes Chrome/Edge install heuristics check for installability; 1024
    // is a future-proof asset Android adaptive icons can downsample from;
    // apple-touch-icon at 180 is the iOS home-screen tile.
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/app-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon-maskable-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
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
