import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { isCapacitorNative } from "../dev/native-detect";

// The one haptic in the app (Courtside motion rule, spec 2026-08-31): a
// light tap when a held score is revealed. Native only. The web build
// serves every installed app version, and only binaries from v1.0.4 on
// carry the Haptics plugin, so older binaries skip it instead of erroring.
//
// Fire and forget. Never await or return the plugin proxy itself (see
// live-activity.ts for why that hangs). Calling its methods is fine.
export function revealHaptic(): void {
  if (!isCapacitorNative() || !Capacitor.isPluginAvailable("Haptics")) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}
