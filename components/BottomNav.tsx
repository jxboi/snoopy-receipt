"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.2 12 4.5l8 6.7M6.2 9.6V19a1 1 0 0 0 1 1h9.6a1 1 0 0 0 1-1V9.6"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReportIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 19V11M12 19V5M18 19v-6"
        stroke="currentColor"
        strokeWidth={active ? 2.6 : 2.1}
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.7l.8-1.4A1 1 0 0 1 8.9 5h6.2a1 1 0 0 1 .9.6L16.8 7h1.7A1.5 1.5 0 0 1 20 8.5v8A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-8Z"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.2" r="3" stroke="white" strokeWidth="2" />
    </svg>
  );
}

export function BottomNav() {
  const path = usePathname();
  const isHome = path === "/";
  const isReport = path.startsWith("/report");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-[480px] px-5 pb-safe pt-2">
        <div className="pointer-events-auto relative flex h-[62px] items-center justify-between rounded-[26px] border border-black/5 bg-paper/90 px-9 shadow-lift backdrop-blur-xl">
          <Link
            href="/"
            aria-label="Home"
            className="flex flex-col items-center gap-0.5 transition-colors"
            style={{ color: isHome ? "var(--color-coral)" : "var(--color-ink-faint)" }}
          >
            <HomeIcon active={isHome} />
            <span className="text-[10px] font-semibold">Home</span>
          </Link>

          {/* raised scan FAB */}
          <Link href="/scan" aria-label="Scan a receipt" className="absolute left-1/2 -top-6 -translate-x-1/2">
            <motion.div
              whileTap={{ scale: 0.9 }}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="grid size-[60px] place-items-center rounded-full shadow-lift"
              style={{
                background:
                  "linear-gradient(150deg, var(--color-tangerine), var(--color-coral) 55%, var(--color-coral-deep))",
              }}
            >
              <CameraIcon />
            </motion.div>
          </Link>

          <Link
            href="/report"
            aria-label="Weekly report"
            className="flex flex-col items-center gap-0.5 transition-colors"
            style={{ color: isReport ? "var(--color-coral)" : "var(--color-ink-faint)" }}
          >
            <ReportIcon active={isReport} />
            <span className="text-[10px] font-semibold">Report</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
