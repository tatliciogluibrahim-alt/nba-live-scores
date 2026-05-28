"use client";

import Link from "next/link";
import { useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { PRESETS, type AlertPreset, type Follow } from "../state/types";
import { useFollows } from "../providers";
import { PresetRow } from "./PresetRow";

// Single follow row on the Following dashboard. Body navigates to the
// object's detail page (where one exists); the bell on the right is a
// dedicated control that opens the alert/unfollow panel. Team and
// tournament don't have detail pages yet — those rows leave the body
// non-interactive so taps don't dead-end on a broken URL.

// Feather-style bell glyphs, matching the app's 2px stroke icon system
// (TabBar, sidebar). On = open bell; off = struck bell. State is
// expressed by the button's color (ink vs mute), not a fill swap.
function BellOn() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BellOff() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0 0 18 8" />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 0 0-9.33-5" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export type FollowCardData = {
  follow: Follow;
  kindLabel: string;          // "Team" | "Country" | "Series" | "Tournament"
  identityMark: string;       // "NYK" | "🇧🇦" | "NYK · CLE" | "NBA"
  name: string;               // "New York Knicks", "Bosnia & Herzegovina", etc.
  detail?: string;            // optional second line ("Plays tonight · 8:00 PM")
  accent?: string;            // optional accent for the identity chip
  /** True when this follow's underlying entity is no longer active —
   *  currently only fires for series follows whose matchup has wrapped
   *  ("NYK wins series 4-0"). The card renders a calm "Wrapped" chip
   *  next to the kind label so the user knows alerts won't fire here
   *  going forward without taking the follow away. */
  wrapped?: boolean;
};

// Detail route resolver. All four kinds now route to real detail
// pages. The Phase 1 fallback (static non-interactive bodies for
// team / tournament) is fully replaced as of this session.
function detailHrefFor(follow: Follow): string | null {
  switch (follow.kind) {
    case "country":
      return `/country/${follow.id}`;
    case "series":
      return `/series/${follow.id}`;
    case "tournament":
      return `/tournament/${follow.id}`;
    case "team":
      return `/team/${follow.id}`;
  }
}

export function FollowCard({ data }: { data: FollowCardData }) {
  const {
    alertSlotCount,
    alertSlotCap,
    setFollowAlertEnabled,
    setFollowAlertTier,
    setFollowHideSpoilers,
    removeFollow,
  } = useFollows();
  const [expanded, setExpanded] = useState(false);

  const { follow, kindLabel, identityMark, name, detail, accent, wrapped } =
    data;
  const presetMeta = PRESETS[follow.alertTier];
  const slotsFull = alertSlotCount >= alertSlotCap;
  const canEnable = follow.alertEnabled || !slotsFull;
  const detailHref = detailHrefFor(follow);

  function handlePreset(next: AlertPreset) {
    setFollowAlertTier(follow.kind, follow.id, next);
  }

  function handleAlertToggle() {
    setFollowAlertEnabled(follow.kind, follow.id, !follow.alertEnabled);
  }

  function handleRemove() {
    removeFollow(follow.kind, follow.id);
  }

  function handleHideSpoilersToggle() {
    setFollowHideSpoilers(follow.kind, follow.id, !follow.hideSpoilers);
  }

  // Per-follow No-Spoilers only makes sense for the kinds we can match to
  // a game's participants (team / country / series). Tournament follows
  // are too broad — that's what the global toggle is for.
  const canSelectiveHide = follow.kind !== "tournament";

  const identityChip = (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px]"
      style={{
        background:
          follow.kind === "team" || follow.kind === "series"
            ? "var(--nba-soft)"
            : follow.kind === "country"
              ? "var(--wc-soft)"
              : "var(--cream-2)",
        color: accent ?? "var(--ink)",
        fontFamily: "var(--font-mono)",
        fontSize: identityMark.length > 4 ? 11 : 14,
        fontWeight: 700,
        letterSpacing: "0.02em",
      }}
    >
      {identityMark}
    </span>
  );

  const identityText = (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <Eyebrow className="min-w-0 truncate">{kindLabel}</Eyebrow>
        {wrapped ? (
          // Calm "Wrapped" chip next to the kind label. Reads as a
          // status pip rather than a CTA — the user can keep the
          // follow for posterity or unfollow it explicitly.
          <span
            aria-label="Series wrapped"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--mute-1)",
              background: "var(--cream-2)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "1px 6px",
              lineHeight: 1.4,
            }}
          >
            Wrapped
          </span>
        ) : null}
      </div>
      <p
        className="mt-1 truncate text-[14px] leading-snug"
        style={{
          // Wrapped series lose a touch of weight + color so the card
          // visually steps back from active follows without disappearing.
          color: wrapped ? "var(--mute-1)" : "var(--ink)",
          fontWeight: 700,
          letterSpacing: "-0.005em",
        }}
      >
        {name}
      </p>
      {detail ? (
        <p
          className="mt-0.5 truncate text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );

  return (
    <article
      className="rounded-[14px] border"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex w-full items-center gap-3 px-3 py-3">
        {detailHref ? (
          <Link
            href={detailHref}
            aria-label={`Open ${name} detail`}
            className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:scale-[0.995]"
          >
            {identityChip}
            {identityText}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
            {identityChip}
            {identityText}
          </div>
        )}

        {/* Alert control — a bell icon, not a text pill. A full tier
            label on every row ("ALERTS · COMPANION") was loud and ate
            half the card. The bell is the universal alerts glyph: solid
            ink when on, a muted struck bell when off. The actual tier
            lives in the drawer this opens (and in the aria-label), so
            the card stays calm and the title/Wrapped chip get the room
            back. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`follow-${follow.kind}-${follow.id}-body`}
          aria-label={
            follow.alertEnabled
              ? `Alerts: ${presetMeta.label}. Tap to change.`
              : "Alerts off. Tap to turn on."
          }
          title={follow.alertEnabled ? presetMeta.label : "Alerts off"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-[0.92]"
          style={{ color: follow.alertEnabled ? "var(--ink)" : "var(--mute-2)" }}
        >
          {follow.alertEnabled ? <BellOn /> : <BellOff />}
        </button>
      </div>

      {expanded ? (
        <div
          id={`follow-${follow.kind}-${follow.id}-body`}
          className="border-t px-3 py-3"
          style={{ borderColor: "var(--line)" }}
        >
          <Eyebrow>Alerts</Eyebrow>
          <button
            type="button"
            onClick={handleAlertToggle}
            disabled={!canEnable}
            aria-label={`${follow.alertEnabled ? "Disable" : "Enable"} alerts for ${name}`}
            // Disabled state used to rely on opacity alone, which read
            // as just "slightly faded" rather than "you can't do this
            // right now." The dashed border makes the affordance
            // visibly different from an enabled button — same pattern
            // the dashed Watch+Alerts shortcut uses on Following.
            className="mt-2 inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[12px] border px-3 py-2 text-left transition active:scale-[0.99]"
            style={{
              background: follow.alertEnabled ? "var(--cream-2)" : "transparent",
              borderColor: follow.alertEnabled ? "var(--ink)" : "var(--line)",
              borderStyle: canEnable ? "solid" : "dashed",
              opacity: canEnable ? 1 : 0.6,
              cursor: canEnable ? "pointer" : "not-allowed",
            }}
          >
            <span
              className="text-[13px]"
              style={{ color: "var(--ink)", fontWeight: 700 }}
            >
              {follow.alertEnabled ? "Getting alerts" : "Alerts off"}
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--mute-1)", fontWeight: 600 }}
            >
              {follow.alertEnabled ? "Tap to disable" : canEnable ? "Tap to enable" : "Full"}
            </span>
          </button>
          {!canEnable ? (
            <p
              className="mt-2 text-[12px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
              Alert slots are full ({alertSlotCount} of {alertSlotCap} on
              the free plan). Turn one off to enable this. Unlimited
              alerts land in a paid tier later.
            </p>
          ) : null}
          <div className="mt-2">
            {follow.alertEnabled ? (
              <PresetRow
                value={follow.alertTier}
                onChange={handlePreset}
                subjectLabel={name}
              />
            ) : null}
          </div>

          {/* Per-follow No-Spoilers (the premium "selective" control).
              The global toggle in Settings hides everything; this hides
              only this follow's games, even with the global toggle off.
              Tap-to-reveal still applies on each game. */}
          {canSelectiveHide ? (
            <div className="mt-3">
              <Eyebrow>No-Spoilers</Eyebrow>
              <button
                type="button"
                onClick={handleHideSpoilersToggle}
                aria-label={`${follow.hideSpoilers ? "Stop hiding" : "Hide"} spoilers for ${name}`}
                className="mt-2 inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[12px] border px-3 py-2 text-left transition active:scale-[0.99]"
                style={{
                  background: follow.hideSpoilers ? "var(--cream-2)" : "transparent",
                  borderColor: follow.hideSpoilers ? "var(--ink)" : "var(--line)",
                }}
              >
                <span
                  className="text-[13px]"
                  style={{ color: "var(--ink)", fontWeight: 700 }}
                >
                  {follow.hideSpoilers ? "Hiding spoilers" : "Spoilers shown"}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--mute-1)", fontWeight: 600 }}
                >
                  {follow.hideSpoilers ? "Tap to show" : "Tap to hide"}
                </span>
              </button>
              <p
                className="mt-2 text-[12px] leading-snug"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                {follow.hideSpoilers
                  ? `Scores and results for ${name} stay hidden until you reveal them.`
                  : `Hide scores and results for ${name} until you tap to reveal.`}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Unfollow ${name}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Unfollow
          </button>
        </div>
      ) : null}
    </article>
  );
}
