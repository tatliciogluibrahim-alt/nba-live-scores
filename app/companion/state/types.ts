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
};

// ── Defaults ──────────────────────────────────────────────────────────
export const DEFAULT_PREFS: UserPrefs = {
  noSpoilers: false,
  remindBeforeMinutes: 30,
};

export const DEFAULT_ALERT_PRESET: AlertPreset = "companion";

// ── Copy contract for presets (HANDOFF.md §5) ─────────────────────────
// Three tiers, escalating in volume. Match the user-facing mental model:
// quiet     → bookends only (tipoff + final)
// companion → bookends + end-of-quarter pulses
// all       → companion + late-game drama (Q4 close games + comebacks)
//
// The trigger logic that turns these into actual pushes lives server-side
// (Stage C — game-state watcher + cron). Until that ships, the preset
// purely controls what the user *believes* they'll receive.
export const PRESETS: Record<
  AlertPreset,
  { label: string; detail: string }
> = {
  quiet: { label: "Quiet", detail: "Tipoff and final only" },
  companion: { label: "Companion", detail: "Tipoff, end of each quarter, final" },
  all: { label: "All moments", detail: "Above + Q4 close games and comebacks" },
};
