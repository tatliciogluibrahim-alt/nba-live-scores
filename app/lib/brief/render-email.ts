// Render a BriefPayload into the HTML email body. Calm editorial
// layout, inline-styled so Gmail/Apple Mail don't strip our CSS.
// Plain-text fallback included for accessibility + clients that
// don't render HTML.
//
// Design constraints for email:
//   • Inline styles only — most clients strip <style>/<link>.
//   • Web fonts don't load on most clients. Use system font stacks
//     that look close to our brand (Inter-style sans).
//   • Max width 560px, single column.
//   • Cream chassis matches the app for brand continuity.
//   • Footer carries unsubscribe link + brand lockup.

import type { BriefPayload, BriefGameRow } from "./compose-brief";

const ORIGIN = "https://nonoisescores.app";
const BRAND_CREAM = "#f1ead8";
const BRAND_PAPER = "#faf5e8";
const BRAND_INK = "#1a1612";
const BRAND_MUTE_1 = "#6b6147";
const BRAND_MUTE_2 = "#a89c7a";
const BRAND_NBA = "#e55b2a";

const BODY_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO_FONT =
  '"SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

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

function gameRowHtml(row: BriefGameRow): string {
  const link = `${ORIGIN}${row.href}`;
  const score = row.scoreLine
    ? `<span style="font-family:${MONO_FONT};font-variant-numeric:tabular-nums;font-weight:700;color:${BRAND_INK};">${escape(row.scoreLine)}</span>`
    : "";
  const blurbs =
    row.recapBlurbs && row.recapBlurbs.length > 0
      ? row.recapBlurbs
          .map(
            (b) =>
              `<li style="margin:6px 0 0 0;padding:0;font-size:13px;line-height:1.5;color:${BRAND_INK};">${escape(b)}</li>`
          )
          .join("")
      : "";
  const blurbList = blurbs
    ? `<ul style="margin:8px 0 0 0;padding-left:18px;">${blurbs}</ul>`
    : "";

  return `
    <tr>
      <td style="padding:14px 16px;border-top:1px solid #e9e0c9;">
        <a href="${escape(link)}" style="text-decoration:none;color:${BRAND_INK};display:block;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;">
            <div style="font-size:14px;font-weight:700;letter-spacing:-0.005em;">
              ${escape(row.matchup)}
            </div>
            ${score}
          </div>
          <div style="margin-top:4px;font-size:12px;color:${BRAND_MUTE_1};font-weight:500;line-height:1.4;">
            ${escape(row.context)}
          </div>
          ${blurbList}
        </a>
      </td>
    </tr>
  `;
}

function sectionHtml({
  eyebrow,
  rows,
  emptyLabel,
}: {
  eyebrow: string;
  rows: BriefGameRow[];
  emptyLabel: string;
}): string {
  if (rows.length === 0) {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
        <tr>
          <td style="padding:0 16px 8px 16px;">
            <div style="font-family:${MONO_FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_MUTE_1};">
              ${escape(eyebrow)}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 16px 0 16px;">
            <div style="font-size:13px;color:${BRAND_MUTE_1};font-weight:500;">${escape(emptyLabel)}</div>
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:${BRAND_PAPER};border:1px solid #e9e0c9;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:14px 16px 0 16px;">
          <div style="font-family:${MONO_FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_MUTE_1};">
            ${escape(eyebrow)}
          </div>
        </td>
      </tr>
      ${rows.map(gameRowHtml).join("")}
    </table>
  `;
}

function worthKnowingHtml(lines: string[]): string {
  if (lines.length === 0) return "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
      <tr>
        <td style="padding:0 16px 8px 16px;">
          <div style="font-family:${MONO_FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_MUTE_1};">
            Worth knowing
          </div>
        </td>
      </tr>
      ${lines
        .map(
          (line) => `
        <tr>
          <td style="padding:0 16px 6px 16px;">
            <div style="font-size:14px;color:${BRAND_INK};font-weight:500;line-height:1.5;">
              · ${escape(line)}
            </div>
          </td>
        </tr>
      `
        )
        .join("")}
    </table>
  `;
}

function alertsHtml(alerts: BriefPayload["alerts"]): string {
  if (alerts.enabled === 0 && alerts.tiers.length === 0) return "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
      <tr>
        <td style="padding:0 16px 8px 16px;">
          <div style="font-family:${MONO_FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_MUTE_1};">
            Your alerts
          </div>
        </td>
      </tr>
      ${alerts.tiers
        .map(
          (line) => `
        <tr>
          <td style="padding:0 16px 4px 16px;">
            <div style="font-size:13px;color:${BRAND_INK};font-weight:500;line-height:1.5;">
              ${escape(line)}
            </div>
          </td>
        </tr>
      `
        )
        .join("")}
    </table>
  `;
}

export function renderBriefHtml({
  payload,
  unsubscribeToken,
}: {
  payload: BriefPayload;
  unsubscribeToken: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>No Noise Scores · ${escape(payload.dateLabel)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_CREAM};font-family:${BODY_FONT};color:${BRAND_INK};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND_CREAM};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:0 16px 16px 16px;">
              <div style="font-family:${MONO_FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND_NBA};">
                No Noise · Your Brief
              </div>
              <div style="margin-top:6px;font-size:32px;font-weight:800;letter-spacing:-0.01em;color:${BRAND_INK};line-height:1.1;">
                ${escape(payload.dateLabel)}
              </div>
            </td>
          </tr>

          ${sectionHtml({
            eyebrow: "Yesterday",
            rows: payload.yesterday,
            emptyLabel: "Nothing from your follows wrapped yesterday.",
          })}

          ${sectionHtml({
            eyebrow: "Today",
            rows: payload.today,
            emptyLabel: "No games from your follows on the schedule today.",
          })}

          ${worthKnowingHtml(payload.worthKnowing)}

          ${alertsHtml(payload.alerts)}

          <!-- Footer -->
          <tr>
            <td style="padding:32px 16px 16px 16px;border-top:1px solid #e9e0c9;margin-top:24px;">
              <div style="font-size:12px;color:${BRAND_MUTE_1};font-weight:500;line-height:1.5;">
                Sent because you subscribed to the No Noise Brief.
              </div>
              <div style="margin-top:8px;font-size:12px;color:${BRAND_MUTE_2};font-weight:500;line-height:1.5;">
                <a href="${ORIGIN}" style="color:${BRAND_MUTE_1};text-decoration:underline;">nonoisescores.app</a>
                ·
                <a href="${unsubscribeUrl(unsubscribeToken)}" style="color:${BRAND_MUTE_1};text-decoration:underline;">Unsubscribe</a>
              </div>
            </td>
          </tr>
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
  lines.push(`NO NOISE · YOUR BRIEF`);
  lines.push(payload.dateLabel);
  lines.push("");

  if (payload.yesterday.length > 0) {
    lines.push("YESTERDAY");
    for (const row of payload.yesterday) {
      const score = row.scoreLine ? ` — ${row.scoreLine}` : "";
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
