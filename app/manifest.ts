import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No Noise Scores",
    short_name: "No Noise",
    description: "NBA scores, no noise.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07111f",
    theme_color: "#07111f",
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
