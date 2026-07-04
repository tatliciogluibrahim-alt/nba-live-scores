"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Display } from "../../atoms/Display";
import { Eyebrow } from "../../atoms/Eyebrow";

export type PickerOption = {
  id: string;
  primary: string;       // e.g. "New York Knicks"
  secondary?: string;    // e.g. "Eastern Conference"
  /** Single-line identity chip text (abbr or flag emoji). Use for team
   *  pickers, country pickers, tournament pickers where one symbol
   *  fits comfortably in a 36×36 tile. */
  mark?: string;
  /** Stacked chip lines for series-style marks where two team codes
   *  would otherwise overflow the chip (e.g. "CLE·NYK" = 7 chars at
   *  11px mono won't fit). Each entry renders on its own line. */
  markLines?: string[];
  group?: string;        // optional group label for section headers
  searchKeys?: string[]; // extra strings to match for search
};

// Shared picker chrome — title + lightweight search + list of taps.
// Each tap fires `onSelect(option)` and the parent decides whether to
// add/remove a follow and what to navigate to next.

export function PickerScreen({
  title,
  subtitle,
  options,
  isFollowing,
  onSelect,
  emptyMessage = "Nothing to pick yet.",
  searchPlaceholder = "Search",
  footer,
}: {
  title: string;
  subtitle: string;
  options: PickerOption[];
  isFollowing: (id: string) => boolean;
  onSelect: (option: PickerOption) => void;
  emptyMessage?: string;
  searchPlaceholder?: string;
  footer?: ReactNode;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const haystack = [o.primary, o.secondary, o.mark, o.group, ...(o.searchKeys ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  // Optional group bucket for visual section headers (e.g. by conference).
  const grouped = useMemo(() => {
    if (filtered.length === 0) return [];
    if (!filtered[0].group) return [{ label: "", items: filtered }];
    const map = new Map<string, PickerOption[]>();
    for (const opt of filtered) {
      const key = opt.group ?? "";
      const arr = map.get(key) ?? [];
      arr.push(opt);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [filtered]);

  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        {title}
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {subtitle}
      </p>

      <label className="mb-4 flex items-center gap-2 border-b px-1 py-2"
        style={{ borderColor: "var(--rule)", borderBottomWidth: 2 }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--mute-1)"
          strokeWidth="2.2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="min-h-[28px] w-full bg-transparent text-[14px] outline-none no-noise-focus-ring"
          style={{ color: "var(--ink)", fontWeight: 500 }}
        />
      </label>

      {grouped.length === 0 ? (
        <p
          className="px-1 py-6 text-[13px]"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
            color: "var(--mute-1)",
            fontWeight: 500,
          }}
        >
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map((bucket) => (
            <div key={bucket.label || "all"}>
              {bucket.label ? (
                <div className="mb-2 flex items-center gap-3">
                  <Eyebrow>{bucket.label}</Eyebrow>
                  <div
                    className="h-px flex-1"
                    style={{ background: "var(--line)" }}
                  />
                </div>
              ) : null}
              <ul className="space-y-2">
                {bucket.items.map((opt) => {
                  const following = isFollowing(opt.id);
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(opt)}
                        aria-label={
                          following
                            ? `Unfollow ${opt.primary}`
                            : `Follow ${opt.primary}`
                        }
                        aria-pressed={following}
                        className="flex min-h-[56px] w-full items-center gap-3 border-b px-1 py-2 text-left transition active:bg-[var(--paper)]"
                        style={{ borderColor: "var(--line)" }}
                      >
                        {opt.markLines && opt.markLines.length > 0 ? (
                          <span
                            aria-hidden
                            className="grid h-9 w-9 shrink-0 place-items-center leading-none"
                            style={{
                              color: "var(--mute-1)",
                              fontFamily: "var(--font-mono)",
                              // Each line at 10px mono with 1.1
                              // line-height leaves comfortable room
                              // for 2-line marks like "CLE / NYK"
                              // inside the 36px tile.
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.02em",
                              textAlign: "center",
                            }}
                          >
                            <span className="block">
                              {opt.markLines.map((line, i) => (
                                <span
                                  key={i}
                                  className="block"
                                  style={{ lineHeight: 1.1 }}
                                >
                                  {line}
                                </span>
                              ))}
                            </span>
                          </span>
                        ) : opt.mark ? (
                          <span
                            aria-hidden
                            className="grid h-9 w-9 shrink-0 place-items-center"
                            style={{
                              color: "var(--mute-1)",
                              fontFamily: "var(--font-mono)",
                              fontSize: opt.mark.length > 3 ? 11 : 14,
                              fontWeight: 700,
                            }}
                          >
                            {opt.mark}
                          </span>
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[14px] leading-snug"
                            style={{
                              color: "var(--ink)",
                              fontWeight: 700,
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {opt.primary}
                          </span>
                          {opt.secondary ? (
                            <span
                              className="mt-0.5 block truncate text-[12px]"
                              style={{ color: "var(--mute-1)", fontWeight: 500 }}
                            >
                              {opt.secondary}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className="shrink-0 px-2 py-1 text-[9.5px] uppercase"
                          style={{
                            fontFamily: "var(--font-mono)",
                            background: following ? "var(--ink)" : "transparent",
                            color: following ? "var(--cream)" : "var(--ink)",
                            border: following ? "1px solid var(--ink)" : "1px solid var(--ink)",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {following ? "Following" : "Follow"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {footer ? <div className="mt-5">{footer}</div> : null}
    </section>
  );
}
