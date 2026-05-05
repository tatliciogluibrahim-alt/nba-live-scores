import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No Noise Scores",
    short_name: "No Noise",
    description: "Live scores for the sports moments that matter. No noise.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f1ea",
    theme_color: "#f5f1ea",
    categories: ["sports", "news"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
