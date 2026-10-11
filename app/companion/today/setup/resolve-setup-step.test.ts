import { describe, it, expect } from "vitest";
import {
  onboardingAlertAction,
  resolveSetupStep,
  resolveTodayVisitAsk,
  shouldShowBriefPrompt,
  type SetupState,
  type SetupStepId,
} from "./resolve-setup-step";

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

  it("native denial -> recover", () => {
    expect(
      resolveSetupStep(
        state({ isNative: true, platform: "ios", permission: "denied" })
      )
    ).toBe("recover");
  });

  it("dismissed native recovery -> null", () => {
    expect(
      resolveSetupStep(
        state({
          isNative: true,
          platform: "ios",
          permission: "denied",
          recoverDismissed: true,
        })
      )
    ).toBeNull();
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

describe("shouldShowBriefPrompt", () => {
  it("waits until setup state has resolved", () => {
    expect(shouldShowBriefPrompt(false, null)).toBe(false);
  });

  it.each<SetupStepId>([
    "follow",
    "install",
    "enable",
    "recover",
    "installOptional",
  ])("suppresses the Brief while the %s setup ask is showing", (step) => {
    expect(shouldShowBriefPrompt(true, step)).toBe(false);
  });

  it("allows the Brief only when no setup ask remains", () => {
    expect(shouldShowBriefPrompt(true, null)).toBe(true);
  });
});

describe("resolveTodayVisitAsk", () => {
  it("waits for setup resolution", () => {
    expect(resolveTodayVisitAsk(false, null, true)).toBeNull();
  });

  it("prioritizes the current setup step over later asks", () => {
    expect(resolveTodayVisitAsk(true, "enable", true)).toBe("setup:enable");
  });

  it("shows first-follow education before the Brief", () => {
    expect(resolveTodayVisitAsk(true, null, true)).toBe("firstFollow");
  });

  it("uses the Brief only when no activation ask remains", () => {
    expect(resolveTodayVisitAsk(true, null, false)).toBe("brief");
  });
});

// Onboarding's "Turn on alerts" on the web. Before 2026-10-11 it did nothing
// outside the native wrapper and still recorded the alerts decision, which
// switched off Today's own Enable step: a web user tapped it, was never
// asked, and got no pushes while Following read "Companion alerts on".
describe("onboardingAlertAction", () => {
  const web = (
    platform: "ios" | "android" | "desktop" | "unknown",
    standalone: boolean,
    permission: "default" | "granted" | "denied" | "unsupported"
  ) => onboardingAlertAction({ platform, standalone, permission });

  it("asks wherever the browser can show the prompt", () => {
    expect(web("desktop", false, "default")).toBe("ask");
    expect(web("android", false, "default")).toBe("ask");
    expect(web("ios", true, "default")).toBe("ask");
  });

  it("subscribes straight away when permission is already granted", () => {
    expect(web("desktop", false, "granted")).toBe("subscribe");
  });

  it("leaves the decision open on iPhone before the app is on the home screen", () => {
    // iOS web push needs the installed app; Today's Install step leads there.
    expect(web("ios", false, "default")).toBe("later");
  });

  it("leaves the decision open with no Notification API or after a denial", () => {
    expect(web("desktop", false, "unsupported")).toBe("later");
    expect(web("android", false, "denied")).toBe("later");
  });
});
