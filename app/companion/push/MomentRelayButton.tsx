"use client";

import { useState } from "react";
import { usePushSubscription } from "./use-push-subscription";

// One-tap "tell me when the next moment is ready" — the Moment Relay arm
// (2026-07-14 review play). Bridges the dead zone between tournaments: the
// user opts in once, we stay silent, and one push arrives when the moment is
// live. Not a follow, no alert slot. Web-first: the target user (a World Cup
// follower with alerts on) already has a push subscription, so this is a
// single tap. If they're not subscribed we secure permission + subscribe
// inline so the promise ("we'll notify you") is real.

const SUB_KEY = "no-noise:push-subscription:v1";

function storedEndpoint(): string | null {
  try {
    const raw = localStorage.getItem(SUB_KEY);
    if (!raw) return null;
    const sub = JSON.parse(raw) as { endpoint?: string };
    return typeof sub.endpoint === "string" ? sub.endpoint : null;
  } catch {
    return null;
  }
}

type State = "idle" | "arming" | "armed" | "needs-permission" | "error";

export function MomentRelayButton({
  moment,
  label,
  confirm,
}: {
  moment: string;
  label: string;
  confirm: string;
}) {
  const [state, setState] = useState<State>("idle");
  const { subscribe } = usePushSubscription();

  async function arm() {
    setState("arming");
    try {
      let endpoint = storedEndpoint();
      if (!endpoint) {
        if (
          typeof Notification !== "undefined" &&
          Notification.permission !== "granted"
        ) {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") {
            setState("needs-permission");
            return;
          }
        }
        const sub = await subscribe({ alerts: [], noSpoilers: false });
        endpoint = sub?.endpoint ?? storedEndpoint();
      }
      if (!endpoint) {
        setState("error");
        return;
      }
      const res = await fetch("/api/push/moment-relay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moment, endpoint }),
      });
      setState(res.ok ? "armed" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "armed") {
    return (
      <p
        className="mt-3 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {confirm}
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={arm}
        disabled={state === "arming"}
        className="inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70 disabled:opacity-50"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "var(--ink)",
          background: "transparent",
        }}
      >
        {state === "arming" ? "Setting up" : label}
        <span aria-hidden>→</span>
      </button>
      {state === "needs-permission" ? (
        <p
          className="mt-1 text-[12px] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          Turn on notifications to be reminded.
        </p>
      ) : null}
      {state === "error" ? (
        <p
          className="mt-1 text-[12px] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          Could not set the reminder. Try again in a moment.
        </p>
      ) : null}
    </div>
  );
}
