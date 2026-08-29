import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireAdminBearer, requireCronBearer } from "./request-guards";

const req = (auth?: string) =>
  new Request("https://x.test/", auth ? { headers: { authorization: auth } } : {});

describe("request guards", () => {
  const saved = { CRON_SECRET: process.env.CRON_SECRET, ADMIN_TOKEN: process.env.ADMIN_TOKEN };
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret-value";
    process.env.ADMIN_TOKEN = "admin-token-value";
  });
  afterEach(() => {
    process.env.CRON_SECRET = saved.CRON_SECRET;
    process.env.ADMIN_TOKEN = saved.ADMIN_TOKEN;
  });

  it("cron: accepts the exact secret, rejects everything else", () => {
    expect(requireCronBearer(req("Bearer cron-secret-value"))).toBe(true);
    expect(requireCronBearer(req("Bearer wrong"))).toBe(false);
    expect(requireCronBearer(req("cron-secret-value"))).toBe(false); // no Bearer
    expect(requireCronBearer(req())).toBe(false);
  });

  it("cron: rejects the admin token (no cross-acceptance downward)", () => {
    expect(requireCronBearer(req("Bearer admin-token-value"))).toBe(false);
  });

  it("admin: accepts either token (the friend-test convenience)", () => {
    expect(requireAdminBearer(req("Bearer admin-token-value"))).toBe(true);
    expect(requireAdminBearer(req("Bearer cron-secret-value"))).toBe(true);
    expect(requireAdminBearer(req("Bearer nope"))).toBe(false);
  });

  it("fails closed when the env vars are unset", () => {
    delete process.env.CRON_SECRET;
    delete process.env.ADMIN_TOKEN;
    expect(requireCronBearer(req("Bearer anything"))).toBe(false);
    expect(requireAdminBearer(req("Bearer anything"))).toBe(false);
  });

  it("tolerates a trimmed token with trailing whitespace", () => {
    expect(requireCronBearer(req("Bearer cron-secret-value "))).toBe(true);
  });
});
