import Link from "next/link";
import { Display } from "../atoms/Display";
import { Masthead } from "../system/Masthead";
import { Stamp } from "../system/Stamp";
import { FOLLOW_MOMENTS } from "./FollowChoice";
import type { FollowMoment } from "./FollowChoice";
import { EmptyStateSync } from "./EmptyStateSync";
import { tournamentPhase } from "./data/tournament-phase";

// Following — empty / onboarding. One System D agate composition per width
// behind the md seam — same rows, same registers:
//
//   Mobile (md:hidden): each FOLLOW_MOMENT as a ruled agate row with a sport-
//     accent left tick, name, one-line detail, and mono →. NFL keeps its
//     outline stamp. Masthead, Display head, EmptyStateSync, and settings
//     link all stay mounted.
//
//   Desktop (hidden md:block, D4b): the same EmptyMomentRow agate rows at the
//     broadsheet measure — Masthead full width, content in the 18px editorial
//     gutter. The legacy moment-grouped picker cards (MomentSection) are
//     retired here; MomentSection still powers the /following/add picker.

// ── Mobile moment row ──────────────────────────────────────────────────────
//
// Layout: flex row, left tick + stacked (name / detail) + right stamp or →.
// Stacking name and detail vertically (matching the d-following follow-row
// pattern) keeps the stamp or arrow visible even when descriptions are long.

function EmptyMomentRow({ moment }: { moment: FollowMoment }) {
  const isComingSoon = Boolean(moment.comingSoon);
  // A concluded tournament (e.g. NBA Playoffs in the offseason) is no longer
  // followable, so mirror the desktop MomentSection: a muted, non-tappable row
  // with a "Season wrapped" stamp instead of a live link row. Read the ONE
  // derived phase signal, never a hardcoded date.
  const isConcluded =
    !isComingSoon &&
    !!moment.tournamentId &&
    tournamentPhase(moment.tournamentId) === "concluded";
  const isInactive = isComingSoon || isConcluded;

  const inner = (
    <>
      {/* Sport-accent left tick — 3px wide, stretches the full row height. */}
      <span
        aria-hidden
        style={{
          display: "block",
          width: 3,
          alignSelf: "stretch",
          background: moment.accent,
          flexShrink: 0,
          borderRadius: 1,
          marginRight: 2,
          // Inactive moments mute the accent so live moments earn the eye.
          opacity: isInactive ? 0.5 : 1,
        }}
      />

      {/* Left stack: name (display) + detail (mono, muted). */}
      <span className="min-w-0 flex-1">
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-display)",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: isInactive ? "var(--mute-1)" : "var(--ink)",
          }}
        >
          {moment.name}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--mute-2)",
          }}
        >
          {moment.description}
        </span>
      </span>

      {/* Right: coming-soon / concluded stamp, or mono → for live moments. */}
      {isComingSoon ? (
        <Stamp text="Coming Aug 2026" variant="outline" />
      ) : isConcluded ? (
        <Stamp text="Season wrapped" variant="outline" />
      ) : (
        <span aria-hidden style={{ color: "var(--mute-2)" }}>
          →
        </span>
      )}
    </>
  );

  const rowCls = "flex items-center gap-[10px] py-[14px]";
  const rowStyle = {
    borderBottom: "1px solid var(--line)",
  };

  const href = isInactive
    ? undefined
    : `/following/add#moment-${moment.id}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${rowCls} active:bg-[var(--paper)]`}
        style={rowStyle}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={rowCls} style={rowStyle}>
      {inner}
    </div>
  );
}

// ── FollowingEmpty ─────────────────────────────────────────────────────────

export function FollowingEmpty() {
  return (
    <section>
      {/* ── Mobile: System D agate composition (D3) ──────────────────── */}
      <div className="md:hidden">
        {/* Masthead — broadsheet nameplate, no live count on empty state. */}
        <div className="-mx-4 mb-5">
          <Masthead liveCount={0} />
        </div>

        <Display
          as="h1"
          size="lg"
          style={{
            fontWeight: 800,
            fontSize: "31px",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          Build your sports circle.
        </Display>

        {/* Three FOLLOW_MOMENTS as agate rows. Each row: accent tick +
            moment name + one-line detail + → (or "Coming Aug 2026" stamp
            for NFL). */}
        <div className="mt-5">
          {FOLLOW_MOMENTS.map((moment) => (
            <EmptyMomentRow key={moment.id} moment={moment} />
          ))}
        </div>

        {/* Settings shortcut — always reachable so push can be enabled
            even before the user has followed anything. */}
        <Link
          href="/settings"
          className="mt-5 flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]"
          style={{
            background: "transparent",
            borderColor: "var(--mute-2)",
            color: "var(--ink)",
          }}
          aria-label="Open Alerts & Notifications"
        >
          <span className="text-[13px]" style={{ fontWeight: 600 }}>
            Alerts & Notifications
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Notifications · No-Spoilers · Quiet hours
          </span>
        </Link>

        {/* Restore an existing circle on a fresh device. */}
        <EmptyStateSync />
      </div>

      {/* ── Desktop: System D agate composition (D4b) ────────────────── */}
      <div className="hidden md:block">
        {/* Masthead — broadsheet nameplate, no live count on empty state.
            Full width; the 2px rule spans the content measure (mx-0). */}
        <div className="mb-5">
          <Masthead liveCount={0} />
        </div>

        {/* 18px editorial gutter — the D4b desktop inset (matches Today). */}
        <div className="px-[18px]">
          <Display
            as="h1"
            size="lg"
            style={{
              fontWeight: 800,
              fontSize: "31px",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            Build your sports circle.
          </Display>

          {/* The same three FOLLOW_MOMENTS as agate rows. */}
          <div className="mt-5">
            {FOLLOW_MOMENTS.map((moment) => (
              <EmptyMomentRow key={moment.id} moment={moment} />
            ))}
          </div>

          {/* Settings shortcut — always reachable so push can be enabled
              even before the user has followed anything. */}
          <Link
            href="/settings"
            className="mt-5 flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]"
            style={{
              background: "transparent",
              borderColor: "var(--mute-2)",
              color: "var(--ink)",
            }}
            aria-label="Open Alerts & Notifications"
          >
            <span className="text-[13px]" style={{ fontWeight: 600 }}>
              Alerts & Notifications
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Notifications · No-Spoilers · Quiet hours
            </span>
          </Link>

          <EmptyStateSync />
        </div>
      </div>
    </section>
  );
}
