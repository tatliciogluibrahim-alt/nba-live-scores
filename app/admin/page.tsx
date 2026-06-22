// Internal read-only admin stats. Mounted at /admin.
//
// Gated by ADMIN_TOKEN. The page accepts the token as either:
//   • a Bearer header: `Authorization: Bearer <ADMIN_TOKEN>`
//   • a query param:   `/admin?token=<ADMIN_TOKEN>`
//
// Without a valid token the page renders an "Unauthorized" view with
// no data. Note: because this is a React Server Component (not a route
// handler), the underlying HTTP response is technically 200 — the
// access gate is enforced by rendering Unauthorized content instead of
// the stats. A true 401 status would require either Next.js
// middleware on /admin or converting this to a route handler; both
// are bigger changes than the audit asked for.
//
// Data sources are existing KV helpers; no schema changes, no new
// stores. Endpoints (web push / iOS tokens / Brief subscribers / Beta
// signups) are intentionally counted separately. Each store uses its
// own opaque identifier and the same person can appear in more than
// one, so we never combine them into a "users" total.

import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import type { CSSProperties, ReactNode } from "react";
import {
  listSubscriptions,
  subscriptionCount,
} from "../lib/push/subscription-store";
import { listIosTokens } from "../lib/push/ios-token-store";
import { subscriberCount } from "../lib/brief/subscriber-store";
import { betaSubscriberCount } from "../lib/beta/subscriber-store";
import { readFunnel } from "../lib/push/funnel-metrics";

// Constant-time compare to defeat timing oracles. Mirrors the same
// pattern used in /api/admin/push/status. Returns false if either
// side is missing or lengths differ.
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isAuthorized(
  authHeader: string | null,
  queryToken: string | null
): boolean {
  const expected = process.env.ADMIN_TOKEN;
  // If no ADMIN_TOKEN is configured in the environment, the page is
  // unreachable. Fail closed.
  if (!expected) return false;

  let provided: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    provided = authHeader.slice("Bearer ".length).trim();
  } else if (queryToken) {
    provided = queryToken;
  }
  if (!provided) return false;

  return tokenMatches(provided, expected);
}

// Always read live from KV. No ISR, no caching.
export const dynamic = "force-dynamic";

// Keep the page out of search and discovery. It's internal.
export const metadata = {
  title: "Admin · No Noise Scores",
  robots: { index: false, follow: false },
};

type Sport = "NBA" | "Summer Soccer" | "Tournament";

type AlertLike = { kind: string; id: string; tier?: string };

// Map a follow to its sport bucket. Today's product only has NBA team
// follows + WC country follows + NBA / WC tournament follows + NBA
// series follows, so the buckets are simple. When NFL ships in Aug
// 2026 this will need an "NFL" bucket and the tournament prefix
// matcher will need an "nfl-" branch.
function sportFor(alert: AlertLike): Sport {
  if (alert.kind === "team") return "NBA"; // only NBA has team follows today
  if (alert.kind === "country") return "Summer Soccer";
  if (alert.kind === "series") return "NBA"; // playoff series
  if (alert.kind === "tournament") {
    const id = alert.id.toLowerCase();
    if (id.startsWith("nba")) return "NBA";
    if (id.includes("fifa") || id.includes("world-cup")) return "Summer Soccer";
    return "Tournament";
  }
  return "Tournament";
}

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

export default async function AdminPage({
  searchParams,
}: {
  // Next.js 16 App Router: searchParams is a Promise that must be awaited.
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  // ── Auth gate ────────────────────────────────────────────────────
  // Read the Bearer header and the ?token= query param; either path
  // unlocks the page. Without a valid token we render an Unauthorized
  // view and return early — none of the KV calls below run.
  const [hdrs, params] = await Promise.all([headers(), searchParams]);
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const authed = isAuthorized(
    hdrs.get("authorization"),
    rawToken ?? null
  );
  if (!authed) {
    return (
      <div style={pageWrapStyle}>
        <main style={mainStyle}>
          <h1 style={h1Style}>401 Unauthorized</h1>
          <p style={mutedStyle}>
            This page requires an admin token. Pass it as
            <code style={inlineCodeStyle}>?token=&lt;ADMIN_TOKEN&gt;</code>{" "}
            or as an{" "}
            <code style={inlineCodeStyle}>Authorization: Bearer</code>{" "}
            header.
          </p>
        </main>
      </div>
    );
  }

  // All reads run in parallel. Each one is independent.
  const [webCount, webSubs, iosTokens, briefCount, betaCount, funnel] =
    await Promise.all([
      subscriptionCount(),
      listSubscriptions(),
      listIosTokens(),
      subscriberCount(),
      betaSubscriberCount(),
      readFunnel(),
    ]);

  // Activation funnel: of the unique devices that saw the notification
  // prompt, how many granted. prompt_shown is deduped client-side.
  const grantRate =
    funnel.prompt_shown > 0
      ? Math.round((funnel.permission_granted / funnel.prompt_shown) * 100)
      : 0;

  // Delivery retention (a proxy — server-side activity is push DELIVERY,
  // not app opens). Computed on-read from the createdAt / lastSeenAt
  // already on every push row, so no new store or cron.
  const NOW = new Date().getTime();
  const DAY = 86_400_000;
  const lifeRows: Array<{ createdAt?: number; lastSeenAt?: number }> = [
    ...webSubs.map((s) => ({ createdAt: s.createdAt, lastSeenAt: s.lastSeenAt })),
    ...iosTokens.map((t) => ({ createdAt: t.createdAt, lastSeenAt: t.lastSeenAt })),
  ];
  const active7 = lifeRows.filter(
    (r) => r.lastSeenAt != null && NOW - r.lastSeenAt <= 7 * DAY
  ).length;
  const eligibleD1 = lifeRows.filter(
    (r) => r.createdAt != null && NOW - r.createdAt >= DAY
  );
  const retainedD1 = eligibleD1.filter(
    (r) => r.lastSeenAt != null && r.createdAt != null && r.lastSeenAt - r.createdAt >= DAY
  ).length;
  const eligibleD7 = lifeRows.filter(
    (r) => r.createdAt != null && NOW - r.createdAt >= 7 * DAY
  );
  const retainedD7 = eligibleD7.filter(
    (r) => r.lastSeenAt != null && r.createdAt != null && r.lastSeenAt - r.createdAt >= 7 * DAY
  ).length;
  const d1Rate = eligibleD1.length
    ? Math.round((retainedD1 / eligibleD1.length) * 100)
    : 0;
  const d7Rate = eligibleD7.length
    ? Math.round((retainedD7 / eligibleD7.length) * 100)
    : 0;

  // Both stores carry the same alerts[] + noSpoilers shape, so fold
  // them into one population for the cross-cutting stats below. Each
  // store is still reported on its own in the Endpoints section.
  const pushRows: Array<{ alerts: AlertLike[]; noSpoilers: boolean }> = [
    ...webSubs.map((s) => ({ alerts: s.alerts as AlertLike[], noSpoilers: s.noSpoilers })),
    ...iosTokens.map((t) => ({ alerts: t.alerts as AlertLike[], noSpoilers: t.noSpoilers })),
  ];
  const pushRowCount = pushRows.length;

  // Aggregations.
  const tierCounts: Record<"quiet" | "companion" | "all", number> = {
    quiet: 0,
    companion: 0,
    all: 0,
  };
  const sportTotals: Record<Sport, number> = {
    NBA: 0,
    "Summer Soccer": 0,
    Tournament: 0,
  };
  const followCounts = new Map<
    string,
    { kind: string; id: string; sport: Sport; count: number }
  >();
  let multiSportRows = 0;
  let noSpoilersOn = 0;

  for (const row of pushRows) {
    if (row.noSpoilers) noSpoilersOn++;

    const sportsThisRow = new Set<Sport>();
    for (const a of row.alerts) {
      const sport = sportFor(a);
      sportsThisRow.add(sport);
      sportTotals[sport]++;

      if (a.tier === "quiet" || a.tier === "companion" || a.tier === "all") {
        tierCounts[a.tier]++;
      }

      const key = `${a.kind}:${a.id}`;
      const existing = followCounts.get(key);
      if (existing) existing.count++;
      else followCounts.set(key, { kind: a.kind, id: a.id, sport, count: 1 });
    }
    if (sportsThisRow.size >= 2) multiSportRows++;
  }

  const noSpoilersOff = pushRowCount - noSpoilersOn;
  const totalAlerts = tierCounts.quiet + tierCounts.companion + tierCounts.all;
  const top10 = [...followCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Render. Inline styles only — no Tailwind, no global classes. The
  // page renders the same regardless of any app CSS leaking in.
  return (
    <div style={pageWrapStyle}>
      <main style={mainStyle}>
        <header style={headerStyle}>
          <h1 style={h1Style}>Admin</h1>
          <div style={mutedSmallStyle}>
            Read-only snapshot · {new Date().toUTCString()}
          </div>
        </header>

        <Section title="Endpoints">
          <div style={statGridStyle}>
            <Stat label="Web push" value={webCount} />
            <Stat label="iOS tokens" value={iosTokens.length} />
            <Stat label="Brief subscribers" value={briefCount} />
            <Stat label="Beta signups" value={betaCount} />
          </div>
          <p style={mutedStyle}>
            Counted separately. Each store keys on its own opaque
            identifier (push endpoint hash, APNs token, hashed email)
            and the same person can appear in more than one. Do not
            sum.
          </p>
        </Section>

        <Section title="Follows by sport (push-enabled)">
          <div style={statGridStyle}>
            <Stat label="NBA follows" value={sportTotals.NBA} />
            <Stat label="Summer Soccer follows" value={sportTotals["Summer Soccer"]} />
            <Stat label="Other tournament follows" value={sportTotals.Tournament} />
          </div>

          <h3 style={h3Style}>Top 10 followed</h3>
          {top10.length === 0 ? (
            <p style={mutedStyle}>No follows yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Id</th>
                  <th style={thStyle}>Kind</th>
                  <th style={thStyle}>Sport</th>
                  <th style={thNumStyle}>Followers</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((row, i) => (
                  <tr key={`${row.kind}:${row.id}`}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdMonoStyle}>{row.id}</td>
                    <td style={tdStyle}>{row.kind}</td>
                    <td style={tdStyle}>{row.sport}</td>
                    <td style={tdNumStyle}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={mutedStyle}>
            Counted across {pushRowCount.toLocaleString()} push-enabled
            rows (web + iOS). Follows from users who haven&rsquo;t
            enabled push are stored in localStorage only and don&rsquo;t
            reach KV, so they are not counted here.
          </p>
        </Section>

        <Section title="Activation funnel">
          <div style={statGridStyle}>
            <Stat label="Prompt shown" value={funnel.prompt_shown} sub="unique devices" />
            <Stat
              label="Granted"
              value={funnel.permission_granted}
              sub={`${grantRate}% of ${funnel.prompt_shown.toLocaleString()} shown`}
            />
            <Stat label="Denied" value={funnel.permission_denied} />
          </div>
          <p style={mutedStyle}>
            The notification permission ask. Prompt-shown is deduped to one
            per device, so granted divided by shown is a real grant rate.
            Web-push subscribe fires on every preference re-sync, so it
            isn&rsquo;t counted here. The Endpoints web-push total is the
            subscribed count.
          </p>
        </Section>

        <Section title="Delivery retention">
          <div style={statGridStyle}>
            <Stat
              label="Active · last 7d"
              value={active7}
              sub={`of ${lifeRows.length.toLocaleString()} push rows`}
            />
            <Stat
              label="D1 retained"
              value={retainedD1}
              sub={`${d1Rate}% of ${eligibleD1.length.toLocaleString()} eligible`}
            />
            <Stat
              label="D7 retained"
              value={retainedD7}
              sub={`${d7Rate}% of ${eligibleD7.length.toLocaleString()} eligible`}
            />
          </div>
          <p style={mutedStyle}>
            Server-side activity is push delivery, not app opens, so this
            measures whether a device is still being delivered to N days
            after it subscribed. A directional proxy for retention, not
            session retention. &ldquo;Eligible&rdquo; counts only rows old
            enough to have reached that day mark. Small samples are noisy.
          </p>
        </Section>

        <Section title="Alert tier distribution">
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tier</th>
                <th style={thNumStyle}>Count</th>
                <th style={thNumStyle}>Share</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Quiet</td>
                <td style={tdNumStyle}>{tierCounts.quiet.toLocaleString()}</td>
                <td style={tdNumStyle}>{pct(tierCounts.quiet, totalAlerts)}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Companion</td>
                <td style={tdNumStyle}>{tierCounts.companion.toLocaleString()}</td>
                <td style={tdNumStyle}>{pct(tierCounts.companion, totalAlerts)}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Full Details</td>
                <td style={tdNumStyle}>{tierCounts.all.toLocaleString()}</td>
                <td style={tdNumStyle}>{pct(tierCounts.all, totalAlerts)}</td>
              </tr>
              <tr>
                <td style={tdTotalStyle}>Total alerts</td>
                <td style={tdNumTotalStyle}>{totalAlerts.toLocaleString()}</td>
                <td style={tdNumTotalStyle}>&mdash;</td>
              </tr>
            </tbody>
          </table>
          <p style={mutedStyle}>
            Counted per follow, not per row. One row with three
            alert-enabled follows counts three times.
          </p>
        </Section>

        <Section title="No-Spoilers rate (global toggle)">
          <div style={statGridStyle}>
            <Stat
              label="On"
              value={noSpoilersOn}
              sub={pct(noSpoilersOn, pushRowCount)}
            />
            <Stat
              label="Off"
              value={noSpoilersOff}
              sub={pct(noSpoilersOff, pushRowCount)}
            />
            <Stat label="Push rows" value={pushRowCount} />
          </div>
          <p style={mutedStyle}>
            The free global toggle only. Per-follow hideSpoilers (the
            selective paid pitch) is not stored on push rows; it lives
            only in Brief subscriber snapshots.
          </p>
        </Section>

        <Section title="Multi-sport followers">
          <div style={statGridStyle}>
            <Stat
              label="Push rows with 2+ sports"
              value={multiSportRows}
              sub={pct(multiSportRows, pushRowCount)}
            />
          </div>
          <p style={mutedStyle}>
            A row counts as multi-sport when its alerts span at least
            two of NBA, Summer Soccer, or Tournament.
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={statValueStyle}>{value.toLocaleString()}</div>
      {sub ? <div style={statSubStyle}>{sub}</div> : null}
    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────
// Plain, no branding. Self-contained so app-level CSS can't bleed in.

const pageWrapStyle: CSSProperties = {
  // Override the cream html/body background set globally so the admin
  // page looks neutral.
  background: "#fff",
  minHeight: "100vh",
  width: "100%",
};

const mainStyle: CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "32px 20px 64px",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  color: "#111",
  lineHeight: 1.4,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  borderBottom: "1px solid #e5e5e5",
  paddingBottom: 12,
  marginBottom: 24,
};

const h1Style: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: 0,
  letterSpacing: "-0.01em",
};

const h2Style: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#555",
  margin: "0 0 12px 0",
};

const h3Style: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#333",
  margin: "20px 0 8px 0",
};

const sectionStyle: CSSProperties = { marginBottom: 36 };

const statGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 4,
};

const statCardStyle: CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  padding: "12px 14px",
  background: "#fafafa",
};

const statLabelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#666",
  marginBottom: 4,
};

const statValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
};

const statSubStyle: CSSProperties = {
  fontSize: 12,
  color: "#666",
  marginTop: 2,
  fontVariantNumeric: "tabular-nums",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  marginTop: 4,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  fontWeight: 600,
  color: "#555",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  borderBottom: "1px solid #e5e5e5",
  padding: "8px 8px",
};

const thNumStyle: CSSProperties = { ...thStyle, textAlign: "right" };

const tdStyle: CSSProperties = {
  padding: "8px 8px",
  borderBottom: "1px solid #f1f1f1",
};

const tdMonoStyle: CSSProperties = {
  ...tdStyle,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
};

const tdNumStyle: CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const tdTotalStyle: CSSProperties = { ...tdStyle, fontWeight: 600 };
const tdNumTotalStyle: CSSProperties = { ...tdNumStyle, fontWeight: 600 };

const mutedStyle: CSSProperties = {
  fontSize: 12,
  color: "#777",
  marginTop: 12,
  lineHeight: 1.5,
};

const mutedSmallStyle: CSSProperties = {
  fontSize: 11,
  color: "#999",
  fontVariantNumeric: "tabular-nums",
};

const inlineCodeStyle: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  background: "#f3f3f3",
  padding: "1px 6px",
  borderRadius: 4,
  margin: "0 2px",
};
