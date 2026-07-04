"use client";

import { motion } from "motion/react";

/**
 * Snoopy — a curious little magnifying-glass detective.
 * `mood` nudges the expression; `sniffing` gives it a gentle investigative wobble.
 */
export function Mascot({
  size = 96,
  mood = "happy",
  sniffing = false,
  className = "",
}: {
  size?: number;
  mood?: "happy" | "curious" | "wow";
  sniffing?: boolean;
  className?: string;
}) {
  const eyeY = mood === "wow" ? 52 : 54;
  const eyeR = mood === "wow" ? 6.5 : 5;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      animate={
        sniffing
          ? { rotate: [-6, 6, -6], y: [0, -2, 0] }
          : { rotate: [-2, 2, -2] }
      }
      transition={{
        duration: sniffing ? 1.1 : 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{ transformOrigin: "62px 58px" }}
      aria-hidden
    >
      <defs>
        <radialGradient id="lens" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fff5ee" />
          <stop offset="100%" stopColor="#ffe9db" />
        </radialGradient>
      </defs>

      {/* handle */}
      <rect
        x="86"
        y="86"
        width="16"
        height="34"
        rx="8"
        fill="var(--color-coral-deep)"
        transform="rotate(45 94 103)"
      />
      <rect
        x="88"
        y="84"
        width="12"
        height="20"
        rx="6"
        fill="var(--color-tangerine)"
        transform="rotate(45 94 94)"
      />

      {/* lens */}
      <circle cx="58" cy="54" r="42" fill="var(--color-coral)" />
      <circle cx="58" cy="54" r="34" fill="url(#lens)" />

      {/* face */}
      <circle cx={48} cy={eyeY} r={eyeR} fill="var(--color-ink)" />
      <circle cx={68} cy={eyeY} r={eyeR} fill="var(--color-ink)" />
      <circle cx={46.4} cy={eyeY - 1.8} r={1.5} fill="#fff" />
      <circle cx={66.4} cy={eyeY - 1.8} r={1.5} fill="#fff" />

      {mood === "wow" ? (
        <ellipse cx="58" cy="70" rx="6" ry="7.5" fill="var(--color-ink)" />
      ) : (
        <path
          d={
            mood === "curious"
              ? "M50 68 q8 6 16 0"
              : "M48 67 q10 9 20 0"
          }
          stroke="var(--color-ink)"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* cheeks */}
      <circle cx="40" cy="63" r="4" fill="var(--color-coral)" opacity="0.28" />
      <circle cx="76" cy="63" r="4" fill="var(--color-coral)" opacity="0.28" />

      {/* shine */}
      <path
        d="M40 38 q10 -12 26 -8"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </motion.svg>
  );
}
