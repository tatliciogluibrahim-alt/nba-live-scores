import { describe, it, expect, vi, afterEach } from "vitest";
import { readLegendSeen, writeLegendSeen } from "./tier-legend-storage";

// Test environment is node — no window or localStorage by default.
// Stubs are created where needed and cleaned up after each test.

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── SSR guard ──────────────────────────────────────────────────────────────

describe("readLegendSeen (SSR / no window)", () => {
  it("returns false when window is not defined", () => {
    // Node environment has no window; the guard should short-circuit.
    expect(typeof window).toBe("undefined");
    expect(readLegendSeen()).toBe(false);
  });
});

describe("writeLegendSeen (SSR / no window)", () => {
  it("does not throw when window is not defined", () => {
    expect(() => writeLegendSeen()).not.toThrow();
  });
});

// ── With localStorage ──────────────────────────────────────────────────────

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    store, // expose for assertions
  };
}

function stubWindow(ls: ReturnType<typeof makeStorage>) {
  vi.stubGlobal("window", { localStorage: ls });
  vi.stubGlobal("localStorage", ls);
}

describe("readLegendSeen (with localStorage)", () => {
  it("returns false when the key is not set", () => {
    stubWindow(makeStorage());
    expect(readLegendSeen()).toBe(false);
  });

  it("returns true after writeLegendSeen has been called", () => {
    stubWindow(makeStorage());
    writeLegendSeen();
    expect(readLegendSeen()).toBe(true);
  });
});

describe("writeLegendSeen (with localStorage)", () => {
  it("sets the key so subsequent reads return true", () => {
    const ls = makeStorage();
    stubWindow(ls);
    writeLegendSeen();
    expect(ls.store.get("no-noise-tier-legend-seen")).toBe("1");
  });
});

// ── Storage error guard ────────────────────────────────────────────────────

describe("storage error handling", () => {
  it("readLegendSeen returns false when localStorage.getItem throws", () => {
    const ls = makeStorage();
    ls.getItem = () => { throw new Error("blocked"); };
    stubWindow(ls);
    expect(readLegendSeen()).toBe(false);
  });

  it("writeLegendSeen does not throw when localStorage.setItem throws", () => {
    const ls = makeStorage();
    ls.setItem = () => { throw new Error("blocked"); };
    stubWindow(ls);
    expect(() => writeLegendSeen()).not.toThrow();
  });
});
