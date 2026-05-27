"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows, usePinned, useUserPrefs } from "../providers";

// First-run onboarding strip — calm checklist shown on Today until
// the user is set up.
//
// Renders only when:
//   • all three state slices have hydrated from localStorage
//   • the user hasn't explicitly dismissed the strip
//   • the two required setup steps (follow + notif decision) are
//     still incomplete. Pin is shown as an informational third step
//     but does NOT gate dismissal — pinning is a feature people use
//     situationally, not a setup prerequisite. Gating on pin caused
//     the strip to re-appear for returning users who pinned a game,
//     watched it finish, and unpinned. They aren't new users, they
//     just don't have anything pinned right now. The pin step still
//     shows when the strip is visible (educational), but pin status
//     doesn't decide whether the strip renders.
//
// Auto-persistence: once both gating steps complete, we set
// `firstRunDismissed = true` so the strip stays hidden even if the
// user later unfollows everything or some weird state change happens.
// Once onboarded, the user is treated as a returning user forever.
//
// Each card shows its own status — completed cards show a ✓ and a
// confirming line, pending cards show a CTA.

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

  const followDone = follows.length > 0;
  const pinDone = pinned.length > 0;
  // "notif done" means the user has made a decision either way —
  // granted, denied, or explicitly tapped Not now. We read the prefs
  // flag rather than asking Notification.permission directly so the
  // gate is consistent with EnableNotificationsCard.
  const notifDone = Boolean(prefs.notifPromptDismissed);

  // Auto-persistence: once both gating steps are complete, set
  // firstRunDismissed in prefs so the strip stays hidden forever even
  // if the user later unfollows everything or unpins. Prevents the
  // strip from "re-prompting" a returning user just because their
  // current state happens to lack a follow or a pin. Pin is NOT a
  // gating step (see file header comment for why) — it's
  // informational only when the strip is visible.
  const onboardingComplete = followDone && notifDone;
  useEffect(() => {
    if (
      followsHydrated &&
      pinnedHydrated &&
      prefsHydrated &&
      onboardingComplete &&
      !prefs.firstRunDismissed
    ) {
      dismissFirstRun();
    }
  }, [
    followsHydrated,
    pinnedHydrated,
    prefsHydrated,
    onboardingComplete,
    prefs.firstRunDismissed,
    dismissFirstRun,
  ]);

  // Hydration gate — we never want to flash the strip for a returning
  // user whose state hasn't loaded from localStorage yet.
  if (!followsHydrated || !pinnedHydrated || !prefsHydrated) return null;
  if (prefs.firstRunDismissed) return null;

  // The actual show condition. Drop pin from the gate — pinning is a
  // feature, not a setup step. A returning user who completed
  // onboarding then unpinned everything would otherwise get the strip
  // back, which is the reported bug.
  if (onboardingComplete) return null;

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
          title="Follow what you care about"
          pendingDetail=""
          doneDetail={`Following ${follows.length} ${follows.length === 1 ? "thing" : "things"}.`}
          href="/following"
        />
        <PinStep done={pinDone} pinned={pinned.length} />
        <Step
          index={3}
          done={notifDone}
          // Title used to read "Pick what gets alerts" but that gated
          // on prefs.notifPromptDismissed — the *push permission
          // decision* flag, not the per-follow alert tier. Users who
          // picked tiers expected the step to complete and it didn't.
          // Renamed so the title matches what actually flips the gate.
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
          // Both states use 2px so the visual weight is consistent
          // between done and pending steps. 1.5px borders rendered
          // brittle at mobile pixel density.
          border: `2px solid ${done ? "var(--ink)" : "var(--mute-2)"}`,
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
            Pin games to track them
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
          alerts. That&apos;s set on each follow.
        </p>
      ) : null}
    </li>
  );
}
