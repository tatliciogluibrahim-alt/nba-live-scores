// State shapes for the No Noise Scores companion model.
// Source of truth: root HANDOFF.md §7. Keep these isolated so the
// persistence layer can later be moved to server-stored prefs.

export type FollowKind = "team" | "country" | "series" | "tournament";

export type AlertPreset = "quiet" | "companion" | "all";

export type Follow = {
  kind: FollowKind;
  /** Stable identifier: team abbr ("NYK"), country code ("BIH"),
   *  series key ("NYK-PHI"), or tournament slug ("nba-playoffs-2025"). */
  id: string;
  /** Whether this follow contributes pushes. Capped per plan
   *  (MAX_FREE_ALERT_SLOTS). Visible-only follows still surface on
   *  Today + Following — only the push fanout is gated. */
  alertEnabled: boolean;
  /** Tier when alertEnabled === true. Ignored otherwise. */
  alertTier: AlertPreset;
  /** Per-follow No-Spoilers (the premium "selective" pitch). When true,
   *  any game this follow is part of is hidden behind the reveal gate,
   *  even when the global No-Spoilers toggle is off. The global toggle
   *  (free) hides everything; this hides only what you choose. */
  hideSpoilers?: boolean;
  /** Stable creation timestamp. Used to deterministically pick which
   *  follows get the alert slots after a migration (oldest-first). */
  followedAt: number;
  /** @deprecated Pre-v2 field. Storage normalizer migrates this into
   *  alertTier and removes it. */
  alertPreset?: AlertPreset;
};

export type PinnedGame = {
  gameId: string;
  pinnedAt: number;
};

export type UserPrefs = {
  noSpoilers: boolean;
  /** Whether kickoff pushes for followed games offer to add the live
   *  score to the lock screen (iOS only). Default on. */
  lockScreenOffers?: boolean;
  /** Default tier applied to newly-created follows. Replaces the old
   *  pre-v2 global `alertPreset` which used to apply to ALL follows.
   *  Now: each Follow owns its own alertTier and alertEnabled. */
  defaultAlertTier: AlertPreset;
  /** @deprecated Pre-v2 field. Migrator copies this into
   *  `defaultAlertTier` and removes it. */
  alertPreset?: AlertPreset;
  /** Optional. Quiet hours suppress pushes between start/end (24h, "HH:MM"). */
  quietHours?: { start: string; end: string };
  /** Internal allowance model. There is no paid flow yet; this simply
   *  makes the notification-slot cap explicit and migration-friendly. */
  plan: "free";
  /** Default 30. */
  remindBeforeMinutes: number;
  /** YYYY-MM-DD of the last day the user dismissed the Quiet Recap card.
   *  Added in Stage 15F so the once-per-night recap doesn't render on
   *  repeat opens. Stored as a date string (not timestamp) to keep the
   *  comparison day-local without timezone math at read time. */
  quietRecapSeenDate?: string;
  /** True once the user has either enabled notifications or dismissed
   *  the Today card asking them to. Persisting this is what prevents
   *  the card from re-rendering every session for users who have
   *  decided "not now" — we never re-prompt automatically. */
  notifPromptDismissed?: boolean;
  /** True when the user has dismissed the first-run onboarding strip
   *  on Today. The strip also auto-retires when all three onboarding
   *  steps are complete (follow + pin + notify), so most users will
   *  never need to explicitly dismiss. */
  firstRunDismissed?: boolean;
  /** True when the user has dismissed the "Install for game alerts"
   *  card on Today (Phase 9 friend-beta gate). Persisting this is what
   *  keeps the card from re-rendering on every session — we never
   *  re-prompt for install automatically. */
  installPromptDismissed?: boolean;
  /** True when the user has dismissed the push-permission recovery
   *  card on Today (Phase 21C). Distinct from `notifPromptDismissed`
   *  because that one gates the *initial* enable card (permission is
   *  "default"); this one gates the *recovery* card shown when
   *  permission is "denied" and the user has follows worth recovering.
   *  One dismissal is permanent. */
  pushRecoveryDismissed?: boolean;
  /** True once the user has finished (or skipped) the first-run
   *  onboarding flow shown to truly-fresh installs. Gates both the
   *  onboarding overlay and the deferral of the boot-time push prompt
   *  (so onboarding owns the notification ask). One-way; never re-shown. */
  onboardingComplete?: boolean;
  /** True once the user has interacted with the FirstFollowTierCard
   *  (or completed onboarding, which already covers alerts in step 3).
   *  Gates the one-time inline card that appears after the very first
   *  follow to explain the three alert tiers. One-way; never re-shown. */
  firstFollowEducated?: boolean;
};

// ── Defaults ──────────────────────────────────────────────────────────
export const DEFAULT_PREFS: UserPrefs = {
  noSpoilers: false,
  lockScreenOffers: true,
  defaultAlertTier: "companion",
  plan: "free",
  remindBeforeMinutes: 30,
};

export const DEFAULT_ALERT_PRESET: AlertPreset = "companion";

/** Max simultaneously alert-enabled follows on free plan. Visible
 *  follows are unlimited; this only caps push fanout. Set to 3 because
 *  "two" felt too tight and "unlimited" doesn't control cost. */
export const MAX_FREE_ALERT_SLOTS = 3;

// ── Copy contract for presets (HANDOFF.md §5) ─────────────────────────
// Three tiers, escalating in volume. Each follow owns its own alert level.
// prefs.defaultAlertTier only seeds newly-added follows. Copy is deliberately
// sport-neutral. The push body itself mints sport-specific titles in the
// dispatcher ("Tipoff" / "Kickoff" / "End of Q3" / "Halftime") based on
// the game's source league.
//
// Rename history:
//   2026-05-26: "Companion" → "Standard", "All moments" → "Close games."
//   2026-05-27: Reverted "Standard" → "Companion." "Standard" read like
//     a SaaS pricing tier; "Companion" ties directly to the locked
//     positioning ("calm sports companion for the moments that matter")
//     and is the stronger brand-tied word in the whole app. The
//     "All moments" → "Close games" rename stays — that was the more
//     important semantic correction (the old label misled users into
//     thinking the tier produced more than it did).
//
// Internal keys (quiet / companion / all) unchanged across both renames
// so stored follows keep their tier without migration.
export const PRESETS: Record<
  AlertPreset,
  { label: string; detail: string }
> = {
  quiet: { label: "Quiet", detail: "Start and final only." },
  companion: { label: "Companion", detail: "Start, quarter breaks, scores, final." },
  all: { label: "Full Details", detail: "Everything: scores, close finishes, comebacks." },
};
