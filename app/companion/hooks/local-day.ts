/** Device-local calendar key used to invalidate day-sensitive composition.
 *  This is deliberately local (not UTC or ET): user-facing Today/Schedule
 *  labels follow the device calendar doctrine. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
