// Stage-1 placeholder body. Each route renders this until its real
// implementation lands in Stage 3+. Uses the design tokens so the chrome
// is correct from day one.

export function Placeholder({
  eyebrow,
  title,
  body,
  stage,
}: {
  eyebrow: string;
  title: string;
  body: string;
  stage: string;
}) {
  return (
    <section className="mx-auto max-w-md px-4 pb-12 pt-2">
      <p
        className="text-[10px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.14em",
          color: "var(--mute-1)",
          fontWeight: 600,
        }}
      >
        {eyebrow}
      </p>
      <h1
        className="mt-1 text-[2rem] leading-[1.05]"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--ink)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>
      <p
        className="mt-3 text-[14px] leading-[1.5]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {body}
      </p>

      <div
        className="mt-6 rounded-[14px] border px-4 py-3"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
        }}
      >
        <p
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            color: "var(--mute-1)",
            fontWeight: 600,
          }}
        >
          Build status
        </p>
        <p
          className="mt-1 text-[13px]"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          {stage}
        </p>
      </div>
    </section>
  );
}
