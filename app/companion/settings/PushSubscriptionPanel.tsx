"use client";

import { useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { usePushSubscription } from "../push/use-push-subscription";

// Stage B push panel — lives in Settings.
//
// Shows the current Web Push subscription state for this device and
// exposes three actions:
//
//   1. Enable / Disable     — controls the browser-level subscription
//   2. Send test push       — fires a real server-initiated push
//   3. Send in 10s          — same, but with a delay so the user can
//                             close the app and confirm closed-app push
//
// This panel does NOT request notification permission — that flow lives
// on Today's EnableNotificationsCard so a fresh install user sees it
// without digging into Settings. The panel assumes the user is either
// already past that step, or is here to disable / debug.

export function PushSubscriptionPanel() {
  const { status, subscribe, unsubscribe, sendTest } = usePushSubscription();
  const [working, setWorking] = useState<null | "subscribe" | "unsubscribe" | "test" | "delayed-test">(
    null
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  // States where the panel renders no controls — only an explanatory line.
  if (status.state === "loading") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Checking subscription status…
        </p>
      </section>
    );
  }

  if (status.state === "unsupported") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Push isn&apos;t supported in this browser. On iPhone, install the app to your home screen
          first — Safari tabs can&apos;t receive push.
        </p>
      </section>
    );
  }

  if (status.state === "no-vapid") {
    return (
      <section>
        <PanelHeader />
        <p className="text-[12px]" style={{ color: "var(--mute-1)", fontWeight: 500 }}>
          Push backend not configured for this environment. Missing{" "}
          <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>.
        </p>
      </section>
    );
  }

  async function handleSubscribe() {
    setWorking("subscribe");
    setFeedback(null);
    const sub = await subscribe();
    setWorking(null);
    if (!sub) {
      setFeedback(
        "Couldn't subscribe. If you haven't enabled notifications yet, do that from Today first."
      );
    } else {
      setFeedback("Subscribed. Push is live on this device.");
    }
  }

  async function handleUnsubscribe() {
    setWorking("unsubscribe");
    setFeedback(null);
    await unsubscribe();
    setWorking(null);
    setFeedback("Unsubscribed. No more push to this device until you re-enable.");
  }

  async function handleTest(delayMs: number) {
    setWorking(delayMs > 0 ? "delayed-test" : "test");
    setFeedback(null);
    const res = await sendTest({ delayMs });
    setWorking(null);
    if (res.ok) {
      setFeedback(
        delayMs > 0
          ? `Test push queued. Close the app within ${Math.round(delayMs / 1000)}s.`
          : "Test push sent. Check your notification tray."
      );
    } else {
      setFeedback(res.error ?? "Test push failed.");
    }
  }

  return (
    <section>
      <PanelHeader />

      <p
        className="mb-3 text-[12px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {status.state === "subscribed"
          ? "This device is subscribed. Pushes from our server will arrive here even when the app is closed."
          : status.state === "error"
            ? status.message
            : "Not subscribed. Enable to receive moment-of pings."}
      </p>

      <div className="flex flex-col gap-2">
        {status.state === "subscribed" ? (
          <>
            <button
              type="button"
              onClick={() => handleTest(0)}
              disabled={working !== null}
              aria-label="Send a test push right now"
              className="inline-flex min-h-[40px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
                opacity: working ? 0.7 : 1,
              }}
            >
              {working === "test" ? "Sending…" : "Send test push now"}
            </button>
            <button
              type="button"
              onClick={() => handleTest(10_000)}
              disabled={working !== null}
              aria-label="Send a test push in 10 seconds so you can close the app first"
              className="inline-flex min-h-[40px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                opacity: working ? 0.7 : 1,
              }}
            >
              {working === "delayed-test"
                ? "Queued — close the app…"
                : "Send in 10s (close the app to test)"}
            </button>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={working !== null}
              aria-label="Unsubscribe this device from push"
              className="inline-flex min-h-[40px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--mute-1)",
                border: "1px solid var(--line)",
              }}
            >
              {working === "unsubscribe" ? "Unsubscribing…" : "Disable push on this device"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={working !== null}
            aria-label="Subscribe this device to push"
            className="inline-flex min-h-[40px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
              opacity: working ? 0.7 : 1,
            }}
          >
            {working === "subscribe" ? "Subscribing…" : "Enable push on this device"}
          </button>
        )}
      </div>

      {feedback ? (
        <p
          className="mt-3 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {feedback}
        </p>
      ) : null}
    </section>
  );
}

function PanelHeader() {
  return (
    <div className="mb-2 flex items-center gap-3">
      <Eyebrow>Push on this device</Eyebrow>
      <div className="h-px flex-1" style={{ background: "var(--line)" }} />
    </div>
  );
}
