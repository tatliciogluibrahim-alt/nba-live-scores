import { NextResponse } from "next/server";
import {
  addBetaFeedback,
  isPlausibleEmail,
} from "../../../lib/beta/subscriber-store";
import {
  rejectCrossOrigin,
  rejectRateLimited,
} from "../../../lib/push/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/beta/feedback
//
// Accepts:
//   { email, working?, broken?, missing?, vibe? }
//
// Structured feedback template — three free-text fields plus a one-line
// "vibe". Stored in KV. The email doesn't need to match a registered
// beta subscriber — anyone with the link can submit. Rate-limited per
// IP to prevent dumps.

export async function POST(req: Request) {
  const originRejection = rejectCrossOrigin(req);
  if (originRejection) return originRejection;

  const rateRejection = await rejectRateLimited(req, "beta-feedback");
  if (rateRejection) return rateRejection;

  let payload: {
    email?: string;
    working?: string;
    broken?: string;
    missing?: string;
    vibe?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const email = (payload.email ?? "").trim();
  if (!isPlausibleEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const working = (payload.working ?? "").trim();
  const broken = (payload.broken ?? "").trim();
  const missing = (payload.missing ?? "").trim();
  const vibe = (payload.vibe ?? "").trim();

  if (!working && !broken && !missing && !vibe) {
    return NextResponse.json(
      { error: "Tell us at least one thing. Anything is fine." },
      { status: 400 }
    );
  }

  try {
    await addBetaFeedback({ email, working, broken, missing, vibe });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Beta feedback failed:", err);
    return NextResponse.json(
      { error: "Couldn't save your feedback. Try again in a minute." },
      { status: 500 }
    );
  }
}
