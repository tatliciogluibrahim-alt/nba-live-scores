import { NextResponse } from "next/server";
import {
  addBetaSubscriber,
  isPlausibleEmail,
} from "../../../lib/beta/subscriber-store";
import {
  rejectCrossOrigin,
  rejectRateLimited,
} from "../../../lib/push/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/beta/signup
//
// Accepts:
//   { email, sportsInterest?, source? }
//
// Rate-limited per IP, origin-checked, KV-backed. Stores the subscriber
// + their free-text "what sports do you follow" answer. No
// confirmation email — DM/email follow-up happens manually.

export async function POST(req: Request) {
  const originRejection = rejectCrossOrigin(req);
  if (originRejection) return originRejection;

  const rateRejection = await rejectRateLimited(req, "beta-signup");
  if (rateRejection) return rateRejection;

  let payload: { email?: string; sportsInterest?: string; source?: string };
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

  const sportsInterest = (payload.sportsInterest ?? "").trim();
  const source = (payload.source ?? "").trim();

  try {
    const subscriber = await addBetaSubscriber({
      email,
      sportsInterest,
      source,
    });
    return NextResponse.json({
      ok: true,
      email: subscriber.email,
    });
  } catch (err) {
    console.error("Beta signup failed:", err);
    return NextResponse.json(
      { error: "Couldn't save your signup. Try again in a minute." },
      { status: 500 }
    );
  }
}
