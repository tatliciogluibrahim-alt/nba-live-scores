// Twitter / X share image. Re-uses the OG image render at the same
// dimensions. Twitter prefers 1200x600 ratio for "summary_large_image"
// cards; 1200x630 still renders correctly with a light center crop.
//
// We no longer re-export `runtime` (since opengraph-image runs on the
// default Node runtime now, not Edge, the export was removed).

export { default, alt, size, contentType } from "./opengraph-image";
