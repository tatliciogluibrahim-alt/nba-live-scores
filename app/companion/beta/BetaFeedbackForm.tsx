"use client";

import { useState } from "react";
import { FormField } from "./BetaSignupForm";

type Status = "idle" | "submitting" | "saved" | "error";

// Structured feedback form for beta testers. Five fields:
//   email      — for follow-up
//   working    — what feels right
//   broken     — what feels wrong
//   missing    — what's not there yet
//   vibe       — one-line gut summary
//
// All optional except email; backend rejects submissions that are
// fully empty (just an email). POSTs to /api/beta/feedback.

export function BetaFeedbackForm() {
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState("");
  const [broken, setBroken] = useState("");
  const [missing, setMissing] = useState("");
  const [vibe, setVibe] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorText(null);
    try {
      const res = await fetch("/api/beta/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          working: working.trim(),
          broken: broken.trim(),
          missing: missing.trim(),
          vibe: vibe.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setErrorText(body.error ?? "Couldn't save. Try again.");
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch {
      setErrorText("Network hiccup. Try again.");
      setStatus("error");
    }
  }

  if (status === "saved") {
    return (
      <div
        className="rounded-[14px] border px-5 py-5"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
          borderLeft: "3px solid var(--nba)",
        }}
      >
        <p
          className="text-[13px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--nba)",
          }}
        >
          Thank you
        </p>
        <p
          className="mt-2 text-[16px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          Got it. I read every reply.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[14px] border p-5"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
      aria-label="Friend beta feedback"
    >
      <div className="space-y-4">
        <FormField
          id="fb-email"
          label="Email"
          required
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@example.com"
        />
        <FormField
          id="fb-working"
          label="What feels right"
          value={working}
          onChange={setWorking}
          placeholder="The thing that made you go &ldquo;oh, this is nice.&rdquo;"
          multiline
        />
        <FormField
          id="fb-broken"
          label="What feels wrong"
          value={broken}
          onChange={setBroken}
          placeholder="Anything broken, confusing, generic, or loud."
          multiline
        />
        <FormField
          id="fb-missing"
          label="What's not there yet"
          value={missing}
          onChange={setMissing}
          placeholder="The thing you reached for that wasn't there."
          multiline
        />
        <FormField
          id="fb-vibe"
          label="One-line vibe"
          value={vibe}
          onChange={setVibe}
          placeholder="How does the app feel overall?"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-[14px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          border: "1px solid var(--ink)",
          opacity: status === "submitting" ? 0.7 : 1,
        }}
      >
        {status === "submitting" ? "Sending…" : "Send feedback"}
      </button>

      {errorText ? (
        <p
          className="mt-3 text-[13px]"
          style={{ color: "var(--critical)", fontWeight: 500 }}
        >
          {errorText}
        </p>
      ) : null}

      <p
        className="mt-3 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Be brutal. Nothing you say will hurt my feelings. See{" "}
        <a
          href="/privacy"
          style={{
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationThickness: "1px",
            textUnderlineOffset: "3px",
          }}
        >
          privacy
        </a>
        .
      </p>
    </form>
  );
}
