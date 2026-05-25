"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// PullToRefresh — Stage Phase-1.
//
// iOS PWAs in standalone mode have no native pull-to-refresh, and the
// rest of the app already kills overscroll-behavior. We own the gesture
// entirely.
//
// Behavior:
//   • Activates only when the page is scrolled to the very top
//     (window.scrollY === 0). Below that, regular scroll wins.
//   • Tracks touch delta; translates children downward with linear
//     resistance until the threshold (~72px), then sub-linear after to
//     give "give" without unbounded scroll
//   • Threshold met + release → call onRefresh; show a spinning ink
//     arc while the promise resolves; snap back when done
//   • Threshold NOT met on release → snap back instantly, no fetch
//
// Visual contract:
//   • A small circular arc rendered above the children, animated by
//     transform/opacity. Color: --ink, on the cream surface.
//   • The Stadium Panel mark sits inside the arc once it's fully
//     visible — confirms the brand moment without adding chrome
//     during normal scroll.

const PULL_THRESHOLD_PX = 72;
// Past the threshold, each additional px of finger movement only
// translates 0.4px of content. Gives a "weighty" feel and prevents
// unbounded growth.
const RESISTANCE_AFTER_THRESHOLD = 0.4;
// Maximum visible translation regardless of how hard the user pulls.
const MAX_TRANSLATE_PX = 120;
// Snap-back duration in ms when releasing or finishing a refresh.
const SNAP_BACK_MS = 200;

type Phase = "idle" | "pulling" | "refreshing" | "snapping";

export function PullToRefresh({
  onRefresh,
  children,
  /** When true the wrapper renders inert — useful for screens where
   *  the gesture would conflict with something else (a horizontal
   *  carousel, a modal, etc). */
  disabled = false,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Touch state lives in refs — we don't want a re-render on every move.
  const startYRef = useRef<number | null>(null);
  const lastTranslateRef = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [translateY, setTranslateY] = useState(0);

  const computeTranslate = useCallback((rawDelta: number): number => {
    if (rawDelta <= 0) return 0;
    if (rawDelta <= PULL_THRESHOLD_PX) return rawDelta;
    const extra = (rawDelta - PULL_THRESHOLD_PX) * RESISTANCE_AFTER_THRESHOLD;
    return Math.min(MAX_TRANSLATE_PX, PULL_THRESHOLD_PX + extra);
  }, []);

  const snapBackTo = useCallback((target: number) => {
    setPhase("snapping");
    setTranslateY(target);
    // After the CSS transition, drop back to idle so the wrapper is
    // ready for the next pull. The exact length must match the CSS
    // transition duration so we don't yank state mid-animation.
    window.setTimeout(() => {
      setPhase("idle");
      lastTranslateRef.current = 0;
    }, SNAP_BACK_MS);
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;
      // Only engage at the absolute top of the page. Anything else and
      // the user is just scrolling.
      if (window.scrollY > 0) return;
      // Don't try to handle multi-touch (pinch, etc).
      if (e.touches.length !== 1) return;
      // Don't fire if the touch started on an interactive element —
      // tapping a button shouldn't accidentally start a refresh.
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          'button, a, [role="button"], input, textarea, select, [role="radio"], [role="switch"]'
        )
      ) {
        // We still allow the gesture if the user moves their finger
        // far enough — set the start but bias the threshold higher.
        // For simplicity though, just skip these touches.
        return;
      }
      startYRef.current = e.touches[0].clientY;
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;
      if (startYRef.current === null) return;
      if (phase === "refreshing" || phase === "snapping") return;
      // If the user has scrolled away from the top mid-gesture (shouldn't
      // be possible but defensive), reset.
      if (window.scrollY > 0) {
        startYRef.current = null;
        setPhase("idle");
        setTranslateY(0);
        return;
      }
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        // Finger moved up — user is trying to scroll, not refresh.
        // Don't preventDefault; let scroll happen.
        if (translateY !== 0) {
          setTranslateY(0);
          setPhase("idle");
        }
        return;
      }
      const next = computeTranslate(dy);
      lastTranslateRef.current = next;
      setTranslateY(next);
      setPhase("pulling");
      // Suppress page scroll while we own the gesture.
      if (e.cancelable) e.preventDefault();
    },
    [computeTranslate, disabled, phase, translateY]
  );

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;
    if (startYRef.current === null) return;
    startYRef.current = null;

    const traveled = lastTranslateRef.current;
    if (phase !== "pulling") {
      // Wasn't actually pulling — nothing to commit.
      return;
    }

    if (traveled >= PULL_THRESHOLD_PX) {
      // Commit: lock the indicator visible at the threshold height,
      // call onRefresh, snap back when it resolves.
      setPhase("refreshing");
      setTranslateY(PULL_THRESHOLD_PX);
      Promise.resolve(onRefresh())
        .catch(() => {
          /* swallow — UI just snaps back, error surfaces via the
             screen's own loading state if any */
        })
        .finally(() => {
          snapBackTo(0);
        });
    } else {
      // Didn't meet threshold — snap back without firing.
      snapBackTo(0);
    }
  }, [disabled, onRefresh, phase, snapBackTo]);

  // Bind listeners imperatively so we can pass { passive: false } for
  // touchmove — required to call preventDefault during the pull.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Indicator visibility: 0 at translateY === 0, 1 at threshold or beyond.
  const indicatorProgress = Math.min(1, translateY / PULL_THRESHOLD_PX);
  const isVisible = translateY > 6;
  const isRefreshing = phase === "refreshing";

  return (
    <div
      ref={wrapperRef}
      className="relative"
      style={{
        // The wrapper itself doesn't translate — only the children do.
        // Indicator is absolutely positioned above so it appears in the
        // "pulled-down" space.
        touchAction: "pan-y",
      }}
    >
      {/* Indicator — fixed at top, fades + scales with pull progress.
          Sits above the content so it appears in the gap created by the
          translated children below. */}
      <div
        aria-hidden={!isRefreshing}
        aria-label={isRefreshing ? "Refreshing" : undefined}
        role={isRefreshing ? "status" : undefined}
        className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 items-center justify-center"
        style={{
          height: PULL_THRESHOLD_PX,
          width: PULL_THRESHOLD_PX,
          marginTop: -PULL_THRESHOLD_PX, // hides above viewport when idle
          transform: `translate(-50%, ${translateY}px)`,
          opacity: isVisible ? indicatorProgress : 0,
          transition:
            phase === "snapping"
              ? `transform ${SNAP_BACK_MS}ms ease-out, opacity ${SNAP_BACK_MS}ms ease-out`
              : "none",
        }}
      >
        <span
          aria-hidden
          className={isRefreshing ? "no-noise-spin" : ""}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "2px solid var(--mute-2)",
            borderTopColor: "var(--ink)",
            // Idle/pulling: the arc is "wound up" — rotation tracks the
            // pull progress so the user sees their gesture mapped to
            // something visual.
            transform: isRefreshing
              ? undefined
              : `rotate(${indicatorProgress * 360}deg)`,
            transition: "transform 0.06s linear",
          }}
        />
      </div>

      {/* Children translate downward as the user pulls. */}
      <div
        style={{
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition:
            phase === "snapping"
              ? `transform ${SNAP_BACK_MS}ms ease-out`
              : "none",
          willChange: phase === "idle" ? "auto" : "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
