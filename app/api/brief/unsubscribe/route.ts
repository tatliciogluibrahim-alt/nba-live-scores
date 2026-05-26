// GET /api/brief/unsubscribe?token=...
//
// One-click unsubscribe from the email footer. We accept GET because
// email clients pre-fetch links for safety previews — POST would fire
// false unsubscribes. The token is opaque and single-use; once
// removed, the same link returns "already unsubscribed."
//
// Redirects to /brief/unsubscribed which renders the calm
// confirmation page.

import { NextResponse } from "next/server";
import {
  getSubscriberByToken,
  removeSubscriber,
} from "../../../lib/brief/subscriber-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/brief/unsubscribed?status=missing", url));
  }

  const sub = await getSubscriberByToken(token);
  if (!sub) {
    return NextResponse.redirect(
      new URL("/brief/unsubscribed?status=already", url)
    );
  }

  try {
    await removeSubscriber(sub.email);
    return NextResponse.redirect(new URL("/brief/unsubscribed?status=ok", url));
  } catch (err) {
    console.error("brief-unsubscribe failed", err);
    return NextResponse.redirect(
      new URL("/brief/unsubscribed?status=error", url)
    );
  }
}
