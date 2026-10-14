import { NextResponse } from "next/server";
import { parseKpiEvent } from "../../../lib/kpi/kpi";
import { recordKpi } from "../../../lib/kpi/kpi-store";

// Beacon for the launch KPIs (app/lib/kpi/kpi.ts): first open, and opens
// exactly 1 and 7 days later. Counts only, no device id. Unauthenticated
// like the funnel beacon: it only bumps a known counter for a recent day,
// so the worst case is a slightly inflated internal metric.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const e = parseKpiEvent(await req.json().catch(() => null), Date.now());
  if (!e) return NextResponse.json({ ok: false }, { status: 400 });
  await recordKpi(e);
  return NextResponse.json({ ok: true });
}
