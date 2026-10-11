"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows, useNoSpoilers } from "../providers";
import {
  composeBrief,
  type BriefNFLGame,
  type BriefPayload,
  type BriefWCGame,
} from "../../lib/brief/compose-brief";
import type { Game } from "../../nba/types";
import { nflBriefSlate, previewIncludesScores } from "./brief-preview-data";

// /brief/preview — renders the user's brief as it would arrive in
// their inbox, using their current localStorage follows + today's
// NBA, Summer Soccer and NFL feeds. No email is sent.
//
// Used for:
//   • Design / copy review by the operator.
//   • A "see what the brief looks like" preview on the subscribe page.
//   • A self-test path that doesn't need a Resend API key.
//
// Same composeBrief() logic and the same three feeds as the send-briefs
// cron, so what you see here is what the cron would send. One difference
// on purpose: the preview honors this device's No-Spoilers setting and
// leaves scores out when it is on (or a follow hides spoilers).

export function BriefPreviewClient() {
  const { follows, hydrated } = useFollows();
  const noSpoilers = useNoSpoilers();
  const [games, setGames] = useState<Game[]>([]);
  const [wcGames, setWcGames] = useState<BriefWCGame[]>([]);
  const [nflGames, setNflGames] = useState<BriefNFLGame[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fetch NBA, Summer Soccer and NFL in parallel, the cron's three
      // feeds. Any feed failing just drops that sport's rows; the preview
      // still renders. (NFL was missing until 2026-10-11, so an NFL
      // follower saw an empty Today during their own game.)
      try {
        const [nbaRes, wcRes, nflRes] = await Promise.all([
          fetch("/api/live-scores", { cache: "no-store" }).catch(() => null),
          fetch("/api/world-cup", { cache: "no-store" }).catch(() => null),
          fetch("/api/nfl-scores", { cache: "no-store" }).catch(() => null),
        ]);
        if (nbaRes?.ok) {
          const json = (await nbaRes.json()) as {
            games?: Game[];
            seriesGames?: Game[];
          };
          if (!cancelled) setGames(json.seriesGames ?? json.games ?? []);
        }
        if (wcRes?.ok) {
          const json = (await wcRes.json()) as { games?: BriefWCGame[] };
          if (!cancelled) setWcGames(json.games ?? []);
        }
        if (nflRes?.ok) {
          const slate = nflBriefSlate(await nflRes.json());
          if (!cancelled) setNflGames(slate);
        }
      } catch {
        // Swallow — loaded still flips so the UI leaves its shell.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const includeScores = previewIncludesScores(noSpoilers, follows);

  const payload = useMemo<BriefPayload | null>(() => {
    if (!hydrated || !loaded) return null;
    return composeBrief({
      subscriber: {
        email: "preview@nonoisescores.app",
        follows,
        includeScores,
        unsubscribeToken: "preview",
        // 0 sentinel — preview composer doesn't read createdAt, and
        // strict React lint flags Date.now() inside useMemo as impure.
        createdAt: 0,
      },
      nba: games,
      wc: wcGames,
      nfl: nflGames,
    });
  }, [hydrated, loaded, follows, includeScores, games, wcGames, nflGames]);

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Eyebrow color="var(--nba)">No Noise · Your Brief</Eyebrow>
      <Display as="h1" size="lg" className="mt-1">
        {payload?.dateLabel ?? "Loading…"}
      </Display>
      <p
        className="mt-2 text-[0.75rem] leading-snug"
        style={{ color: "var(--mute-2)", fontWeight: 500 }}
      >
        Preview only. This is what your morning brief looks like, built
        from today&apos;s games and your current follows.
      </p>
      {payload && !includeScores ? (
        <p
          className="mt-1 text-[0.75rem] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          Scores stay hidden while No-Spoilers is on.
        </p>
      ) : null}

      {!payload ? (
        <div
          className="mt-6 h-[140px] rounded-[14px]"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
          }}
          aria-busy
          aria-live="polite"
        />
      ) : (
        <>
          {payload.editorialLede ? (
            <Section eyebrow="The Moment" emptyLabel="">
              <p
                className="text-[1.125rem] leading-tight"
                style={{ color: "var(--ink)", fontWeight: 800, letterSpacing: "-0.3px" }}
              >
                {payload.editorialLede.headline}
              </p>
              <p
                className="mt-2 text-[0.875rem] leading-snug"
                style={{ color: "var(--ink-2)", fontWeight: 500 }}
              >
                {payload.editorialLede.body}
              </p>
              {payload.editorialLede.context.map((line, i) => (
                <p
                  key={i}
                  className="mt-1.5 text-[0.8125rem] italic leading-snug"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  {line}
                </p>
              ))}
            </Section>
          ) : null}

          <Section eyebrow="Yesterday" emptyLabel="Nothing from your follows wrapped yesterday.">
            {payload.yesterday.map((row) => (
              <GameRow key={row.href} {...row} />
            ))}
          </Section>

          <Section eyebrow="Today" emptyLabel="No games from your follows on the schedule today.">
            {payload.today.map((row) => (
              <GameRow key={row.href} {...row} />
            ))}
          </Section>

          {payload.worthKnowing.length > 0 ? (
            <div className="mt-6">
              <Eyebrow>Worth knowing</Eyebrow>
              <ul className="mt-2 space-y-1.5">
                {payload.worthKnowing.map((w, i) => (
                  <li
                    key={i}
                    className="text-[0.875rem] leading-snug"
                    style={{ color: "var(--ink)", fontWeight: 500 }}
                  >
                    · {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {payload.alerts.tiers.length > 0 ? (
            <div className="mt-6">
              <Eyebrow>Your alerts</Eyebrow>
              <ul className="mt-2 space-y-1">
                {payload.alerts.tiers.map((t, i) => (
                  <li
                    key={i}
                    className="text-[0.8125rem]"
                    style={{ color: "var(--ink)", fontWeight: 500 }}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            className="mt-8 rounded-[14px] border-dashed border px-4 py-3"
            style={{
              borderColor: "var(--mute-2)",
              color: "var(--mute-1)",
            }}
          >
            <Eyebrow>Footer (in actual email)</Eyebrow>
            <p
              className="mt-1 text-[0.6875rem]"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Sent because you subscribed. One-click unsubscribe.
              nonoisescores.app
            </p>
          </div>

          <Link
            href="/brief/subscribe"
            className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-4 py-2 text-[0.8125rem] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            Subscribe to the brief
          </Link>
        </>
      )}
    </main>
  );
}

function Section({
  eyebrow,
  emptyLabel,
  children,
}: {
  eyebrow: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  if (isEmpty) {
    return (
      <div className="mt-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <p
          className="mt-2 text-[0.8125rem]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {emptyLabel}
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 overflow-hidden rounded-[14px] border" style={{ background: "var(--paper)", borderColor: "var(--line)" }}>
      <div className="px-3 pt-3">
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <div>{children}</div>
    </div>
  );
}

function GameRow({
  matchup,
  scoreLine,
  context,
  recapBlurbs,
  href,
}: {
  matchup: string;
  scoreLine: string | null;
  context: string;
  recapBlurbs?: string[];
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block border-t px-3 py-3 transition active:scale-[0.99]"
      style={{ borderColor: "var(--line)" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-[0.875rem]"
          style={{
            color: "var(--ink)",
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          {matchup}
        </span>
        {scoreLine ? (
          <span
            className="tabular-nums text-[0.875rem]"
            style={{
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {scoreLine}
          </span>
        ) : null}
      </div>
      <p
        className="mt-1 text-[0.75rem]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {context}
      </p>
      {recapBlurbs && recapBlurbs.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {recapBlurbs.map((b, i) => (
            <li
              key={i}
              className="text-[0.8125rem] leading-snug"
              style={{ color: "var(--ink)", fontWeight: 500 }}
            >
              · {b}
            </li>
          ))}
        </ul>
      ) : null}
    </Link>
  );
}
