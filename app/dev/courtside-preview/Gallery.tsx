"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

// Courtside C0 gallery — every token and component register from the
// spec, in both rooms, with the redaction interaction live. This file
// is the reference implementation the C1 restyle copies from; nothing
// here is imported by product surfaces.
//
// Spec rulings honored (do not "improve" these):
//   • Leader emphasis is ink/mute — score numerals NEVER tint by team.
//   • Team color appears only as dot / season strip / progress fill.
//   • Two grays on the light chassis. Live is #c93d2e on light,
//     #ff4d3a on dark. Gold exists only in the Super Bowl register.
//   • A held score renders placeholder glyphs; digits enter the DOM
//     only after reveal (simulated here with state — production wires
//     this through the existing reveal architecture, data-level).

const LIGHT: CSSProperties = {
  "--bg": "#f4f3ef",
  "--surface": "#ffffff",
  "--line": "#e3e1da",
  "--text": "#17181a",
  "--mute": "#716f67",
  "--live": "#c93d2e",
  "--chip-bg": "#eeece6",
  "--chip-line": "#8a8478",
} as CSSProperties;

const DARK: CSSProperties = {
  "--bg": "#0c0d0f",
  "--surface": "#14161a",
  "--line": "#23262b",
  "--text": "#f2f3f5",
  "--mute": "#8d939b",
  "--live": "#ff4d3a",
  "--chip-bg": "rgba(255,255,255,0.06)",
  "--chip-line": "#6a7078",
} as CSSProperties;

const UI = "var(--font-court-ui), system-ui, sans-serif";
const DISPLAY = "var(--font-court-display), 'Arial Narrow', sans-serif";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{
        fontFamily: DISPLAY,
        fontStretch: "112%",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.14em",
        color: "var(--mute)",
        margin: "26px 0 10px",
      }}
    >
      {children}
    </p>
  );
}

// ── The held chip — the one hiding rule, interactive ─────────────────
// Digits live in component state and only render after reveal. Tap
// reveals; tap again re-hides (the session-commit rule is production
// behavior, not preview behavior).
function HeldScore({ away, home }: { away: number; home: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      aria-label={
        revealed
          ? `Score ${away} to ${home}. Tap to hide again.`
          : "Score hidden by No-Spoilers. Tap to reveal."
      }
      className="inline-flex min-h-[44px] items-center"
      style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
    >
      {revealed ? (
        <span
          style={{
            fontFamily: DISPLAY,
            fontStretch: "125%",
            fontSize: 16,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            color: "var(--text)",
          }}
        >
          {away} – {home}
        </span>
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 8,
            border: "1.5px solid var(--chip-line)",
            background: "var(--chip-bg)",
            padding: "5px 12px",
            fontFamily: DISPLAY,
            fontStretch: "125%",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: "var(--mute)",
          }}
        >
          •• – ••
        </span>
      )}
    </button>
  );
}

function Swatch({ name, token }: { name: string; token: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: `var(${token})`,
          border: "1px solid var(--line)",
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mute)" }}>
        {name}
      </span>
    </div>
  );
}

function Room({ title, tokens, children }: { title: string; tokens: CSSProperties; children: ReactNode }) {
  return (
    <section
      style={{
        ...tokens,
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: UI,
        padding: "24px 20px 34px",
      }}
    >
      <p
        className="uppercase"
        style={{
          fontFamily: DISPLAY,
          fontStretch: "125%",
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: "0.1em",
        }}
      >
        {title}
      </p>
      {children}
    </section>
  );
}

function RoomContents({ dark }: { dark: boolean }) {
  return (
    <>
      <SectionLabel>Tokens</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Swatch name="bg" token="--bg" />
        <Swatch name="surface" token="--surface" />
        <Swatch name="text" token="--text" />
        <Swatch name="mute (the only gray)" token="--mute" />
        <Swatch name="live" token="--live" />
        <Swatch name="chip line" token="--chip-line" />
      </div>

      <SectionLabel>Numerals · Archivo width 125</SectionLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span
          style={{
            fontFamily: DISPLAY,
            fontStretch: "125%",
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          96
        </span>
        <span
          style={{
            fontFamily: DISPLAY,
            fontStretch: "125%",
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: "var(--mute)",
          }}
        >
          94
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--mute)" }}>
          leader is ink, trailer is mute. Never team color.
        </span>
      </div>

      <SectionLabel>Live hero card</SectionLabel>
      <div
        style={{
          borderRadius: 20,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          padding: "18px 20px 16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            className="uppercase"
            style={{ fontFamily: DISPLAY, fontStretch: "112%", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--mute)" }}
          >
            Week 1 · Ford Field
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--live)" }}>
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--live)" }} />
            Q3 · 8:12
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Lions</span>
          <span style={{ fontFamily: DISPLAY, fontStretch: "125%", fontSize: 40, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>24</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--mute)" }}>Saints</span>
          <span style={{ fontFamily: DISPLAY, fontStretch: "125%", fontSize: 40, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "var(--mute)" }}>17</span>
        </div>
        <div style={{ marginTop: 14, height: 3, borderRadius: 999, background: "var(--line)" }}>
          <span aria-hidden style={{ display: "block", width: "62%", height: "100%", borderRadius: 999, background: "#0076b6" }} />
        </div>
      </div>

      <SectionLabel>Agate rows + the one hiding rule (tap the chip)</SectionLabel>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--line)" }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: "#0076b6" }} />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Saints at Lions</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)" }}>SUN 1:00 · FOX</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: "#00338d", outline: "1px solid var(--line)" }} />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Panthers · Bills</span>
          <HeldScore away={14} home={29} />
        </div>
      </div>

      <SectionLabel>Season strip — never without its team</SectionLabel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: "#0076b6" }} />
          <span className="uppercase" style={{ fontFamily: DISPLAY, fontStretch: "112%", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em" }}>Lions</span>
        </span>
        <span style={{ fontFamily: DISPLAY, fontStretch: "125%", fontSize: 13, fontWeight: 900, color: "#0076b6" }}>2–1</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
        {(["w", "l", "w", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""] as const).map((r, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              flex: 1,
              height: 20,
              borderRadius: 4,
              background: r === "w" ? "#0076b6" : r === "l" ? "var(--chip-line)" : "var(--line)",
              opacity: r === "l" ? 0.55 : 1,
            }}
          />
        ))}
      </div>

      <SectionLabel>Tab bar register</SectionLabel>
      <div style={{ display: "flex", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        {["TODAY", "SCHEDULE", "FOLLOWING", "WATCHING"].map((t, i) => (
          <span
            key={t}
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: i === 0 ? DISPLAY : UI,
              fontStretch: i === 0 ? "112%" : undefined,
              fontSize: 11,
              fontWeight: i === 0 ? 800 : 600,
              letterSpacing: "0.12em",
              color: i === 0 ? "var(--text)" : "var(--mute)",
            }}
          >
            {t}
          </span>
        ))}
      </div>

      {dark ? (
        <>
          <SectionLabel>The one gold (Super Bowl register only)</SectionLabel>
          <span
            className="uppercase"
            style={{ fontFamily: DISPLAY, fontStretch: "125%", fontSize: 30, fontWeight: 900, color: "#c9b476", letterSpacing: "-0.01em" }}
          >
            LXI
          </span>
        </>
      ) : (
        <>
          <SectionLabel>Reduce Transparency fallback</SectionLabel>
          <span
            className="uppercase"
            style={{
              display: "inline-flex",
              borderRadius: 8,
              background: "var(--text)",
              color: "var(--bg)",
              padding: "6px 13px",
              fontFamily: DISPLAY,
              fontStretch: "125%",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            Hidden
          </span>
        </>
      )}
    </>
  );
}

export function Gallery() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto" }}>
      <Room title="The light room — browsing" tokens={LIGHT}>
        <RoomContents dark={false} />
      </Room>
      <Room title="The arena — your game is live" tokens={DARK}>
        <RoomContents dark />
      </Room>
      <footer
        style={{
          ...LIGHT,
          background: "var(--bg)",
          color: "var(--mute)",
          fontFamily: UI,
          padding: "18px 20px 40px",
          fontSize: 11.5,
          fontWeight: 500,
          lineHeight: 1.6,
        }}
      >
        Courtside C0 preview. Spec:
        docs/superpowers/specs/2026-08-31-courtside-design.md. Nothing on
        this page is imported by product surfaces.
      </footer>
    </main>
  );
}
