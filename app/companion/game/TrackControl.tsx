"use client";

import { useRef, useState } from "react";
import { useIsNative } from "../dev/native-detect";
import {
  areLiveActivitiesEnabled,
  startLiveActivity,
  type LiveActivityStartInput,
} from "../native/live-activity";
import { slotState } from "../system/lock-screen-slots";

// TrackControl — the System D "docking" control (spec §8, visualized in
// docs/superpowers/design-directions/d-docking.html). One control, four
// truths. Filled pill = action. Outlined stamp = held state. No silent
// success: if Live Activities are off, the control says so instead of
// pretending the score reached the lock screen.
//
// The four states:
//   default → filled pill. Verb by platform (native+live = "Track on Lock
//             Screen", else "Add to Watching").
//   held    → outlined ◉ stamp, "tap to remove".
//   full    → outlined disabled stamp, "Lock screen full · N of 3".
//   denied  → outlined stamp "Turn on Live Activities" (game is still in
//             Watching; Live Activities are off in iOS Settings).
//
// Above the control, native only: a proactive slot meter (pips + "N OF 3
// LOCK SCREEN SLOTS USED"). Slot arithmetic is the pure slotState() helper.
//
// This is the foundation control. It is wired into the /dev/system-preview
// gallery here; the game-detail callers adopt it in a later D2 task (they
// will pass pinnedLiveIds + startInput). Its onPin/onUnpin surface is
// compatible with PinControls so that swap is a drop-in.

// Plain localStorage flag (not a stored pref): the one-time "it's on your
// lock screen" hint is a purely local, cosmetic teach that never syncs and
// never gates behaviour, so the smallest correct thing is a single flag read
// in this component. Matches LiveTrackHint's approach.
const DOCK_HINT_KEY = "no-noise-dock-hint-seen";

type TrackState = "default" | "held" | "full" | "denied";

export function TrackControl({
  gameId,
  live,
  pinned,
  onPin,
  onUnpin,
  pinnedLiveIds,
  startInput,
  className,
  __preview,
}: {
  gameId: string;
  /** Whether the game is live right now. Only live games can be tracked on
   *  the lock screen; non-live pins are Watching-only. */
  live: boolean;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  /** Ordered pinned-and-live game ids (newest-pinned first). Drives the
   *  slot meter and the full state. */
  pinnedLiveIds: string[];
  /** The Live Activity start payload for this game, when live. Used for the
   *  instant on-tap start; the LiveActivitySync poll is the backstop. */
  startInput?: LiveActivityStartInput | null;
  className?: string;
  /** Reserved for the future "manage in Watching" link a later task threads
   *  through from the game-detail surface. Kept on the interface for
   *  call-site compatibility; unused today. */
  href?: string;
  /** TEST-ONLY. The gallery renders on web, where useIsNative() is always
   *  false, so the native states can't occur naturally. This forces the
   *  render path. Never set from a production caller. */
  __preview?: { native: boolean; state: TrackState };
}) {
  const nativeReal = useIsNative();
  // Session-local denial: a failed preflight/start flips this game to the
  // denied state for the session. Not persisted (per spec). Cleared on a
  // later successful start or on unpin.
  const [denied, setDenied] = useState(false);
  // Shows the one-time hint for the remainder of this mount after a fresh
  // successful dock.
  const [showHint, setShowHint] = useState(false);
  const hintSeenRef = useRef<boolean>(readHintSeen());

  // Unpinning clears any denial so a re-dock starts clean. React's
  // "adjust state when a prop changes" pattern (setState during render off a
  // tracked prev value), not an effect — no extra commit, no cascading render.
  const [prevPinned, setPrevPinned] = useState(pinned);
  if (prevPinned !== pinned) {
    setPrevPinned(pinned);
    if (!pinned && denied) setDenied(false);
  }

  const native = __preview ? __preview.native : nativeReal;
  const slot = slotState(pinnedLiveIds, gameId);

  // Real render state, before the preview override.
  let realState: TrackState;
  if (pinned) {
    realState = native && live && denied ? "denied" : "held";
  } else {
    realState = native && live && slot.full ? "full" : "default";
  }
  const state = __preview ? __preview.state : realState;

  // Lock-screen wording applies only to a live game on native.
  const lockScreen = native && live;
  // Hint copy shows on a fresh dock (or, in preview, whenever held).
  const heldHint = __preview ? state === "held" : showHint;

  function markDockedAndMaybeHint() {
    setDenied(false);
    if (hintSeenRef.current) return;
    setShowHint(true);
    hintSeenRef.current = true;
    try {
      localStorage.setItem(DOCK_HINT_KEY, "1");
    } catch {
      /* storage blocked — the hint just won't persist; harmless */
    }
  }

  // Preflight then start. Shared by the first dock (after onPin) and the
  // denied-state retry (game already pinned). onPin has already run.
  async function attemptDock() {
    const enabled = await areLiveActivitiesEnabled();
    if (enabled === false) {
      setDenied(true);
      return;
    }
    // true or null (unknown): try the direct start. The poll is the backstop
    // if startInput isn't supplied yet.
    if (startInput) {
      const ok = await startLiveActivity(startInput);
      if (!ok) {
        setDenied(true);
        return;
      }
    }
    markDockedAndMaybeHint();
  }

  function handleTap() {
    if (lockScreen) {
      onPin(); // optimistic + instant, then reconcile against the OS
      void attemptDock();
    } else {
      onPin(); // web / non-live: Watching only
    }
  }

  return (
    <div className={className}>
      {native ? <SlotMeter used={slot.used} max={slot.max} /> : null}

      {state === "default" ? (
        <DefaultCta
          lockScreen={lockScreen}
          nativeUpcoming={native && !live}
          onTap={handleTap}
        />
      ) : null}

      {state === "held" ? (
        <HeldStamp
          lockScreen={lockScreen}
          hint={heldHint}
          onUnpin={onUnpin}
        />
      ) : null}

      {state === "full" ? <FullStamp used={slot.used} max={slot.max} /> : null}

      {state === "denied" ? (
        <DeniedStamp onRetry={() => void attemptDock()} />
      ) : null}
    </div>
  );
}

// ── Slot meter ──────────────────────────────────────────────────────────
// pips + "N OF 3 LOCK SCREEN SLOTS USED". Native only.
function SlotMeter({ used, max }: { used: number; max: number }) {
  return (
    <p
      className="mb-2.5 flex items-center tabular-nums lining-nums uppercase"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.14em",
        color: "var(--mute-1)",
        gap: 8,
      }}
    >
      <span className="inline-flex" style={{ gap: 4 }} aria-hidden>
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 14,
              height: 5,
              background: i < used ? "var(--ink)" : "transparent",
              border: i < used ? "none" : "1px solid var(--mute-2)",
            }}
          />
        ))}
      </span>
      {used} of {max} lock screen slots used
    </p>
  );
}

// ── Default: filled pill CTA ────────────────────────────────────────────
function DefaultCta({
  lockScreen,
  nativeUpcoming,
  onTap,
}: {
  lockScreen: boolean;
  nativeUpcoming: boolean;
  onTap: () => void;
}) {
  const label = lockScreen ? "Track on Lock Screen" : "Add to Watching";
  const subnote = lockScreen
    ? "Keeps the score on your lock screen and in Watching."
    : nativeUpcoming
      ? "Keeps it in Watching. It tracks your lock screen when it starts."
      : "Keeps this game in Watching. Alerts come from follows.";
  return (
    <>
      <button
        type="button"
        onClick={onTap}
        aria-label={label}
        className="flex w-full items-center justify-center rounded-full transition active:scale-[0.98]"
        style={{
          gap: 8,
          background: "var(--ink)",
          color: "var(--cream)",
          fontSize: 14,
          fontWeight: 600,
          padding: 15,
          minHeight: 44,
        }}
      >
        {lockScreen ? <LockGlyph /> : null}
        {label}
      </button>
      <Subnote>{subnote}</Subnote>
    </>
  );
}

// ── Held: outlined ◉ stamp, tap to remove ───────────────────────────────
function HeldStamp({
  lockScreen,
  hint,
  onUnpin,
}: {
  lockScreen: boolean;
  hint: boolean;
  onUnpin: () => void;
}) {
  const label = lockScreen
    ? "◉ On your lock screen · tap to remove"
    : "✓ In Watching · tap to remove";
  return (
    <>
      <OutlineStamp
        onClick={onUnpin}
        ariaLabel={lockScreen ? "Remove from lock screen" : "Remove from Watching"}
      >
        {label}
      </OutlineStamp>
      {hint && lockScreen ? (
        <Subnote>It&rsquo;s on your lock screen. You can leave the app.</Subnote>
      ) : null}
    </>
  );
}

// ── Full: outlined disabled stamp ───────────────────────────────────────
function FullStamp({ used, max }: { used: number; max: number }) {
  return (
    <>
      <OutlineStamp disabled>
        Lock screen full · {used} of {max}
      </OutlineStamp>
      <Subnote>Remove a game in Watching to track this one.</Subnote>
    </>
  );
}

// ── Denied: Live Activities off ─────────────────────────────────────────
function DeniedStamp({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <OutlineStamp onClick={onRetry} ariaLabel="Live Activities are off. Turn them on in iOS Settings, then tap to retry.">
        Turn on Live Activities
      </OutlineStamp>
      <Subnote>
        Added to Watching. The lock screen needs Live Activities on in iOS
        Settings.
      </Subnote>
    </>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────
function OutlineStamp({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex w-full items-center justify-center uppercase transition active:scale-[0.99]"
      style={{
        gap: 8,
        border: `1.5px solid ${disabled ? "var(--mute-2)" : "var(--ink)"}`,
        color: disabled ? "var(--mute-2)" : "var(--ink)",
        background: "transparent",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: "0.08em",
        padding: 14,
        minHeight: 44,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Subnote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-center"
      style={{
        marginTop: 9,
        fontSize: 11.5,
        fontWeight: 500,
        color: "var(--mute-1)",
      }}
    >
      {children}
    </p>
  );
}

// Small lock-screen glyph so the filled verb reads as a lock-screen action.
// currentColor inherits the button ink.
function LockGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="2" width="12" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
      <line x1="9.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Local one-time-flag read, guarded for SSR / blocked storage. Only consulted
// inside click handlers (client, post-mount), so it never causes a hydration
// mismatch.
function readHintSeen(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(DOCK_HINT_KEY) === "1";
  } catch {
    return false;
  }
}
