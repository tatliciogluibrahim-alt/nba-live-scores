"use client";

import { useState } from "react";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";

// /brief/subscribe — collect email + snapshot the user's current
// follows, POST to /api/brief/subscribe.
//
// Calm onboarding voice: explain what the brief is, what's in it,
// and how often. No marketing-pitch language, no "Join 10,000+
// sports fans" social proof.
//
// Spoiler model: subscribers default to "include scores in email."
// Toggle exposed so No-Spoilers users can opt for a quieter email
// shape (matchup-only, tap to reveal back in the app).

type Status = "idle" | "submitting" | "ok" | "error";

export function BriefSubscribeClient() {
  const { follows, hydrated } = useFollows();
  const [email, setEmail] = useState("");
  const [includeScores, setIncludeScores] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/brief/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          follows,
          includeScores,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setError(json.error ?? `Subscribe failed (${res.status}).`);
        return;
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Subscribe failed.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Display as="h1" size="lg" className="mb-2">
        The No Noise Brief.
      </Display>
      <p
        className="mb-5 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        One calm email each morning. Only your followed games — what
        wrapped yesterday, what&apos;s on tonight, and one sentence on
        why each matters. No feeds, no roundups.
      </p>

      {status === "ok" ? (
        <article
          className="rounded-[14px] border px-4 py-5"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
            borderLeft: "3px solid var(--wc)",
          }}
        >
          <Eyebrow color="var(--wc)">Subscribed</Eyebrow>
          <p
            className="mt-2 text-[16px] leading-snug"
            style={{
              color: "var(--ink)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            You&apos;re on the list.
          </p>
          <p
            className="mt-2 text-[13px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            First brief lands tomorrow morning. Every email has a
            one-click unsubscribe.
          </p>
        </article>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="brief-email"
              className="mb-1 block text-[11px] uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--mute-1)",
              }}
            >
              Email
            </label>
            <input
              id="brief-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="block w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
                color: "var(--ink)",
                fontWeight: 500,
              }}
            />
          </div>

          <div
            className="rounded-[14px] border px-3 py-3"
            style={{
              background: "var(--paper)",
              borderColor: "var(--line)",
            }}
          >
            <Eyebrow>What we&apos;ll send</Eyebrow>
            <p
              className="mt-1 text-[13px] leading-snug"
              style={{ color: "var(--ink)", fontWeight: 500 }}
            >
              {hydrated && follows.length > 0
                ? `Snapshot of your ${follows.length} follow${follows.length === 1 ? "" : "s"} goes with this signup. Re-subscribe to refresh.`
                : "Add follows in the app first — the brief only covers what you follow."}
            </p>
          </div>

          <label
            className="flex items-start gap-3 rounded-[14px] border px-3 py-3"
            style={{
              background: "var(--paper)",
              borderColor: "var(--line)",
            }}
          >
            <input
              type="checkbox"
              checked={includeScores}
              onChange={(e) => setIncludeScores(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ accentColor: "var(--ink)" }}
            />
            <span>
              <span
                className="block text-[13px]"
                style={{ color: "var(--ink)", fontWeight: 700 }}
              >
                Include scores in the email
              </span>
              <span
                className="mt-0.5 block text-[12px]"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                Turn off for a quieter, spoiler-safe email — matchups only.
                Tap any line to see the score back in the app.
              </span>
            </span>
          </label>

          {error ? (
            <p
              role="alert"
              className="text-[12px]"
              style={{ color: "var(--critical)", fontWeight: 600 }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={
              status === "submitting" || !hydrated || follows.length === 0
            }
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
              opacity:
                status === "submitting" || !hydrated || follows.length === 0
                  ? 0.55
                  : 1,
            }}
          >
            {status === "submitting"
              ? "Subscribing…"
              : follows.length === 0
                ? "Add a follow first"
                : "Subscribe to the brief"}
          </button>

          <p
            className="text-[11px] leading-snug"
            style={{ color: "var(--mute-2)", fontWeight: 500 }}
          >
            We use your email only to send this one brief. One-click
            unsubscribe in every email. Email is not shared, sold, or
            used for any other purpose.
          </p>
        </form>
      )}
    </main>
  );
}
