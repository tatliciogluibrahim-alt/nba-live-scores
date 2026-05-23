"use client";

import Link from "next/link";
import { Eyebrow } from "../../atoms/Eyebrow";
import { WatchLine } from "../../watch/WatchLine";
import { SectionHeader } from "./section-header";
import type { UpNextItem } from "../today-data";

// Vertical list of upcoming games. Up-next rows stay fully visible under
// No-Spoilers — future games can't be spoiled.

export function UpNext({ items }: { items: UpNextItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader label="Up next" />
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-label={`${item.headline} · ${item.detail}`}
              className="block rounded-[14px] border px-3 py-3 transition active:scale-[0.99]"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
              }}
            >
              <Eyebrow>{item.eyebrow}</Eyebrow>
              <p
                className="mt-1 text-[14px] leading-snug"
                style={{
                  color: "var(--ink)",
                  fontWeight: 700,
                  letterSpacing: "-0.005em",
                }}
              >
                {item.headline}
              </p>
              <p
                className="mt-0.5 text-[12px]"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                {item.detail}
              </p>
              {item.watch ? (
                <div className="mt-2">
                  <WatchLine
                    channel={item.watch.channel}
                    stream={item.watch.stream}
                    ariaSubject={item.spoilerSubject}
                  />
                </div>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
