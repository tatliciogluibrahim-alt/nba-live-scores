"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { PresetRow } from "../following/PresetRow";
import { resolveFollowIdentity } from "../follow/identity";
import { useFollows } from "../providers";
import type { AlertPreset, Follow } from "../state/types";

// One row per follow with the canonical PresetRow inline. Identity
// (kind eyebrow + name + chip) renders above the radio so the user
// can see what they're configuring at a glance.

export function PerFollowAlerts() {
  const { follows, setFollowPreset, hydrated } = useFollows();

  if (!hydrated) {
    return (
      <section aria-busy aria-live="polite">
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Per-follow alerts</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <div
          className="h-[140px] rounded-[14px]"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />
        <span className="sr-only">Loading follows</span>
      </section>
    );
  }

  if (follows.length === 0) {
    return (
      <section>
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Per-follow alerts</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <Link
          href="/following"
          className="block rounded-[14px] border px-4 py-3 transition active:scale-[0.99]"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
          aria-label="Set up Following"
        >
          <p
            className="text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 700 }}
          >
            No follows yet.
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Pick a team, country, series, or tournament — alert presets land here.
          </p>
        </Link>
      </section>
    );
  }

  function handlePreset(follow: Follow, next: AlertPreset) {
    setFollowPreset(follow.kind, follow.id, next);
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Per-follow alerts</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <ul className="space-y-3">
        {follows.map((follow) => {
          const identity = resolveFollowIdentity(follow);
          return (
            <li
              key={`${follow.kind}-${follow.id}`}
              className="rounded-[14px] border"
              style={{ background: "var(--paper)", borderColor: "var(--line)" }}
            >
              <div className="flex items-center gap-3 border-b px-3 py-3"
                style={{ borderColor: "var(--line)" }}
              >
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px]"
                  style={{
                    background: "var(--cream-2)",
                    color: identity.accent,
                    fontFamily: "var(--font-mono)",
                    fontSize: identity.chip.length > 4 ? 11 : 14,
                    fontWeight: 700,
                  }}
                >
                  {identity.chip}
                </span>
                <div className="min-w-0 flex-1">
                  <Eyebrow>{identity.kindLabel}</Eyebrow>
                  <p
                    className="mt-1 truncate text-[14px] leading-snug"
                    style={{
                      color: "var(--ink)",
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {identity.name}
                  </p>
                </div>
              </div>
              <div className="px-3 py-3">
                <PresetRow
                  value={follow.alertPreset}
                  onChange={(next) => handlePreset(follow, next)}
                  subjectLabel={identity.name}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
