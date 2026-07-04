"use client";

import { motion } from "motion/react";

const BITS = ["✨", "⭐", "💫", "🎉", "✨", "💛"];

/** A one-shot celebratory burst behind the reveal. Purely decorative. */
export function Sparkles({ count = 14 }: { count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.3 : 0);
    const dist = 70 + (i % 4) * 26;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.72,
      emoji: BITS[i % BITS.length],
      delay: (i % 6) * 0.03,
      scale: 0.7 + (i % 3) * 0.28,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, p.scale, p.scale, p.scale * 0.9],
            x: p.x,
            y: p.y,
          }}
          transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
          style={{ fontSize: 20 }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}
