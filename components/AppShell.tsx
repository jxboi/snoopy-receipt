"use client";

import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { BottomNav } from "./BottomNav";
import { Mascot } from "./Mascot";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();

  return (
    <div className="flex min-h-dvh justify-center">
      <div className="relative w-full max-w-[480px]">
        <main className="min-h-dvh px-5 pb-32 pt-6">{children}</main>
        <BottomNav />
      </div>

      <AnimatePresence>
        {!ready && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-cream"
          >
            <Mascot size={96} sniffing />
            <div className="text-center">
              <p className="font-display text-2xl font-semibold text-ink">Snoopy</p>
              <p className="mt-1 text-sm text-ink-soft">Sniffing out your receipts…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
