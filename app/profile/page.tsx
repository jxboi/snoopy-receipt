"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { categoryMeta } from "@/lib/categories";
import { money } from "@/lib/format";
import { buildWeeklyReport } from "@/lib/insights";
import { useStore } from "@/lib/store";

export default function ProfilePage() {
  const {
    receipts,
    currentUser,
    isSignedIn,
    syncState,
    signIn,
    signOut,
    clearReceipts,
    reset,
  } = useStore();
  const report = useMemo(() => buildWeeklyReport(receipts), [receipts]);
  const topCategory = report.slices[0];
  const topMeta = topCategory ? categoryMeta(topCategory.category) : null;
  const bestFind = receipts.find((r) => r.nugget)?.nugget;

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: currentUser,
      receipts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "snoopy-receipts.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function deleteReceipts() {
    if (window.confirm("Delete this profile's receipt history on this device?")) {
      clearReceipts();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm font-medium text-ink-soft">
            {isSignedIn ? "Signed in" : "Profile"}
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {isSignedIn ? `Hi, ${currentUser?.name}` : "Save your trail"}
          </h1>
        </div>
        <Mascot size={62} mood={isSignedIn ? "happy" : "curious"} />
      </motion.header>

      {isSignedIn ? (
        <>
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[28px] bg-paper p-5 shadow-soft"
          >
            <div className="flex items-center gap-4">
              <div
                className="grid size-16 place-items-center rounded-3xl font-display text-2xl font-semibold text-white shadow-lift"
                style={{
                  background:
                    "linear-gradient(150deg, var(--color-tangerine), var(--color-coral) 60%, var(--color-coral-deep))",
                }}
              >
                {currentUser?.name.trim().charAt(0).toUpperCase() || "S"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold text-ink">
                  {currentUser?.name}
                </p>
                <p className="truncate text-sm text-ink-soft">{currentUser?.email}</p>
                <p className="mt-1 text-xs font-medium text-coral">
                  {syncState === "synced"
                    ? "Account sync on"
                    : syncState === "syncing"
                      ? "Checking sync..."
                      : "Device-only for now"}
                </p>
              </div>
              <button
                onClick={signOut}
                className="shrink-0 rounded-full bg-cream px-3 py-2 text-xs font-semibold text-ink-soft active:scale-[0.98] transition-transform"
              >
                Sign out
              </button>
            </div>
          </motion.section>

          <ModePanel isSignedIn syncState={syncState} />

          <section className="grid grid-cols-2 gap-3">
            <MiniStat
              label="Snooped"
              value={`${receipts.length}`}
              sub="receipts"
              emoji="🔍"
              delay={0.05}
            />
            <MiniStat
              label="This week"
              value={money(report.total)}
              sub={`${report.receiptCount} receipts`}
              emoji="🗓️"
              delay={0.09}
            />
          </section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="rounded-3xl bg-paper p-5 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <div
                className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl"
                style={{ background: topMeta?.soft ?? "var(--color-cream-deep)" }}
              >
                {topMeta?.emoji ?? "🧾"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Current flavor
                </p>
                <p className="mt-1 font-display text-base font-semibold text-ink">
                  {topMeta
                    ? `${topMeta.label} is leading the week`
                    : "No pattern yet"}
                </p>
                <p className="mt-1 text-sm text-ink-soft text-balance">
                  {bestFind ??
                    "A couple of receipts will give Snoopy something to sniff out."}
                </p>
              </div>
            </div>
          </motion.section>

          <section className="flex flex-col gap-2.5">
            <ActionButton onClick={exportData} label="Export my data" />
            <ActionButton onClick={reset} label="Reset demo data" />
            <ActionButton onClick={deleteReceipts} label="Delete receipt history" danger />
          </section>
        </>
      ) : (
        <>
          <ModePanel isSignedIn={false} syncState="local" />
          <SignedOutCard receiptCount={receipts.length} />
        </>
      )}
    </div>
  );
}

function ModePanel({
  isSignedIn,
  syncState,
}: {
  isSignedIn: boolean;
  syncState: "local" | "syncing" | "synced";
}) {
  const mode =
    !isSignedIn || syncState === "local"
      ? {
          label: "Local mode",
          title: isSignedIn ? "Device-only for now" : "Receipts stay here",
          body: isSignedIn
            ? "You are signed in, but cloud storage is not reachable yet. New receipts still save on this device."
            : "Scan freely. A magic link turns this into an account when you are ready.",
        }
      : syncState === "syncing"
        ? {
            label: "Checking sync",
            title: "Looking for your account shelf",
            body: "Snoopy is checking whether cloud storage is ready for this profile.",
          }
        : {
            label: "Account mode",
            title: "Cloud sync is on",
            body: "Receipts and private images are tied to this signed-in email session.",
          };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="rounded-3xl border border-black/5 bg-cream p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coral">
            {mode.label}
          </p>
          <h2 className="mt-1 font-display text-base font-semibold text-ink">
            {mode.title}
          </h2>
          <p className="mt-1 text-sm leading-snug text-ink-soft text-balance">
            {mode.body}
          </p>
        </div>
        <span
          className="mt-0.5 size-3 shrink-0 rounded-full"
          style={{
            background:
              isSignedIn && syncState === "synced"
                ? "var(--color-mint)"
                : "var(--color-tangerine)",
          }}
        />
      </div>
    </motion.section>
  );
}

function SignedOutCard({
  receiptCount,
}: {
  receiptCount: number;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setDevLink(null);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error("magic link failed");
      const payload = (await res.json()) as {
        mode: "email" | "dev";
        devLink?: string;
      };
      setDevLink(payload.devLink ?? null);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] bg-paper p-4 shadow-soft"
    >
      <div className="text-center">
        <Mascot size={64} mood="curious" />
        <h2 className="mt-1 font-display text-lg font-semibold text-ink">
          Save your receipt history
        </h2>
        <p className="mx-auto mt-1 max-w-[18rem] text-[13px] leading-snug text-ink-soft text-balance">
          Claim the {receiptCount} receipts on this device with a magic link.
        </p>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-2xl border border-black/5 bg-cream px-4 py-2.5 text-sm font-medium text-ink outline-none focus:border-coral/50"
            placeholder="Jamie"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Email
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            className="rounded-2xl border border-black/5 bg-cream px-4 py-2.5 text-sm font-medium text-ink outline-none focus:border-coral/50"
            placeholder="jamie@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-2xl bg-coral px-5 py-3 text-sm font-semibold text-white shadow-lift active:scale-[0.99] transition-transform"
        >
          {status === "sending" ? "Sending..." : "Send magic link"}
        </button>
      </form>

      {status === "sent" ? (
        <div className="mt-4 rounded-2xl bg-cream p-3 text-center">
          <p className="text-sm font-semibold text-ink">
            Check your inbox
          </p>
          <p className="mt-1 text-xs leading-snug text-ink-soft">
            The link expires in 15 minutes.
          </p>
          {devLink ? (
            <Link
              href={devLink}
              className="mt-3 inline-flex rounded-full bg-paper px-4 py-2 text-xs font-semibold text-coral shadow-soft"
            >
              Open dev magic link
            </Link>
          ) : null}
        </div>
      ) : null}

      {status === "error" ? (
        <p className="mt-3 text-center text-xs font-medium text-coral-deep">
          Couldn&apos;t send that link. Check the email and try again.
        </p>
      ) : null}

      <p className="mt-4 text-center text-xs text-ink-faint">
        Password-free sign in. Dev mode shows the link here.
      </p>
    </motion.section>
  );
}

function MiniStat({
  label,
  value,
  sub,
  emoji,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  emoji: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl bg-paper p-4 shadow-soft"
    >
      <div className="flex items-center gap-1.5">
        <span>{emoji}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate font-display text-xl font-semibold text-ink">
        {value}
      </p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </motion.div>
  );
}

function ActionButton({
  label,
  onClick,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3.5 text-left text-sm font-semibold shadow-soft active:scale-[0.99] transition-transform"
      style={{ color: danger ? "var(--color-coral-deep)" : "var(--color-ink)" }}
    >
      <span>{label}</span>
      <span className="text-ink-faint">→</span>
    </button>
  );
}
