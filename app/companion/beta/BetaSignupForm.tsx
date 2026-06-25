"use client";

import { useState } from "react";

// Friend beta signup form. Calm, three-field. POSTs to /api/beta/signup
// which is KV-backed + rate-limited. No confirmation email. The
// follow-up DM is manual.

type Status = "idle" | "submitting" | "saved" | "error";

export function BetaSignupForm() {
  const [email, setEmail] = useState("");
  const [sports, setSports] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorText(null);
    try {
      const res = await fetch("/api/beta/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          sportsInterest: sports.trim(),
          source: source.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setErrorText(body.error ?? "Couldn't save. Try again in a minute.");
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
          You&apos;re in
        </p>
        <p
          className="mt-2 text-[16px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          Got it. I&apos;ll be in touch within a few days.
        </p>
        <p
          className="mt-2 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Meanwhile, you can open the app at{" "}
          <a
            href="/app"
            style={{
              color: "var(--ink)",
              textDecoration: "underline",
              textDecorationThickness: "1px",
              textUnderlineOffset: "3px",
            }}
          >
            /app
          </a>{" "}
          and start following teams.
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
      aria-label="Friend beta signup"
    >
      <div className="space-y-4">
        <FormField
          id="beta-email"
          label="Email"
          required
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@example.com"
        />
        <FormField
          id="beta-sports"
          label="What sports do you follow?"
          value={sports}
          onChange={setSports}
          type="text"
          placeholder="e.g. Knicks, USMNT, Eagles"
        />
        <FormField
          id="beta-source"
          label="How did you hear about it? (optional)"
          value={source}
          onChange={setSource}
          type="text"
          placeholder="A friend, Twitter, etc."
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
        {status === "submitting" ? "Saving…" : "Sign me up"}
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
        Email goes to KV storage. No confirmation email gets sent. I&apos;ll
        DM/email you when the next wave opens. See{" "}
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

function FormField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  multiline = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: "text" | "email";
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    background: "var(--cream)",
    border: "1px solid var(--line)",
    color: "var(--ink)",
    fontFamily: "var(--font-body)",
  };
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[12px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "var(--mute-1)",
        }}
      >
        {label}
        {required ? (
          <span aria-hidden style={{ color: "var(--nba)" }}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          rows={3}
          className="mt-1.5 w-full rounded-[10px] px-3 py-2 text-[14px] outline-none no-noise-focus-ring"
          style={baseStyle}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="mt-1.5 w-full rounded-[10px] px-3 py-2 text-[14px] outline-none no-noise-focus-ring"
          style={baseStyle}
        />
      )}
    </div>
  );
}

// Also exported so the feedback page can reuse the same field style.
export { FormField };
