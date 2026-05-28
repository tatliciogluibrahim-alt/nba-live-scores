import { defineConfig } from "vitest/config";

// Minimal Vitest setup. We only test PURE logic — series-key helpers,
// the push event taxonomy/invariants, and the event detector. None of
// it touches the DOM, KV, or the network, so the default `node`
// environment is correct and fast. UI components and polling hooks are
// covered by the manual QA checklist (docs/QA_REFACTOR_CHECKLIST.md)
// rather than jsdom tests, which would be disproportionate for this
// codebase's size.
export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
