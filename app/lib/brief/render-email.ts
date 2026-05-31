// Render a BriefPayload into the HTML email body — "The Margin" layout.
// A typeset diary: a fixed left mono gutter holds each section's label,
// the content sits in the right column, hairlines keep a steady cadence.
//
// Design constraints for email:
//   • Table-based, inline styles only — most clients strip <style>/<link>.
//   • System font stack (no web fonts). Mono stack for eyebrows + scores.
//   • 600px sheet on a cream backdrop. No media queries (fixed padding).
//   • Palette chosen to survive Gmail auto-dark inversion.
//   • The No Noise lockup is inline SVG (hidden from Outlook via mso
//     comments; the text wordmark still anchors the masthead there).
//
// No-Spoilers is handled upstream in composeBrief: when the subscriber
// has includeScores=false, yesterday rows arrive with scoreLine=null and
// context "Series state hidden." — this renderer switches to the
// redaction-slug treatment on that signal, no separate flag needed.

import type { BriefPayload, BriefGameRow } from "./compose-brief";

const ORIGIN = "https://nonoisescores.app";

// Palette (literal hex — email clients can't resolve CSS variables).
const C_CREAM = "#ece4cf"; // outer backdrop
const C_PAPER = "#faf5e8"; // the sheet
const C_INK = "#1a1612";
const C_INK2 = "#2b2520";
const C_MUTE = "#6b6147";
const C_MUTE2 = "#a89c7a";
const C_HAIR = "#e9e0c9";
const C_HAIR_STRONG = "#c8bd9f"; // link underlines
const C_SLUG = "#ebe1c8"; // redaction slug fill
const C_NBA = "#e55b2a";
const C_WC = "#1e6b3c";

const BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO_FONT =
  "'SF Mono', SFMono-Regular, Menlo, Consolas, Monaco, 'Courier New', monospace";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unsubscribeUrl(token: string): string {
  return `${ORIGIN}/brief/unsubscribe?token=${encodeURIComponent(token)}`;
}

// ── Layout atoms ───────────────────────────────────────────────────────

/** A 1px full-bleed-within-padding hairline row. */
function hairline(color = C_HAIR): string {
  return `
    <tr>
      <td style="padding: 0 32px;"><div style="height:1px; line-height:1px; font-size:0; background-color:${color};">&nbsp;</div></td>
    </tr>`;
}

/** The Margin grid: a fixed mono gutter (label) + the content column. */
function gutterRow(
  labelHtml: string,
  contentHtml: string,
  opts: { top?: number; bottom?: number; gutterPadTop?: number } = {}
): string {
  const { top = 24, bottom = 24, gutterPadTop = 4 } = opts;
  return `
    <tr>
      <td style="padding: ${top}px 32px ${bottom}px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="120" valign="top" class="mono" style="font-family: ${MONO_FONT}; font-size: 10.5px; color: ${C_MUTE}; letter-spacing: 2.3px; text-transform: uppercase; font-weight: 600; padding-top: ${gutterPadTop}px; line-height: 1.6;">
              ${labelHtml}
            </td>
            <td valign="top" style="padding-left: 20px;">
              ${contentHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/** Editorial lede — the curated Big-Moment intro. Renders directly
 *  under the masthead when set (Finals matchup, a clinch). Headline in
 *  display weight, a prose paragraph, then italic factual context
 *  lines. Calm, no CTA. */
function editorialLedeSection(payload: BriefPayload): string {
  const lede = payload.editorialLede;
  if (!lede) return "";
  const context = lede.context
    .map(
      (line) =>
        `<p style="margin: 6px 0 0 0; font-family: ${BODY_FONT}; font-size: 14px; line-height: 1.5; font-style: italic; color: ${C_MUTE};">${escape(
          line
        )}</p>`
    )
    .join("");
  const content = `
    <p style="margin: 0; font-family: ${BODY_FONT}; font-size: 19px; line-height: 1.25; font-weight: 800; letter-spacing: -0.3px; color: ${C_INK};">
      ${escape(lede.headline)}
    </p>
    <p style="margin: 8px 0 0 0; font-family: ${BODY_FONT}; font-size: 15.5px; line-height: 1.5; color: ${C_INK2};">
      ${escape(lede.body)}
    </p>
    ${context}`;
  return hairline() + gutterRow("The<br>Moment", content);
}

/** Gutter label with a muted date sub-line beneath ("Yesterday / May 27"). */
function gutterLabel(label: string, sub?: string): string {
  if (!sub) return escape(label);
  return `${escape(label)}<br><span style="color:${C_MUTE2}; font-weight:500;">${escape(sub)}</span>`;
}

// ── Masthead ───────────────────────────────────────────────────────────

function mastheadHtml(payload: BriefPayload): string {
  return `
    <tr>
      <td style="padding: 36px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="left" valign="middle" width="32">
              <!-- Hosted PNG, not inline SVG: Gmail (web + iOS) strips
                   inline <svg>, which left the desktop masthead with no
                   mark. An <img> renders in every client. -->
              <img src="${ORIGIN}/apple-touch-icon.png" width="24" height="24" alt="No Noise" style="display:block; width:24px; height:24px; border-radius:6px;" />
            </td>
            <td align="left" valign="middle" class="mono" style="font-family: ${MONO_FONT}; font-size:10.5px; color:${C_INK}; letter-spacing:2.4px; text-transform:uppercase; font-weight:700; padding-left:8px;">
              No Noise
            </td>
            <td align="right" valign="middle" class="mono" style="font-family: ${MONO_FONT}; font-size:10.5px; color:${C_MUTE}; letter-spacing:2.2px; text-transform:uppercase; font-weight:500;">
              Your Brief &middot; ${payload.issueNumber}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 32px 32px 36px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="120" valign="top" class="mono" style="font-family: ${MONO_FONT}; font-size: 10.5px; color: ${C_MUTE2}; letter-spacing: 2.3px; text-transform: uppercase; font-weight: 500; padding-top: 8px;">
              ${escape(payload.weekday)}
            </td>
            <td valign="top" style="padding-left: 20px;">
              <h1 style="margin:0; font-family: ${BODY_FONT}; font-size: 50px; line-height: 0.95; letter-spacing: -1.4px; font-weight: 800; color:${C_INK};">
                ${escape(payload.monthDay)}.
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ── Yesterday ──────────────────────────────────────────────────────────

function matchupLabel(row: BriefGameRow): string {
  // compose-brief stores "AWAY · HOME"; the Margin reads it "AWAY at HOME".
  return escape(row.matchup.replace(" · ", " at "));
}

function yesterdayShownGame(row: BriefGameRow, idx: number): string {
  const blurbs = (row.recapBlurbs ?? []).join(" ").trim();
  return `
    <div style="${idx > 0 ? "margin-top:22px;" : ""}">
      <div style="font-family: ${BODY_FONT}; font-size: 13px; color: ${C_MUTE}; letter-spacing: 0.5px; font-weight: 600; text-transform: uppercase;">
        ${matchupLabel(row)}
      </div>
      ${
        row.scoreLine
          ? `<div class="mono" style="margin-top: 8px; font-family: ${MONO_FONT}; font-size: 38px; color: ${C_INK}; letter-spacing: -0.8px; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums;">${escape(row.scoreLine)}</div>`
          : ""
      }
      <div class="mono" style="margin-top: 14px; font-family: ${MONO_FONT}; font-size: 10.5px; color: ${C_INK}; letter-spacing: 2.3px; text-transform: uppercase; font-weight: 600;">
        <span style="color:${C_NBA};">&bull;</span>&nbsp;&nbsp;${escape(row.context)}
      </div>
      ${
        blurbs
          ? `<p style="margin: 16px 0 0 0; font-family: ${BODY_FONT}; font-size: 14.5px; line-height: 1.55; color: ${C_INK2};">${escape(blurbs)}</p>`
          : ""
      }
    </div>`;
}

function yesterdayHiddenGame(row: BriefGameRow, idx: number): string {
  return `
    <div style="${idx > 0 ? "margin-top:22px;" : ""}">
      <div style="font-family: ${BODY_FONT}; font-size: 13px; color: ${C_MUTE}; letter-spacing: 0.5px; font-weight: 600; text-transform: uppercase;">
        ${matchupLabel(row)}
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
        <tr>
          <td width="180" height="42" bgcolor="${C_SLUG}" style="background-color:${C_SLUG}; border:1px solid ${C_HAIR}; border-radius:6px; font-size:0; line-height:0;">&nbsp;</td>
        </tr>
      </table>
      <div class="mono" style="margin-top: 14px; font-family: ${MONO_FONT}; font-size: 10.5px; color: ${C_MUTE}; letter-spacing: 2.3px; text-transform: uppercase; font-weight: 500;">
        Series state hidden
      </div>
    </div>`;
}

function yesterdaySection(payload: BriefPayload): string {
  const label = gutterLabel("Yesterday", payload.yesterdayMonthDay);

  if (payload.yesterday.length === 0) {
    return (
      hairline() +
      gutterRow(
        label,
        `<p style="margin: 0; font-family: ${BODY_FONT}; font-size: 15.5px; line-height: 1.5; color: ${C_MUTE};">Nothing from your follows wrapped yesterday.</p>`
      )
    );
  }

  const hidden = payload.yesterday.some((r) => r.scoreLine === null);

  const games = payload.yesterday
    .map((row, idx) =>
      row.scoreLine === null
        ? yesterdayHiddenGame(row, idx)
        : yesterdayShownGame(row, idx)
    )
    .join("");

  // When scores are hidden, one shared "N wrapped + open the app" closer
  // sits under the redacted games rather than repeating per game.
  const closer = hidden
    ? `
      <p style="margin: 16px 0 14px 0; font-family: ${BODY_FONT}; font-size: 14.5px; line-height: 1.55; color: ${C_INK2};">
        ${payload.yesterday.length === 1 ? "1 game" : `${payload.yesterday.length} games`} wrapped. Reveal in the app when you are ready.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td bgcolor="${C_INK}" style="background-color:${C_INK}; border-radius:999px;">
            <a href="${ORIGIN}" style="display:inline-block; padding: 11px 22px; font-family: ${MONO_FONT}; font-size: 10.5px; letter-spacing: 2.4px; text-transform: uppercase; color: ${C_PAPER}; text-decoration: none; font-weight: 600;">
              Open the app &nbsp;&rsaquo;
            </a>
          </td>
        </tr>
      </table>`
    : "";

  return hairline() + gutterRow(label, games + closer);
}

// ── Today ──────────────────────────────────────────────────────────────

function todaySection(payload: BriefPayload): string {
  const label = gutterLabel("Today", payload.monthDay);

  if (payload.today.length === 0) {
    return (
      hairline() +
      gutterRow(
        label,
        `<p style="margin: 0; font-family: ${BODY_FONT}; font-size: 15.5px; line-height: 1.5; color: ${C_MUTE};">No games from your follows on the schedule today. We will write again tomorrow.</p>`
      )
    );
  }

  const games = payload.today
    .map(
      (row, idx) => `
      <div style="${idx > 0 ? "margin-top:14px;" : ""}">
        <div style="font-family: ${BODY_FONT}; font-size: 15px; color: ${C_INK}; font-weight: 700; letter-spacing: -0.2px;">
          ${matchupLabel(row)}
        </div>
        <div style="margin-top: 3px; font-family: ${BODY_FONT}; font-size: 13px; color: ${C_MUTE}; font-weight: 500; line-height: 1.45;">
          ${escape(row.context)}
        </div>
      </div>`
    )
    .join("");

  return hairline() + gutterRow(label, games);
}

// ── Worth knowing ──────────────────────────────────────────────────────

function worthKnowingSection(payload: BriefPayload): string {
  const cd = payload.countdown;
  if (!cd && payload.worthKnowing.length === 0) return "";

  // Anticipatory countdown — big accent numeral + label on one line, then
  // the sentence drops to its own line at the content-column left edge so
  // it aligns with the stake line below and the section content above
  // (rather than indenting past the numeral).
  const countdownHtml = cd
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="bottom" style="font-family: ${BODY_FONT}; font-size: 32px; line-height: 1; font-weight: 800; color: ${C_WC}; letter-spacing: -0.8px;">
            ${String(cd.number)}
          </td>
          <td valign="bottom" style="padding-left: 12px;">
            <div class="mono" style="font-family: ${MONO_FONT}; font-size: 10.5px; color:${C_WC}; letter-spacing: 2.3px; text-transform: uppercase; font-weight: 600;">
              ${escape(cd.accentLabel)}
            </div>
          </td>
        </tr>
      </table>
      <p style="margin: 12px 0 0 0; font-family: ${BODY_FONT}; font-size: 14.5px; line-height: 1.55; color: ${C_INK2};">
        ${escape(cd.text)}
      </p>`
    : "";

  // Stake lines stack beneath the countdown (or stand alone).
  const lines = payload.worthKnowing
    .map(
      (line, idx) => `
      <p style="margin: ${idx > 0 || cd ? "12px" : "0"} 0 0 0; font-family: ${BODY_FONT}; font-size: 14.5px; line-height: 1.55; color: ${C_INK2};">
        ${escape(line)}
      </p>`
    )
    .join("");

  return hairline() + gutterRow("Worth<br>Knowing", countdownHtml + lines);
}

// ── Your alerts ────────────────────────────────────────────────────────

function alertsSection(payload: BriefPayload): string {
  const { tiers } = payload.alerts;
  if (tiers.length === 0) return "";

  const rows = tiers
    .map((line, idx) => {
      // Split "Name · Tier" — the tier is the last " · " segment.
      const parts = line.split(" · ");
      const tier = parts.length > 1 ? parts[parts.length - 1] : "";
      const name = parts.length > 1 ? parts.slice(0, -1).join(" · ") : line;
      const divider =
        idx > 0
          ? `<tr><td colspan="2" style="font-size:0; line-height:0;"><div style="height:1px; background-color:${C_HAIR};">&nbsp;</div></td></tr>`
          : "";
      return `
        ${divider}
        <tr>
          <td style="padding: 8px 0; font-family: ${BODY_FONT}; font-size: 14.5px; color: ${C_INK}; font-weight: 500;">
            ${escape(name)}
          </td>
          <td align="right" class="mono" style="padding: 8px 0; font-family: ${MONO_FONT}; font-size: 10.5px; color: ${C_MUTE}; letter-spacing: 2px; text-transform: uppercase;">
            ${escape(tier)}
          </td>
        </tr>`;
    })
    .join("");

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
      ${rows}
    </table>`;

  return hairline() + gutterRow("Your<br>Alerts", content, { top: 24, bottom: 28, gutterPadTop: 2 });
}

// ── Footer ─────────────────────────────────────────────────────────────

function footerSection(unsubscribeToken: string): string {
  const content = `
    <p style="margin: 0 0 6px 0; font-family: ${BODY_FONT}; font-size: 12.5px; line-height: 1.6; color: ${C_MUTE};">
      Sent because you subscribed to the No Noise Brief.
    </p>
    <p style="margin: 0; font-family: ${MONO_FONT}; font-size: 10.5px; letter-spacing: 1.8px; color: ${C_MUTE}; text-transform: uppercase;" class="mono">
      <a href="${ORIGIN}" style="color:${C_INK}; text-decoration:none; border-bottom: 1px solid ${C_HAIR_STRONG};">nonoisescores.app</a>
      &nbsp;&nbsp;&middot;&nbsp;&nbsp;
      <a href="${escape(unsubscribeUrl(unsubscribeToken))}" style="color:${C_MUTE}; text-decoration:none; border-bottom: 1px solid ${C_HAIR_STRONG};">Unsubscribe</a>
    </p>`;

  return hairline(C_INK) + gutterRow("Footer", content, { top: 22, bottom: 36, gutterPadTop: 0 });
}

// ── Document ───────────────────────────────────────────────────────────

export function renderBriefHtml({
  payload,
  unsubscribeToken,
}: {
  payload: BriefPayload;
  unsubscribeToken: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>No Noise &middot; ${escape(payload.dateLabel)}</title>
<!--[if mso]>
<style type="text/css">
  td, th, div, p, a, span { font-family: 'Segoe UI', Tahoma, Arial, sans-serif !important; }
  .mono { font-family: Consolas, 'Courier New', monospace !important; }
</style>
<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:${C_CREAM}; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;">

<div style="display:none; max-height:0; overflow:hidden; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${C_CREAM};">Your morning brief from No Noise.</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C_CREAM}" style="background-color:${C_CREAM};">
  <tr>
    <td align="center" style="padding: 32px 12px 40px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" bgcolor="${C_PAPER}" style="width:600px; max-width:100%; background-color:${C_PAPER};">
        ${mastheadHtml(payload)}
        ${editorialLedeSection(payload)}
        ${yesterdaySection(payload)}
        ${todaySection(payload)}
        ${worthKnowingSection(payload)}
        ${alertsSection(payload)}
        ${footerSection(unsubscribeToken)}
      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}

export function renderBriefText({
  payload,
  unsubscribeToken,
}: {
  payload: BriefPayload;
  unsubscribeToken: string;
}): string {
  const lines: string[] = [];
  lines.push(`NO NOISE · YOUR BRIEF · ${payload.issueNumber}`);
  lines.push(payload.dateLabel);
  lines.push("");

  if (payload.editorialLede) {
    lines.push("THE MOMENT");
    lines.push(`  ${payload.editorialLede.headline}`);
    lines.push(`  ${payload.editorialLede.body}`);
    for (const c of payload.editorialLede.context) lines.push(`  ${c}`);
    lines.push("");
  }

  if (payload.yesterday.length > 0) {
    lines.push("YESTERDAY");
    for (const row of payload.yesterday) {
      const score = row.scoreLine ? ` · ${row.scoreLine}` : "";
      lines.push(`  ${row.matchup}${score}`);
      lines.push(`  ${row.context}`);
      for (const b of row.recapBlurbs ?? []) lines.push(`    · ${b}`);
      lines.push("");
    }
  }

  if (payload.today.length > 0) {
    lines.push("TODAY");
    for (const row of payload.today) {
      lines.push(`  ${row.matchup} · ${row.context}`);
    }
    lines.push("");
  }

  if (payload.worthKnowing.length > 0) {
    lines.push("WORTH KNOWING");
    for (const w of payload.worthKnowing) lines.push(`  · ${w}`);
    lines.push("");
  }

  if (payload.alerts.tiers.length > 0) {
    lines.push("YOUR ALERTS");
    for (const t of payload.alerts.tiers) lines.push(`  ${t}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("Sent because you subscribed to the No Noise Brief.");
  lines.push(`Unsubscribe: ${unsubscribeUrl(unsubscribeToken)}`);
  lines.push("nonoisescores.app");

  return lines.join("\n");
}
