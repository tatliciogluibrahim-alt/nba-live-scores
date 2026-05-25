"use client";

import { useState } from "react";
import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows, usePinned, useUserPrefs } from "../providers";

// First-run onboarding strip — three calm steps shown on Today until
// the user is set up.
//
// Renders only when:
//   • all three state slices have hydrated from localStorage
//   • the user hasn't explicitly dismissed the strip
//   • at least one of the three steps is still incomplete (so a
//     fully-set-up user never sees the strip flash on cold launch)
//
// Each card shows its own status — completed cards show a ✓ and a
// confirming line, pending cards show a CTA. The strip auto-retires
// once all three are done so we don't keep three checkmarks lingering
// on Today forever.

type StepProps = {
  index: number;
  done: boolean;
  title: string;
  /** Sub-line shown ONLY when the step is done — factual confirmation
   *  like "Following 2 things." Pending state stays title-only. */
  doneDetail: string;
  /** Kept on the type for the caller's clarity even though it isn't
   *  rendered today. If we ever bring back pending subtext, the call
   *  sites still pass it. */
  pendingDetail?: string;
  href?: string;
  onAction?: () => void;
};

export function FirstRunStrip() {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  const { prefs, dismissFirstRun, hydrated: prefsHydrated } = useUserPrefs();

  // Hydration gate — we never want to flash the strip for a returning
  // user whose state hasn't loaded from localStorage yet.
  if (!followsHydrated || !pinnedHydrated || !prefsHydrated) return null;
  if (prefs.firstRunDismissed) return null;

  const followDone = follows.length > 0;
  const pinDone = pinned.length > 0;
  // "notif done" means the user has made a decision either way —
  // granted, denied, or explicitly tapped Not now. We read the prefs
  // flag rather than asking Notification.permission directly so the
  // gate is consistent with EnableNotificationsCard.
  const notifDone = Boolean(prefs.notifPromptDismissed);

  if (followDone && pinDone && notifDone) return null;

  return (
    <section
      className="mb-4 rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--nba)",
      }}
      aria-label="Get started"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <Eyebrow>Get started</Eyebrow>
        <button
          type="button"
          onClick={() => dismissFirstRun()}
          aria-label="Dismiss the get-started strip"
          className="text-[11px] underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Hide
        </button>
      </div>

      <ol className="space-y-2">
        <Step
          index={1}
          done={followDone}
          title="Follow your teams"
          pendingDetail=""
          doneDetail={`Following ${follows.length} ${follows.length === 1 ? "thing" : "things"}.`}
          href="/following"
        />
        <PinStep done={pinDone} pinned={pinned.length} />
        <Step
          index={3}
          done={notifDone}
          title="Turn on notifications"
          pendingDetail=""
          doneDetail="Choice saved."
          href="/settings"
        />
      </ol>
    </section>
  );
}

function Step({ index, done, title, doneDetail, href, onAction }: StepProps) {
  const inner = (
    <>
      <span
        aria-hidden
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
        style={{
          background: done ? "var(--ink)" : "transparent",
          border: `1.5px solid ${done ? "var(--ink)" : "var(--mute-2)"}`,
          color: done ? "var(--cream)" : "var(--mute-1)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {done ? "✓" : index}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] leading-snug"
          style={{
            color: done ? "var(--mute-1)" : "var(--ink)",
            fontWeight: done ? 500 : 700,
          }}
        >
          {title}
        </p>
        {/* Pending state intentionally hides the sub line — the title
            ("Follow your teams" / "Turn on notifications") is already
            clear. Marketing-y subtext felt like noise. Done state still
            renders the factual status confirmation. */}
        {done && doneDetail ? (
          <p
            className="mt-0.5 text-[11px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {doneDetail}
          </p>
        ) : null}
      </div>
    </>
  );

  const className =
    "flex w-full items-center gap-3 min-h-[44px] rounded-[10px] px-1 py-1 text-left transition active:scale-[0.99]";

  // Done items remain interactive (user can revisit) but get muted
  // styling. Pending items are visually emphasized.
  if (href) {
    return (
      <li>
        <Link href={href} className={className}>
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={onAction} className={className}>
        {inner}
      </button>
    </li>
  );
}

/** Card 2 — Pin. Doesn't navigate (Pin requires a game detail page,
 *  but listing those here would be inconsistent with the other cards).
 *  Instead it expands an inline explainer the user can read. */
function PinStep({ done, pinned }: { done: boolean; pinned: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 min-h-[44px] rounded-[10px] px-1 py-1 text-left transition active:scale-[0.99]"
      >
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
          style={{
            background: done ? "var(--ink)" : "transparent",
            border: `1.5px solid ${done ? "var(--ink)" : "var(--mute-2)"}`,
            color: done ? "var(--cream)" : "var(--mute-1)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {done ? "✓" : 2}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] leading-snug"
            style={{
              color: done ? "var(--mute-1)" : "var(--ink)",
              fontWeight: done ? 500 : 700,
            }}
          >
            Pin a game during play
          </p>
          {done ? (
            <p
              className="mt-0.5 text-[11px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {pinned} {pinned === 1 ? "game" : "games"} pinned.
            </p>
          ) : null}
        </div>
      </button>

      {expanded && !done ? (
        <p
          className="mt-1 px-1 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Open any game from Today or Following, tap{" "}
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>Pin to Watching</span>
          . That game appears on your Watching tab during play. Pinning does not turn on
          notifications. That&apos;s what Follow does.
        </p>
      ) : null}
    </li>
  );
}

