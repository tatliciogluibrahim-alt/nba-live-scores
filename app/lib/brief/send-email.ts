// Email send wrapper. Resend's HTTP API directly — no SDK dependency,
// no buildtime imports. One env var: RESEND_API_KEY.
//
// Why Resend: modern, generous free tier (3k/month at time of writing),
// clean transactional model, no marketing-pitch dashboard. Fits the
// brand. Swap by replacing this file's send body if we ever move.
//
// Sender config: BRIEF_FROM env var (e.g. "brief@nonoisescores.app").
// Domain must be verified in Resend before sends land in inboxes.
//
// Returns a structured result the caller can use to record per-
// subscriber outcomes — never throws on transport errors so the
// daily cron can keep iterating subscribers when one bounces.

type SendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult =
  | { delivered: true; id: string }
  | { delivered: false; reason: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendBriefEmail(input: SendInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BRIEF_FROM;

  if (!apiKey) {
    return { delivered: false, reason: "RESEND_API_KEY missing" };
  }
  if (!from) {
    return { delivered: false, reason: "BRIEF_FROM missing" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        delivered: false,
        reason: `resend-${res.status}-${body.slice(0, 120)}`,
      };
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { delivered: true, id: json.id ?? "unknown" };
  } catch (err) {
    return {
      delivered: false,
      reason: err instanceof Error ? err.message : "send-threw",
    };
  }
}
