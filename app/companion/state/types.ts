// State shapes for the No Noise Scores companion model.
// Source of truth: root HANDOFF.md §7. Keep these isolated so the
// persistence layer can later be moved to server-stored prefs.

export type FollowKind = "team" | "country" | "series" | "tournament";

export type AlertPreset = "quiet" | "companion" | "all";

/** The canonical follow record (Path B flip, 2026-07-19). Canonical
 *  identity is momentId + scope + scopeId (see FollowV2 below); `kind` and
 *  `id` are DERIVED legacy views kept on the runtime object so the ~180
 *  presentational readers stay correct through the flip. They are safe
 *  because the derivation is injective and no NFL follow can exist until
 *  the gate-3 picker ships — sport-DECIDING code must use momentId/scope
 *  (dispatcher, sync, competitions, spoiler matching already do).
 *  Construct only via toFollow()/legacyRefToFollow() in follow-migration. */
export type Follow = FollowV2 & {
  /** @deprecated Derived presentational view — never sport-deciding.
   *  scope team→"team", country→"country", series→"series", all→"tournament". */
  kind: FollowKind;
  /** @deprecated Derived presentational view: scopeId ?? momentId. */
  id: string;
};

// ── Path B (gate 1, 2026-07-19): moment + scope follow schema ─────────
// docs/follow-moments-design.md, reconciled in the Phase 22 spec. The v2
// shape replaces the flat kind/id Follow once the flip lands (PB3–PB6);
// until then it exists alongside it so the directory + migration are
// built and tested additively.

/** Feed-vocabulary sports — matches every feed/source union in the app
 *  ("nba" | "wc" | "nfl"), NOT the design doc's invented "soccer". */
export type Sport = "nba" | "wc" | "nfl";

/** Scope kinds inside a moment. group/round/stage are schema-ready for
 *  future products (group follows, round follows) — no picker offers
 *  them yet and no migration can produce them. */
export type ScopeKind =
  | "all"
  | "team"
  | "country"
  | "series"
  | "group"
  | "round"
  | "stage";

/** The v2 follow record: WHERE (moment) + WHAT (scope + entity).
 *  Becomes `Follow` at the PB3 flip. */
export type FollowV2 = {
  /** The moment this follow belongs to ("nfl-season-2026"). */
  momentId: string;
  scope: ScopeKind;
  /** Entity inside the scope ("NYK" / "USA" / "OKC-SA"). Null for "all". */
  scopeId: string | null;
  alertEnabled: boolean;
  alertTier: AlertPreset;
  /** Selective No-Spoilers — shipped 2026-05-28, AFTER the Path B design
   *  doc was written. Must survive migration (Phase 22 spec reconciliation). */
  hideSpoilers?: boolean;
  followedAt: number;
};

/** The pre-Path-B flat shape, kept as a standalone structural type (NOT an
 *  alias of Follow) so the PB3 flip of `Follow` cannot ripple into the
 *  migration code's input type. Mirrors the v1 stored records exactly. */
export type LegacyFollow = {
  kind: FollowKind;
  id: string;
  alertEnabled: boolean;
  alertTier: AlertPreset;
  hideSpoilers?: boolean;
  followedAt: number;
  /** @deprecated pre-v2 tier field some very old records still carry. */
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
  // Tiers are significance thresholds (2026-07-14 engine), not fixed event
  // lists. The copy describes what each tier actually delivers now: Quiet is
  // the start, the final, and genuine classics; Companion adds the beats;
  // Full Details is every moment.
  quiet: { label: "Quiet", detail: "Start, final, and the big moments." },
  companion: { label: "Companion", detail: "The beats that matter for your team." },
  all: { label: "Full Details", detail: "Every moment, every game." },
};
