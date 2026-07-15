"use client";

import { useEffect, useState } from "react";
import type { ReliancePrompt } from "../today-data";

// The alert truth loop (2026-07-14 review). After a followed match the user
// had alerts on, we ask ONE question, ONCE ever: could you rely on these
// alerts? The verdict + tier is the only proprietary evidence available about
// whether our interruptions are sufficient. Calm, single-use, dismissible —
// never a recurring nag.

const ANSWERED_KEY = "no-noise:reliance:answered:v1";

type Answer = "yes" | "missed" | "too-many";

const OPTIONS: { value: Answer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "missed", label: "I missed something" },
  { value: "too-many", label: "Too many" },
];

export function RelianceCard({ prompt }: { prompt: ReliancePrompt }) {
  const [hydrated, setHydrated] = useState(false);
  const [answered, setAnswered] = useState(true);

  // One-time localStorage hydration on client mount (the documented Next.js
  // pattern for upgrading a server-rendered default to client-only storage
  // state without breaking hydration matching — mirrors useClosingDismissed).
  useEffect(() => {
    let alreadyAnswered = false;
    try {
      alreadyAnswered = localStorage.getItem(ANSWERED_KEY) === "1";
    } catch {
      alreadyAnswered = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswered(alreadyAnswered);
    setHydrated(true);
  }, []);

  async function respond(response: Answer) {
    try {
      localStorage.setItem(ANSWERED_KEY, "1");
    } catch {
      /* ignore */
    }
    setAnswered(true);
    // Fire-and-forget — the response is captured server-side; the UI never
    // waits on it and a failure is silent (this is optional research signal).
    try {
      await fetch("/api/reliance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameId: prompt.gameId,
          sport: prompt.sport,
          tier: prompt.tier,
          followKind: prompt.followKind,
          response,
        }),
      });
    } catch {
      /* ignore */
    }
  }

  if (!hydrated || answered) return null;

  return (
    <section
      className="mb-4"
      style={{ borderTop: "2px solid var(--rule)", padding: "12px 0 14px" }}
      aria-label="Alert reliance check"
    >
      <p
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: "var(--mute-1)",
        }}
      >
        Quick check
      </p>
      <p
        className="mt-1 text-[14px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 700 }}
      >
        Could you rely on the alerts for that match?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => respond(o.value)}
            className="uppercase transition active:opacity-70"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              fontWeight: 600,
              color: "var(--ink)",
              background: "transparent",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "7px 13px",
              minHeight: 40,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}
