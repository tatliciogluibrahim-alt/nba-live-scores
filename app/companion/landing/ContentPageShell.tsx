import Link from "next/link";
import type { ReactNode } from "react";
import { LandingFooter } from "./LandingFooter";
import { APP_STORE_URL } from "../../lib/app-store";

// ContentPageShell — shared chrome for static marketing content pages
// (Phases 13-16). Header lockup + nav, main column, LandingFooter.
//
// Routes that use this shell are public-facing and SEO-indexed. The
// shell stays calm: cream chassis, restrained type, plenty of breathing
// room. Each content page passes in its own eyebrow + headline + body.

export function ContentPageShell({
  eyebrow,
  headline,
  intro,
  children,
}: {
  eyebrow: string;
  headline: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
        minHeight: "100vh",
      }}
    >
      {/* ── Header lockup + nav ─────────────────────────────────────── */}
      <header
        className="border-b"
        style={{ borderColor: "var(--line)" }}
      >
        <div
          className="mx-auto flex items-center justify-between px-8 py-5 md:px-12 lg:px-20"
          style={{ maxWidth: 1280 }}
        >
          <Link
            href="/"
            className="text-[18px]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            No Noise Scores
          </Link>
          <nav className="flex items-center gap-4 md:gap-6">
            <Link
              href="/how-it-works"
              className="hidden text-[13px] md:inline"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              How it works
            </Link>
            <Link
              href="/changelog"
              className="hidden text-[13px] md:inline"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Changelog
            </Link>
            {/* SEO traffic lands on these pages, so the install CTA points
                at the App Store (the one-tap path). "Open in browser"
                keeps the cross-platform PWA route for Android/desktop. */}
            <Link
              href="/app"
              className="hidden text-[13px] md:inline"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Open in browser
            </Link>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-[40px] items-center justify-center rounded-full px-4 text-[13px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
              }}
            >
              Get the app
            </a>
          </nav>
        </div>
      </header>

      {/* ── Page header band ───────────────────────────────────────── */}
      <section
        className="mx-auto px-8 py-16 md:px-12 md:py-20 lg:px-20"
        style={{ maxWidth: 900 }}
      >
        <p
          className="mb-3 text-[11px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--nba)",
          }}
        >
          {eyebrow}
        </p>
        <h1
          className="leading-[1.05]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          {headline}
        </h1>
        {intro ? (
          <p
            className="mt-5 max-w-[60ch] text-[18px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {intro}
          </p>
        ) : null}
      </section>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <article
        className="mx-auto px-8 pb-16 md:px-12 lg:px-20"
        style={{ maxWidth: 720 }}
      >
        <div className="content-prose space-y-6">{children}</div>
      </article>

      <LandingFooter />
    </div>
  );
}

// ── Content primitives ─────────────────────────────────────────────────
// Used inside ContentPageShell body. They're calm, opinionated, and
// reusable across all the content pages.

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-10 leading-tight"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: "-0.015em",
        color: "var(--ink)",
      }}
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mt-8 leading-tight"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: "-0.01em",
        color: "var(--ink)",
      }}
    >
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[16px] leading-relaxed"
      style={{ color: "var(--ink)", fontWeight: 500 }}
    >
      {children}
    </p>
  );
}

export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote
      className="border-l-[3px] py-1 pl-5 text-[17px] leading-snug"
      style={{
        borderColor: "var(--nba)",
        color: "var(--ink)",
        fontStyle: "italic",
        fontWeight: 500,
      }}
    >
      {children}
    </blockquote>
  );
}

export function CalloutBox({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <aside
      className="rounded-[14px] border px-5 py-4"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--nba)",
      }}
    >
      <p
        className="mb-2 text-[11px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "var(--nba)",
        }}
      >
        {eyebrow}
      </p>
      <div
        className="text-[15px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 500 }}
      >
        {children}
      </div>
    </aside>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-5" style={{ listStyleType: "disc" }}>
      {items.map((item, idx) => (
        <li
          key={idx}
          className="text-[16px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 500 }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CompareTable({
  headers,
  rows,
}: {
  headers: [string, string, string];
  rows: Array<[string, string, string]>;
}) {
  return (
    <div
      className="overflow-hidden rounded-[14px] border"
      style={{ borderColor: "var(--line)" }}
    >
      <table className="w-full text-[14px]">
        <thead>
          <tr style={{ background: "var(--cream-2)" }}>
            {headers.map((h, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-left"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              style={
                idx > 0 ? { borderTop: "1px solid var(--line)" } : undefined
              }
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-3 align-top"
                  style={{
                    color: ci === 0 ? "var(--ink)" : "var(--mute-1)",
                    fontWeight: ci === 0 ? 700 : 500,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
