import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

// Type name kept as `PushRouteKind` for back-compat but it now covers
// any user-initiated POST endpoint that benefits from per-IP rate
// limiting — including the Brief email signup flow.
type PushRouteKind = "subscribe" | "unsubscribe" | "test" | "brief-subscribe";

const LIMITS = {
  subscribe: { tokens: 20, window: "1 m" },
  unsubscribe: { tokens: 30, window: "1 m" },
  test: { tokens: 5, window: "1 m" },
  // Brief signup: 5/min/IP is generous for a manual form submit and
  // prevents a script from enumerating emails or signup-spamming.
  "brief-subscribe": { tokens: 5, window: "1 m" },
} as const satisfies Record<PushRouteKind, { tokens: number; window: "1 m" }>;

const rateLimiters: Record<PushRouteKind, Ratelimit> = {
  subscribe: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(LIMITS.subscribe.tokens, LIMITS.subscribe.window),
    analytics: false,
    prefix: "nns:push:rate:subscribe:v1",
  }),
  unsubscribe: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(LIMITS.unsubscribe.tokens, LIMITS.unsubscribe.window),
    analytics: false,
    prefix: "nns:push:rate:unsubscribe:v1",
  }),
  test: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(LIMITS.test.tokens, LIMITS.test.window),
    analytics: false,
    prefix: "nns:push:rate:test:v1",
  }),
  "brief-subscribe": new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(
      LIMITS["brief-subscribe"].tokens,
      LIMITS["brief-subscribe"].window
    ),
    analytics: false,
    prefix: "nns:brief:rate:subscribe:v1",
  }),
};

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function originFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function deploymentOrigins(req: Request): Set<string> {
  const current = new URL(req.url);
  const origins = new Set<string>([current.origin]);
  const devHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (devHosts.has(current.hostname)) {
    const port = current.port ? `:${current.port}` : "";
    origins.add(`${current.protocol}//localhost${port}`);
    origins.add(`${current.protocol}//127.0.0.1${port}`);
    origins.add(`${current.protocol}//[::1]${port}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    const origin = originFromHeader(siteUrl);
    if (origin) origins.add(origin);
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) origins.add(`https://${vercelUrl}`);

  return origins;
}

export function rejectCrossOrigin(req: Request): NextResponse | null {
  const origin = originFromHeader(req.headers.get("origin"));
  const referer = originFromHeader(req.headers.get("referer"));
  const source = origin ?? referer;

  if (!source || !deploymentOrigins(req).has(source)) {
    return NextResponse.json(
      { error: "Push requests must come from this app origin." },
      { status: 403 }
    );
  }

  return null;
}

export async function rejectRateLimited(
  req: Request,
  kind: PushRouteKind
): Promise<NextResponse | null> {
  try {
    const ip = getClientIp(req);
    const result = await rateLimiters[kind].limit(ip);
    if (result.success) return null;

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000)
    );

    return NextResponse.json(
      { error: "Too many push requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(LIMITS[kind].tokens),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  } catch (err) {
    console.error("Push rate limit failed:", err);
    return NextResponse.json(
      { error: "Push backend rate limit is not configured." },
      { status: 503 }
    );
  }
}
