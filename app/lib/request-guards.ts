// Bearer-token request guards — one home for the auth check that was
// copy-pasted across 12 route files in two variants (Preseason Review
// quick win). Security-critical code should have exactly one
// implementation; the 13th protected route gets it free.

import { timingSafeEqual } from "node:crypto";

function matchesEnv(provided: Buffer, envName: string): boolean {
  const expected = process.env[envName];
  if (!expected) return false;
  const b = Buffer.from(expected);
  if (provided.length !== b.length) return false;
  return timingSafeEqual(provided, b);
}

function bearerToken(req: Request): Buffer | null {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  return Buffer.from(header.slice("Bearer ".length).trim());
}

/** Cron variant: exactly CRON_SECRET. */
export function requireCronBearer(req: Request): boolean {
  const provided = bearerToken(req);
  if (!provided) return false;
  return matchesEnv(provided, "CRON_SECRET");
}

/** Admin variant: ADMIN_TOKEN (preferred) or CRON_SECRET (fallback, so
 *  the operator doesn't manage a second secret just to read ops
 *  metrics — the Phase 8 friend-test convenience, preserved). */
export function requireAdminBearer(req: Request): boolean {
  const provided = bearerToken(req);
  if (!provided) return false;
  return matchesEnv(provided, "ADMIN_TOKEN") || matchesEnv(provided, "CRON_SECRET");
}
