"use client";

import Link from "next/link";
import type { ReminderRow as ReminderRowData } from "../today-data";

// The calm payoff line at the bottom of Today. Dashed border, mono eyebrow,
// optional secondary detail. Tap target meets 44px. No icons.

export function ReminderRow({ reminder }: { reminder: ReminderRowData }) {
  const body = (
    <>
      <p
        className="text-[10px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: "var(--mute-1)",
        }}
      >
        Reminder
      </p>
      <p
        className="mt-0.5 text-[13px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 600 }}
      >
        {reminder.text}
      </p>
      {reminder.detail ? (
        <p
          className="mt-0.5 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {reminder.detail}
        </p>
      ) : null}
    </>
  );

  const sharedClass =
    "block min-h-[44px] rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]";
  const sharedStyle = {
    background: "transparent",
    borderColor: "var(--mute-2)",
  };

  if (reminder.href) {
    return (
      <Link href={reminder.href} className={sharedClass} style={sharedStyle}>
        {body}
      </Link>
    );
  }

  return (
    <div className={sharedClass} style={sharedStyle}>
      {body}
    </div>
  );
}
