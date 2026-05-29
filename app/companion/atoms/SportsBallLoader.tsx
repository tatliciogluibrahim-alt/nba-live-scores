import type { CSSProperties } from "react";

// SportsBallLoader — a calm indeterminate loader. A single ink ball
// tumbles while its silhouette morphs basketball → soccer → football and
// the seams crossfade. Pure SVG + SMIL, no JS loop. Loops every 3s.
// (Original artwork for No Noise — see sportsball-loader handoff.)
//
// Colors default to CSS tokens so it themes itself: `ink` is the ball
// (dark on cream, light in warm-dark), `paper` is the seam color and
// MUST match the surface behind it so the seams read as cut-outs. On
// Today's surface that's --cream.
//
// `animated={false}` renders a still round ball with basketball seams —
// used during the pull (gesture-mapped) and for reduced-motion.

export function SportsBallLoader({
  size = 40,
  ink = "var(--ink)",
  paper = "var(--cream)",
  idPrefix = "nnball",
  animated = true,
  className,
  style,
}: {
  size?: number;
  ink?: string;
  paper?: string;
  idPrefix?: string;
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const clipId = `${idPrefix}-clip`;

  // Static (no-morph) variant: round ball + basketball seams only.
  if (!animated) {
    return (
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label="Loading"
        className={className}
        style={style}
      >
        <path
          fill={ink}
          d="M60 22 C81 22 98 39 98 60 C98 81 81 98 60 98 C39 98 22 81 22 60 C22 39 39 22 60 22 Z"
        />
        <g fill="none" stroke={paper} strokeWidth="3" strokeLinecap="round">
          <path d="M60 24 L60 96" />
          <path d="M24 60 L96 60" />
          <path d="M44 25 Q30 60 44 95" />
          <path d="M76 25 Q90 60 76 95" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Loading"
      className={className}
      style={style}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="60" cy="60" r="38" />
        </clipPath>
      </defs>
      <g>
        {/* slow tumble: one turn per 3s loop */}
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 60 60"
          to="360 60 60"
          dur="3s"
          repeatCount="indefinite"
        />

        {/* ball body — silhouette morphs round → round → football → round */}
        <path
          fill={ink}
          d="M60 22 C81 22 98 39 98 60 C98 81 81 98 60 98 C39 98 22 81 22 60 C22 39 39 22 60 22 Z"
        >
          <animate
            attributeName="d"
            dur="3s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.622;0.667;0.955;1"
            keySplines="0 0 1 1;0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1"
            values={
              "M60 22 C81 22 98 39 98 60 C98 81 81 98 60 98 C39 98 22 81 22 60 C22 39 39 22 60 22 Z;" +
              "M60 22 C81 22 98 39 98 60 C98 81 81 98 60 98 C39 98 22 81 22 60 C22 39 39 22 60 22 Z;" +
              "M60 42 C82 42 104 60 104 60 C104 60 82 78 60 78 C38 78 16 60 16 60 C16 60 38 42 60 42 Z;" +
              "M60 42 C82 42 104 60 104 60 C104 60 82 78 60 78 C38 78 16 60 16 60 C16 60 38 42 60 42 Z;" +
              "M60 22 C81 22 98 39 98 60 C98 81 81 98 60 98 C39 98 22 81 22 60 C22 39 39 22 60 22 Z"
            }
          />
        </path>

        {/* basketball seams (second 1) */}
        <g fill="none" stroke={paper} strokeWidth="3" strokeLinecap="round">
          <animate
            attributeName="opacity"
            dur="3s"
            repeatCount="indefinite"
            keyTimes="0;0.289;0.333;0.955;1"
            values="1;1;0;0;1"
          />
          <path d="M60 24 L60 96" />
          <path d="M24 60 L96 60" />
          <path d="M44 25 Q30 60 44 95" />
          <path d="M76 25 Q90 60 76 95" />
        </g>

        {/* soccer pattern (second 2), clipped to the ball rim */}
        <g
          stroke={paper}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        >
          <animate
            attributeName="opacity"
            dur="3s"
            repeatCount="indefinite"
            keyTimes="0;0.289;0.333;0.58;0.62;1"
            values="0;0;1;1;0;0"
          />
          <path fill={paper} stroke={paper} strokeWidth="2.4" d="M60 48 L71.4 56.3 L67.1 69.7 L52.9 69.7 L48.6 56.3 Z" />
          <path fill={paper} stroke={paper} strokeWidth="2.4" d="M78.8 34.1 L74.8 21.8 L85.3 14.2 L95.8 21.8 L91.8 34.1 Z" />
          <path fill={paper} stroke={paper} strokeWidth="2.4" d="M90.4 69.9 L100.9 62.3 L111.4 69.9 L107.4 82.2 L94.4 82.2 Z" />
          <path fill={paper} stroke={paper} strokeWidth="2.4" d="M60 92 L70.5 99.6 L66.5 111.9 L53.5 111.9 L49.5 99.6 Z" />
          <path fill={paper} stroke={paper} strokeWidth="2.4" d="M29.6 69.9 L25.6 82.2 L12.6 82.2 L8.6 69.9 L19.1 62.3 Z" />
          <path fill={paper} stroke={paper} strokeWidth="2.4" d="M41.2 34.1 L28.2 34.1 L24.2 21.8 L34.7 14.2 L45.2 21.8 Z" />
          <path fill="none" d="M65.7 52.2 L78.8 34.1" />
          <path fill="none" d="M69.2 63 L90.4 69.9" />
          <path fill="none" d="M60 69.7 L60 92" />
          <path fill="none" d="M50.8 63 L29.6 69.9" />
          <path fill="none" d="M54.3 52.2 L41.2 34.1" />
        </g>

        {/* football laces (second 3) */}
        <g fill="none" stroke={paper} strokeWidth="3" strokeLinecap="round">
          <animate
            attributeName="opacity"
            dur="3s"
            repeatCount="indefinite"
            keyTimes="0;0.667;0.71;0.92;0.955;1"
            values="0;0;1;1;0;0"
          />
          <path d="M47 60 L73 60" />
          <path d="M52 55 L52 65" />
          <path d="M58 54 L58 66" />
          <path d="M64 54 L64 66" />
          <path d="M70 55 L70 65" />
          <path d="M86 52 Q91 60 86 68" />
          <path d="M34 52 Q29 60 34 68" />
        </g>
      </g>
    </svg>
  );
}
