"use client";

import type { UseSetupStepResult } from "./useSetupStep";
import { FollowStep } from "./steps/FollowStep";
import { EnableStep } from "./steps/EnableStep";
import { RecoverStep } from "./steps/RecoverStep";
import { InstallStep } from "./steps/InstallStep";

// Renders the single active setup step's body. Placement is decided by the
// caller (TodayClient) via two slots; this component only maps step -> body.
export function SetupCard({ setup }: { setup: UseSetupStepResult }) {
  switch (setup.step) {
    case "follow":
      return <FollowStep />;
    case "install":
      return <InstallStep variant="blocking" platform={setup.platform} promptInstall={setup.promptInstall} />;
    case "installOptional":
      return <InstallStep variant="optional" platform={setup.platform} promptInstall={setup.promptInstall} />;
    case "enable":
      return <EnableStep />;
    case "recover":
      return <RecoverStep platform={setup.platform} />;
    default:
      return null;
  }
}
