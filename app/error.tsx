"use client";

import { useEffect } from "react";

// Route-level error boundary. Next.js renders this in place of the page
// when a client-side error escapes the route. Without it, an uncaught
// throw unmounts the React tree and the user sees the bare body
// background (a cream void). This calm fallback owns that moment.
//
// Voice: brief, calm, no FOMO, no apologetic spiral. Matches the
// resting-state voice ("Quiet for now. That's the point.") — we name
// what happened, offer one action, move on.

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the device console + Vercel logs so a recurring crash
    // is visible. `digest` is Next.js's stable error fingerprint —
    // useful for correlating multiple users hitting the same bug.
    console.error("[app/error] route-level error", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center"
      style={{ color: "var(--ink)" }}
    >
      <p
        className="text-[11px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: "var(--mute-1)",
        }}
      >
        Quick pause
      </p>
      <h1
        className="mt-3"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          lineHeight: 1.1,
        }}
      >
        Something didn&apos;t load.
      </h1>
      <p
        className="mt-2 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Tap to try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[13px] transition active:scale-[0.97]"
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Reload
      </button>
    </main>
  );
}
