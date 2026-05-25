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
  alertPreset: AlertPreset;
};

export type PinnedGame = {
  gameId: string;
  pinnedAt: number;
};

export type UserPrefs = {
  noSpoilers: boolean;
  /** Global notification tier — applies to every team the user follows.
   *  Per-follow presets on `Follow` remain in the schema for a future
   *  "override per team" power-user mode but are not consulted by the
   *  Stage C dispatcher; the global tier is the source of truth. */
  alertPreset: AlertPreset;
  /** Optional. Quiet hours suppress pushes between start/end (24h, "HH:MM"). */
  quietHours?: { start: string; end: string };
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
};

// ── Defaults ──────────────────────────────────────────────────────────
export const DEFAULT_PREFS: UserPrefs = {
  noSpoilers: false,
  alertPreset: "companion",
  remindBeforeMinutes: 30,
};

export const DEFAULT_ALERT_PRESET: AlertPreset = "companion";

// ── Copy contract for presets (HANDOFF.md §5) ─────────────────────────
// Three tiers, escalating in volume. The same global tier applies to
// every team/country/series the user follows — including across sports
// (NBA + WC). Copy is deliberately sport-neutral. The push body itself
// mints sport-specific titles in the dispatcher ("Tipoff" / "Kickoff"
// / "End of Q3" / "Halftime") based on the game's source league.
export const PRESETS: Record<
  AlertPreset,
  { label: string; detail: string }
> = {
  quiet: { label: "Quiet", detail: "Game start and final only" },
  companion: { label: "Companion", detail: "Start, end of each period, final" },
  all: { label: "All moments", detail: "Above + close finishes and comebacks" },
};
