"use client";

import { useEffect, useMemo, useState } from "react";
import { useFollows } from "../../providers";
import { teamDisplayName } from "../data/teams";
import { PickerScreen, type PickerOption } from "./PickerScreen";

// Pulls candidate series from the existing live-scores API. A "series" is
// keyed by sorted team-abbr pair (e.g. "NYK-PHI"). We surface anything that
// has either an active or upcoming game with playoff series context.

type ApiGame = {
  id: string;
  away: { abbreviation: string; name: string };
  home: { abbreviation: string; name: string };
  status: "live" | "upcoming" | "final";
  gameContext: string;
  seriesSummary: string;
  seriesConference: string;
  seriesRound: string;
};

function buildSeriesKey(a: string, b: string): string {
  return [a, b].sort().join("-");
}

function isSeriesCandidate(g: ApiGame): boolean {
  if (!g.away.abbreviation || !g.home.abbreviation) return false;
  if (g.away.abbreviation === "TBD" || g.home.abbreviation === "TBD") return false;
  return Boolean(
    g.seriesRound ||
      g.seriesConference ||
      g.seriesSummary ||
      /playoff|series|first round|second round|conf|nba finals|game\s*[1-7]/i.test(
        g.gameContext
      )
  );
}

export function SeriesPicker() {
  const { isFollowing, addFollow, removeFollow } = useFollows();
  const [games, setGames] = useState<ApiGame[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/live-scores", { cache: "no-store" });
        if (!res.ok) {
          if (mounted) setLoaded(true);
          return;
        }
        const json = (await res.json()) as { games?: ApiGame[] };
        if (!mounted) return;
        setGames(json.games ?? []);
        setLoaded(true);
      } catch {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo<PickerOption[]>(() => {
    const seen = new Map<string, ApiGame>();
    for (const g of games) {
      if (!isSeriesCandidate(g)) continue;
      const key = buildSeriesKey(g.away.abbreviation, g.home.abbreviation);
      if (!seen.has(key)) seen.set(key, g);
    }
    return Array.from(seen.entries()).map<PickerOption>(([key, g]) => {
      const [a, b] = key.split("-");
      const round =
        g.seriesRound ||
        (/conf/i.test(g.gameContext) ? "Conference Finals" : "Playoff Series");
      return {
        id: key,
        primary: `${teamDisplayName(a)} vs ${teamDisplayName(b)}`,
        secondary: g.seriesConference
          ? `${round} · ${g.seriesConference}`
          : round,
        mark: `${a}·${b}`,
        searchKeys: [a, b, round, g.seriesConference],
      };
    });
  }, [games]);

  return (
    <PickerScreen
      title="Follow a series."
      subtitle="Clinch nights, Game 7s, and the calm in between."
      options={options}
      isFollowing={(id) => isFollowing("series", id)}
      onSelect={(opt) => {
        if (isFollowing("series", opt.id)) {
          removeFollow("series", opt.id);
        } else {
          addFollow("series", opt.id);
        }
      }}
      searchPlaceholder="Search by team or round"
      emptyMessage={
        loaded
          ? "No playoff series available right now. Try a team or tournament instead."
          : "Loading series…"
      }
    />
  );
}
