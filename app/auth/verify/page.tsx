"use client";

import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { useStore } from "@/lib/store";

type VerifyState = "checking" | "done" | "bad";

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyShell state="checking" />}>
      <VerifyMagicLink />
    </Suspense>
  );
}

function VerifyMagicLink() {
  const search = useSearchParams();
  const { ready, signIn } = useStore();
  const [state, setState] = useState<VerifyState>("checking");
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    const token = search.get("token");
    if (!token) {
      setState("bad");
      return;
    }

    fetch("/api/auth/magic-link/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("bad token");
        return (await res.json()) as {
          profile: { name: string; email: string; signedInAt?: string };
        };
      })
      .then(({ profile }) => {
        signIn(profile);
        setState("done");
        setTimeout(() => window.location.replace("/profile"), 700);
      })
      .catch(() => setState("bad"));
  }, [ready, search, signIn]);

  return <VerifyShell state={state} />;
}

function VerifyShell({ state }: { state: VerifyState }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] bg-paper p-8 shadow-soft"
      >
        <Mascot
          size={92}
          sniffing={state === "checking"}
          mood={state === "bad" ? "curious" : "happy"}
        />
        <h1 className="mt-3 font-display text-xl font-semibold text-ink">
          {state === "checking"
            ? "Checking your link"
            : state === "done"
              ? "You're signed in"
              : "That link wandered off"}
        </h1>
        <p className="mx-auto mt-1 max-w-[16rem] text-sm text-ink-soft text-balance">
          {state === "checking"
            ? "One tiny receipt-sized moment."
            : state === "done"
              ? "Taking you back to your profile."
              : "Try sending yourself a fresh magic link from Profile."}
        </p>
      </motion.div>
    </div>
  );
}
