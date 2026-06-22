import { ImageResponse } from "next/og";

// Server-rendered Summer Soccer share card. The app's share flow fetches
// this PNG and hands it to the native / Web share sheet — rendering on the
// server (Satori, same pipeline as /opengraph-image) means it works in any
// webview, with no client-side html-to-image / canvas that can fail inside
// the Capacitor WKWebView.
//
// Two layouts, chosen by ?kind:
//   • moment — advancement beat: eyebrow + big headline + score line.
//   • game   — a scoreboard: two team rows with big scores (leader in ink,
//              trailer dimmed) + a goal-scorers line.
// All display strings come from query params (the client computes them),
// so this route only lays out text.
//
// Node runtime (next/og's Edge bundle exceeds Vercel's Hobby 1 MB limit).

export const runtime = "nodejs";

const CREAM = "#f5f1ea";
const INK = "#1a1208";
const MUTE = "#a89880";
const TRAIL = "#c9bfae";
const CARD = "#fffaf2";
const GREEN = "#1e6b3c";

function clamp(v: string | null, max: number): string {
  return (v ?? "").slice(0, max);
}

function Lockup() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width="72" height="72" viewBox="0 0 24 24">
        <rect width="24" height="24" rx="5.5" fill="#07111f" />
        <rect x="3.5" y="8" width="17" height="8" rx="1.8" fill={CREAM} />
        <circle cx="18.5" cy="10" r="1.2" fill={GREEN} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: GREEN, letterSpacing: "0.14em" }}>
          NO NOISE
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>
          SCORES
        </div>
      </div>
    </div>
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") === "game" ? "game" : "moment";
  const eyebrow = clamp(searchParams.get("eyebrow"), 64).toUpperCase();
  const advanced = searchParams.get("accent") === "green";
  const accent = advanced ? GREEN : MUTE;

  // Game scoreboard data.
  const away = clamp(searchParams.get("away"), 4);
  const home = clamp(searchParams.get("home"), 4);
  const as = clamp(searchParams.get("as"), 3);
  const hs = clamp(searchParams.get("hs"), 3);
  const scorers = clamp(searchParams.get("scorers"), 90);
  const lead = searchParams.get("lead"); // "away" | "home" | null

  // Moment data.
  const headline = clamp(searchParams.get("headline"), 140) || "No Noise Scores";
  const sub = clamp(searchParams.get("sub"), 64);

  const teamRow = (code: string, score: string, dim: boolean) => (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ fontSize: 68, fontWeight: 800, color: dim ? TRAIL : INK, letterSpacing: "-0.03em" }}>
        {code}
      </div>
      <div
        style={{
          fontSize: 104,
          fontWeight: 800,
          color: dim ? TRAIL : INK,
          fontFamily: "monospace",
          letterSpacing: "-0.04em",
        }}
      >
        {score}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 84,
          background: CREAM,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header: lockup + eyebrow */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Lockup />
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: accent,
              letterSpacing: "0.08em",
              textAlign: "right",
              maxWidth: 440,
            }}
          >
            {eyebrow}
          </div>
        </div>

        {/* Card */}
        {kind === "game" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              background: CARD,
              borderRadius: 44,
              borderLeft: `12px solid ${GREEN}`,
              padding: "52px 56px",
            }}
          >
            {teamRow(away, as, lead === "home")}
            {teamRow(home, hs, lead === "away")}
            {scorers ? (
              <div style={{ display: "flex", marginTop: 8, fontSize: 30, fontWeight: 600, color: MUTE }}>
                {scorers}
              </div>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              background: CARD,
              borderRadius: 44,
              borderLeft: `12px solid ${accent}`,
              padding: "60px 56px",
            }}
          >
            <div style={{ fontSize: 76, fontWeight: 800, color: INK, letterSpacing: "-0.02em", lineHeight: 1.04 }}>
              {headline}
            </div>
            {sub ? (
              <div style={{ fontSize: 38, fontWeight: 700, color: MUTE, fontFamily: "monospace" }}>
                {sub}
              </div>
            ) : null}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: MUTE, letterSpacing: "0.1em" }}>
            NO FEEDS. NO CLUTTER.
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: MUTE, fontFamily: "monospace" }}>
            nonoisescores.app · @nonoisescores
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
