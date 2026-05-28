"use client";

import { useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";
import type { Follow, FollowKind } from "../state/types";

// Multi-device follow sync via share code (Phase 21C). No accounts —
// a one-time pull:
//
//   "Show my code"  → POST this device's follows, display a 6-char code.
//   "Enter a code"  → GET the snapshot for a code, merge its follows in.
//
// Merge is additive and de-duped (addFollow ignores follows you already
// have), so pulling a code never removes anything you follow locally.
// The received snapshot carries only { kind, id } — your local default
// alert tier applies to each newly-added follow.

const VALID_KINDS: ReadonlySet<string> = new Set<FollowKind>([
  "team",
  "country",
  "series",
  "tournament",
]);

type Mode = "menu" | "show" | "enter";

export function SyncCircleModal({
  follows,
  onClose,
}: {
  follows: Follow[];
  onClose: () => void;
}) {
  const { addFollow } = useFollows();
  const [mode, setMode] = useState<Mode>("menu");

  // Show-code state.
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Enter-code state.
  const [input, setInput] = useState("");
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "notfound" }
    | { kind: "merged"; added: number; total: number }
    | { kind: "error" }
  >({ kind: "idle" });

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/circle/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follows: follows.map((f) => ({ kind: f.kind, id: f.id })),
        }),
      });
      const json = (await res.json()) as { ok: boolean; code?: string };
      setCode(json.ok && json.code ? json.code : null);
    } catch {
      setCode(null);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePull() {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    setPulling(true);
    setResult({ kind: "idle" });
    try {
      const res = await fetch(
        `/api/circle/share/${encodeURIComponent(trimmed)}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as {
        ok: boolean;
        found: boolean;
        follows: Array<{ kind: string; id: string }>;
      };
      if (!json.ok || !json.found) {
        setResult({ kind: "notfound" });
        return;
      }
      const existing = new Set(follows.map((f) => `${f.kind}:${f.id}`));
      let added = 0;
      for (const f of json.follows) {
        if (!VALID_KINDS.has(f.kind)) continue;
        const key = `${f.kind}:${f.id}`;
        if (existing.has(key)) continue;
        addFollow(f.kind as FollowKind, f.id);
        existing.add(key);
        added += 1;
      }
      setResult({ kind: "merged", added, total: json.follows.length });
    } catch {
      setResult({ kind: "error" });
    } finally {
      setPulling(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sync your sports circle across devices"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
      style={{ background: "rgba(26, 22, 18, 0.45)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-t-[18px] sm:rounded-[18px]"
        style={{
          background: "var(--cream)",
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        }}
      >
        <div className="flex justify-center pb-1 pt-2 sm:hidden">
          <div
            aria-hidden
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--mute-2)" }}
          />
        </div>

        <div className="px-4 pb-4 pt-3">
          <Eyebrow>Sync</Eyebrow>
          <h2
            className="mt-1 text-[20px]"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            Move your circle
          </h2>
          <p
            className="mt-1 text-[13px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Carry your follows to another device with a short code. Codes
            last 24 hours.
          </p>

          {/* ── Menu ── */}
          {mode === "menu" ? (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMode("show");
                  if (!code) handleGenerate();
                }}
                className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] border px-3 py-3 text-left transition active:scale-[0.99]"
                style={{
                  background: "var(--paper)",
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                }}
              >
                <span className="text-[13px]" style={{ fontWeight: 700 }}>
                  Show my code
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  Send follows to another device
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("enter")}
                className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] border px-3 py-3 text-left transition active:scale-[0.99]"
                style={{
                  background: "var(--paper)",
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                }}
              >
                <span className="text-[13px]" style={{ fontWeight: 700 }}>
                  Enter a code
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  Pull follows from another device
                </span>
              </button>
            </div>
          ) : null}

          {/* ── Show code ── */}
          {mode === "show" ? (
            <div className="mt-4">
              <div
                className="flex flex-col items-center rounded-[14px] border px-4 py-6"
                style={{ background: "var(--paper)", borderColor: "var(--line)" }}
              >
                {generating ? (
                  <p
                    className="text-[13px]"
                    style={{ color: "var(--mute-1)", fontWeight: 500 }}
                  >
                    Generating…
                  </p>
                ) : code ? (
                  <>
                    <p
                      className="mb-1 text-[11px] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.12em",
                        color: "var(--mute-1)",
                        fontWeight: 600,
                      }}
                    >
                      Your code
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 40,
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        color: "var(--ink)",
                      }}
                    >
                      {code}
                    </p>
                    <p
                      className="mt-2 text-center text-[12px]"
                      style={{ color: "var(--mute-1)", fontWeight: 500 }}
                    >
                      On your other device, open Following → Sync → Enter a
                      code.
                    </p>
                  </>
                ) : (
                  <p
                    className="text-center text-[13px]"
                    style={{ color: "var(--critical)", fontWeight: 500 }}
                  >
                    Couldn&apos;t generate a code. Try again.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* ── Enter code ── */}
          {mode === "enter" ? (
            <div className="mt-4">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="ABC123"
                aria-label="Share code"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={12}
                className="w-full rounded-[12px] border px-3 py-3 text-center"
                style={{
                  background: "var(--paper)",
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                }}
              />
              <button
                type="button"
                onClick={handlePull}
                disabled={pulling || input.trim().length < 4}
                className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
                style={{
                  background: "var(--ink)",
                  color: "var(--cream)",
                  border: "1px solid var(--ink)",
                  opacity: pulling || input.trim().length < 4 ? 0.5 : 1,
                }}
              >
                {pulling ? "Pulling…" : "Pull follows"}
              </button>

              {result.kind === "merged" ? (
                <p
                  className="mt-3 text-center text-[13px]"
                  style={{ color: "var(--ink)", fontWeight: 600 }}
                >
                  {result.added > 0
                    ? `Added ${result.added} ${result.added === 1 ? "follow" : "follows"}. You're synced.`
                    : "You already follow everything on that code."}
                </p>
              ) : result.kind === "notfound" ? (
                <p
                  className="mt-3 text-center text-[12px]"
                  style={{ color: "var(--critical)", fontWeight: 500 }}
                >
                  That code isn&apos;t valid or has expired.
                </p>
              ) : result.kind === "error" ? (
                <p
                  className="mt-3 text-center text-[12px]"
                  style={{ color: "var(--critical)", fontWeight: 500 }}
                >
                  Something went wrong. Try again.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* ── Footer controls ── */}
          <div className="mt-4 flex gap-2">
            {mode !== "menu" ? (
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
                style={{
                  background: "transparent",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                }}
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--line)",
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
