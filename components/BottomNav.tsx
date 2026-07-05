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

function InsightsIcon({ active }: { active: boolean }) {
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

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4.8h10A1.8 1.8 0 0 1 18.8 6.6v11.2L16.5 16l-2.2 1.8L12 16l-2.3 1.8L7.5 16l-2.3 1.8V6.6A1.8 1.8 0 0 1 7 4.8Z"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 8.6h6.4M8.8 11.4h5M8.8 14.2h3.7"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6ZM5.2 20a6.8 6.8 0 0 1 13.6 0"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
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
  const isInsights = path.startsWith("/insights") || path.startsWith("/report");
  const isHistory = path.startsWith("/history");
  const isProfile = path.startsWith("/profile");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-[480px] px-5 pb-safe pt-2">
        <div className="pointer-events-auto relative grid h-[62px] grid-cols-[1fr_1fr_72px_1fr_1fr] items-center rounded-[26px] border border-black/5 bg-paper/90 px-4 shadow-lift backdrop-blur-xl">
          <Link
            href="/"
            aria-label="Home"
            className="flex flex-col items-center gap-0.5 transition-colors"
            style={{ color: isHome ? "var(--color-coral)" : "var(--color-ink-faint)" }}
          >
            <HomeIcon active={isHome} />
            <span className="text-[10px] font-semibold">Home</span>
          </Link>

          <Link
            href="/insights"
            aria-label="Weekly insights"
            className="flex flex-col items-center gap-0.5 transition-colors"
            style={{ color: isInsights ? "var(--color-coral)" : "var(--color-ink-faint)" }}
          >
            <InsightsIcon active={isInsights} />
            <span className="text-[10px] font-semibold">Insights</span>
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
            href="/history"
            aria-label="Receipt history"
            className="col-start-4 flex flex-col items-center gap-0.5 transition-colors"
            style={{ color: isHistory ? "var(--color-coral)" : "var(--color-ink-faint)" }}
          >
            <HistoryIcon active={isHistory} />
            <span className="text-[10px] font-semibold">History</span>
          </Link>

          <Link
            href="/profile"
            aria-label="Profile"
            className="col-start-5 flex flex-col items-center gap-0.5 transition-colors"
            style={{ color: isProfile ? "var(--color-coral)" : "var(--color-ink-faint)" }}
          >
            <ProfileIcon active={isProfile} />
            <span className="text-[10px] font-semibold">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
