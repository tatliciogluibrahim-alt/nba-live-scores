import { Gallery } from "./Gallery";

// Dev-only System D primitive gallery. No CompanionFrame, no TabBar — a bare
// cream page for primitive-level visual QA. noindex; metadata must live in a
// server file, so this thin wrapper holds it and renders the client Gallery.

export const metadata = {
  robots: { index: false, follow: false },
  title: "System preview | No Noise Scores",
};

export default function SystemPreviewPage() {
  return <Gallery />;
}
