"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Mascot } from "@/components/Mascot";
import {
  DEFAULT_AI_SCAN_SETTINGS,
  configuredExternalProvider,
  providerOption,
  readAiScanSettings,
  type AiScanSettings,
} from "@/lib/aiScanSettings";
import { money } from "@/lib/format";
import { buildWeeklyReport } from "@/lib/insights";
import { useStore } from "@/lib/store";

export default function ProfilePage() {
  const {
    receipts,
    currentUser,
    isSignedIn,
    syncState,
    syncError,
    cloudScanAllowed,
    setCloudScanAllowed,
    signOut,
    clearReceipts,
    reset,
  } = useStore();
  const report = useMemo(() => buildWeeklyReport(receipts), [receipts]);
  const showDemoReset = process.env.NODE_ENV !== "production";
  const [aiSettings, setAiSettings] = useState<AiScanSettings>(
    DEFAULT_AI_SCAN_SETTINGS
  );

  useEffect(() => {
    setAiSettings(readAiScanSettings());
  }, []);

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
                {syncState === "local" && syncError ? (
                  <p className="mt-1 text-[11px] font-medium text-coral-deep">
                    Sync check: {syncError}
                  </p>
                ) : null}
              </div>
              <button
                onClick={signOut}
                className="shrink-0 rounded-full bg-cream px-3 py-2 text-xs font-semibold text-ink-soft active:scale-[0.98] transition-transform"
              >
                Sign out
              </button>
            </div>
          </motion.section>

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

          <section className="flex flex-col gap-2.5">
            <CloudScanSetting
              checked={cloudScanAllowed}
              settings={aiSettings}
              onChange={setCloudScanAllowed}
            />
            <ActionButton onClick={exportData} label="Export my data" />
            <ActionLink href="/privacy" label="Privacy & trust" />
            {showDemoReset ? (
              <ActionButton onClick={reset} label="Reset demo data" />
            ) : null}
            <ActionButton onClick={deleteReceipts} label="Delete receipt history" danger />
          </section>
        </>
      ) : (
        <SignedOutCard receiptCount={receipts.length} />
      )}
    </div>
  );
}

function CloudScanSetting({
  checked,
  settings,
  onChange,
}: {
  checked: boolean;
  settings: AiScanSettings;
  onChange: (checked: boolean) => void;
}) {
  const provider = configuredExternalProvider(settings);
  const providerReady = provider ? providerOption(provider) : null;
  const modeLabel = checked
    ? providerReady
      ? `Private scan · ${providerReady.shortLabel}`
      : "Snoopy cloud"
    : "Off";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-paper p-4 shadow-soft"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-xl">
          ☁️
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-ink">
            Allow cloud scan
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            {checked
              ? providerReady
                ? `Receipt photos go straight to ${providerReady.shortLabel} with your key.`
                : "Real receipt photos can use Snoopy's cloud parser."
              : "Use samples only, or turn this on when you want real receipt reads."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label="Allow cloud scan"
          onClick={() => onChange(!checked)}
          className="relative h-8 w-14 shrink-0 rounded-full p-1 transition-colors active:scale-[0.98]"
          style={{
            background: checked
              ? "var(--color-coral)"
              : "color-mix(in srgb, var(--color-ink) 12%, white)",
          }}
        >
          <span
            className="block size-6 rounded-full bg-white shadow-soft transition-transform"
            style={{ transform: checked ? "translateX(1.5rem)" : "translateX(0)" }}
          />
        </button>
      </div>

    </motion.section>
  );
}

function SignedOutCard({
  receiptCount,
}: {
  receiptCount: number;
}) {
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
          Claim the {receiptCount} receipts on this device with a quick sign in.
        </p>
      </div>

      <Link
        href="/api/auth/google"
        className="mt-4 flex items-center justify-center gap-2.5 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lift ring-1 ring-white/30 active:scale-[0.99] transition-transform"
      >
        <GoogleIcon />
        Continue with Google
      </Link>

      <p className="mt-4 text-center text-xs text-ink-faint">
        Your receipts stay on this device until you sign in.
      </p>
      <Link
        href="/privacy"
        className="mt-3 block text-center text-xs font-semibold text-coral"
      >
        Read privacy & trust
      </Link>
    </motion.section>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.71-.06-1.23-.18-1.77H10v3.22h5.53c-.11.8-.71 2.01-2.04 2.82l-.02.11 2.96 2.24.2.02c1.84-1.66 2.97-4.1 2.97-6.64Z"
      />
      <path
        fill="#34A853"
        d="M10 19.8c2.63 0 4.84-.85 6.46-2.31l-3.08-2.38c-.82.56-1.93.95-3.38.95a5.86 5.86 0 0 1-5.54-3.96l-.12.01-3.08 2.32-.04.11A9.75 9.75 0 0 0 10 19.8Z"
      />
      <path
        fill="#FBBC05"
        d="M4.46 12.1A5.76 5.76 0 0 1 4.14 10c0-.73.12-1.43.31-2.1l-.01-.14-3.12-2.36-.1.05A9.63 9.63 0 0 0 .2 10c0 1.64.4 3.18 1.02 4.55l3.24-2.45Z"
      />
      <path
        fill="#EA4335"
        d="M10 3.94c1.83 0 3.06.77 3.76 1.42l2.75-2.62A9.42 9.42 0 0 0 10 .2a9.75 9.75 0 0 0-8.78 5.25l3.23 2.45A5.9 5.9 0 0 1 10 3.94Z"
      />
    </svg>
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

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3.5 text-left text-sm font-semibold text-ink shadow-soft active:scale-[0.99] transition-transform"
    >
      <span>{label}</span>
      <span className="text-ink-faint">→</span>
    </Link>
  );
}
