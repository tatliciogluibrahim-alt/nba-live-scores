import { describe, it, expect } from "vitest";
import { buildApnsPayload } from "./apns-sender";

describe("buildApnsPayload", () => {
  it("wraps the alert under aps with sound + mutable-content", () => {
    const p = buildApnsPayload({ title: "T", body: "B" });
    expect(p.aps).toEqual({
      alert: { title: "T", body: "B" },
      sound: "default",
      "mutable-content": 1,
    });
  });

  it("places custom data as top-level keys alongside aps", () => {
    const p = buildApnsPayload(
      { title: "BRA vs JPN", body: "Track this match on your Lock Screen." },
      {
        type: "live-activity-offer",
        gameId: "wc1",
        sport: "wc",
        url: "/game/wc1?offer=live-activity",
      }
    );
    expect(p.type).toBe("live-activity-offer");
    expect(p.gameId).toBe("wc1");
    expect(p.sport).toBe("wc");
    expect(p.url).toBe("/game/wc1?offer=live-activity");
    // aps stays intact and the custom keys are NOT inside it
    expect((p.aps as Record<string, unknown>).type).toBeUndefined();
  });

  it("omits custom keys when no data is given", () => {
    const p = buildApnsPayload({ title: "T", body: "B" });
    expect(Object.keys(p)).toEqual(["aps"]);
  });
});
