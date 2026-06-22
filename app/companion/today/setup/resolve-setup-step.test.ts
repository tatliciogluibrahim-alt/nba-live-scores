import { describe, it, expect } from "vitest";
import { resolveSetupStep, type SetupState } from "./resolve-setup-step";

// Base = a fully set-up returning user on Android with alerts granted.
// Each test overrides only the fields it cares about.
function state(overrides: Partial<SetupState> = {}): SetupState {
  return {
    followCount: 2,
    isNative: false,
    standalone: true,
    platform: "android",
    permission: "granted",
    beforeInstallAvailable: false,
    firstRunDismissed: false,
    notifDismissed: false,
    installDismissed: false,
    recoverDismissed: false,
    ...overrides,
  };
}

describe("resolveSetupStep", () => {
  it("0 follows -> follow", () => {
    expect(resolveSetupStep(state({ followCount: 0 }))).toBe("follow");
  });

  it("0 follows on native -> follow", () => {
    expect(resolveSetupStep(state({ followCount: 0, isNative: true }))).toBe("follow");
  });

  it("0 follows, firstRunDismissed -> null (no re-prompt for legacy dismissers)", () => {
    expect(resolveSetupStep(state({ followCount: 0, firstRunDismissed: true }))).toBeNull();
  });

  it("has follows on native -> null", () => {
    expect(resolveSetupStep(state({ isNative: true }))).toBeNull();
  });

  it("iOS Safari, not installed, default -> install", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: false, permission: "default" }))
    ).toBe("install");
  });

  it("iOS installed, default -> enable", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: true, permission: "default" }))
    ).toBe("enable");
  });

  it("Android, default -> enable (not install)", () => {
    expect(
      resolveSetupStep(state({ platform: "android", standalone: false, permission: "default" }))
    ).toBe("enable");
  });

  it("desktop, default -> enable", () => {
    expect(
      resolveSetupStep(state({ platform: "desktop", standalone: false, permission: "default" }))
    ).toBe("enable");
  });

  it("denied -> recover", () => {
    expect(resolveSetupStep(state({ permission: "denied", standalone: false }))).toBe("recover");
  });

  it("Android granted, install available, not installed -> installOptional", () => {
    expect(
      resolveSetupStep(
        state({ platform: "android", permission: "granted", beforeInstallAvailable: true, standalone: false })
      )
    ).toBe("installOptional");
  });

  it("desktop granted, install available, not installed -> installOptional", () => {
    expect(
      resolveSetupStep(
        state({ platform: "desktop", permission: "granted", beforeInstallAvailable: true, standalone: false })
      )
    ).toBe("installOptional");
  });

  it("Android granted, already installed -> null", () => {
    expect(resolveSetupStep(state({ permission: "granted", standalone: true }))).toBeNull();
  });

  it("notifDismissed skips enable -> null when nothing else applies", () => {
    expect(
      resolveSetupStep(state({ platform: "android", standalone: false, permission: "default", notifDismissed: true }))
    ).toBeNull();
  });

  it("installDismissed skips install on iOS -> null when push cannot work yet", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: false, permission: "default", installDismissed: true }))
    ).toBeNull();
  });

  it("recoverDismissed skips recover -> null", () => {
    expect(
      resolveSetupStep(state({ permission: "denied", standalone: false, recoverDismissed: true }))
    ).toBeNull();
  });

  it("unsupported notifications, iOS Safari uninstalled -> install", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: false, permission: "unsupported" }))
    ).toBe("install");
  });

  it("unsupported notifications, installed -> null", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: true, permission: "unsupported" }))
    ).toBeNull();
  });
});
