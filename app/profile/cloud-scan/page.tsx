"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AI_PROVIDER_OPTIONS,
  DEFAULT_AI_SCAN_SETTINGS,
  configuredExternalProvider,
  isExternalAiProvider,
  maskedKey,
  providerOption,
  readAiScanSettings,
  writeAiScanSettings,
  type AiScanProvider,
  type AiScanSettings,
  type ExternalAiScanProvider,
} from "@/lib/aiScanSettings";
import { useStore } from "@/lib/store";

export default function CloudScanPage() {
  const { cloudScanAllowed, setCloudScanAllowed } = useStore();
  const [settings, setSettings] = useState<AiScanSettings>(
    DEFAULT_AI_SCAN_SETTINGS
  );
  const [keyDraft, setKeyDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const selected = settings.provider;
  const selectedOption = providerOption(selected);
  const privateProvider = configuredExternalProvider(settings);

  useEffect(() => {
    setSettings(readAiScanSettings());
  }, []);

  useEffect(() => {
    if (!isExternalAiProvider(selected)) {
      setKeyDraft("");
      setModelDraft("");
      return;
    }
    setKeyDraft(settings.keys[selected] ?? "");
    setModelDraft(settings.models[selected] ?? selectedOption.defaultModel);
  }, [selected, selectedOption.defaultModel, settings.keys, settings.models]);

  const status = useMemo(() => {
    if (!cloudScanAllowed) return "Cloud scan is off";
    if (privateProvider) {
      return `Private scan through ${providerOption(privateProvider).shortLabel}`;
    }
    return "Snoopy cloud scan";
  }, [cloudScanAllowed, privateProvider]);

  function persist(next: AiScanSettings) {
    setSettings(next);
    try {
      writeAiScanSettings(next);
    } catch {
      /* storage can fail in private browsing; keep the in-memory choice visible */
    }
  }

  function chooseProvider(provider: AiScanProvider) {
    persist({ ...settings, provider });
  }

  function savePrivateProvider(provider: ExternalAiScanProvider) {
    persist({
      ...settings,
      provider,
      keys: {
        ...settings.keys,
        [provider]: keyDraft.trim(),
      },
      models: {
        ...settings.models,
        [provider]: modelDraft.trim() || providerOption(provider).defaultModel,
      },
    });
    if (!cloudScanAllowed) setCloudScanAllowed(true);
  }

  function removePrivateKey(provider: ExternalAiScanProvider) {
    persist({
      ...settings,
      provider: "snoopy",
      keys: {
        ...settings.keys,
        [provider]: "",
      },
    });
    setKeyDraft("");
  }

  return (
    <div className="flex flex-col gap-5">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link
          href="/profile"
          aria-label="Back to profile"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-lg font-semibold text-ink shadow-soft active:scale-[0.98] transition-transform"
        >
          ←
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-soft">Profile</p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Cloud scan
          </h1>
        </div>
      </motion.header>

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
              Allow real receipt reads
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
              {status}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cloudScanAllowed}
            aria-label="Allow cloud scan"
            onClick={() => setCloudScanAllowed(!cloudScanAllowed)}
            className="relative h-8 w-14 shrink-0 rounded-full p-1 transition-colors active:scale-[0.98]"
            style={{
              background: cloudScanAllowed
                ? "var(--color-coral)"
                : "color-mix(in srgb, var(--color-ink) 12%, white)",
            }}
          >
            <span
              className="block size-6 rounded-full bg-white shadow-soft transition-transform"
              style={{
                transform: cloudScanAllowed
                  ? "translateX(1.5rem)"
                  : "translateX(0)",
              }}
            />
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl bg-paper p-4 shadow-soft"
      >
        <div>
          <p className="font-display text-base font-semibold text-ink">
            Parser
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            Choose Snoopy cloud for the simplest setup, or use your own key when
            you want the photo to go straight from this browser to your provider.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {AI_PROVIDER_OPTIONS.map((option) => {
            const active = selected === option.id;
            const hasKey =
              isExternalAiProvider(option.id) &&
              Boolean(settings.keys[option.id]?.trim());
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => chooseProvider(option.id)}
                className="rounded-2xl px-3 py-3 text-left text-xs font-semibold transition active:scale-[0.99]"
                style={{
                  background: active
                    ? "var(--color-ink)"
                    : "color-mix(in srgb, var(--color-ink) 5%, white)",
                  color: active ? "white" : "var(--color-ink)",
                }}
              >
                <span className="block truncate">{option.shortLabel}</span>
                <span
                  className="mt-0.5 block truncate text-[10px] font-medium"
                  style={{
                    color: active
                      ? "color-mix(in srgb, white 72%, transparent)"
                      : "var(--color-ink-faint)",
                  }}
                >
                  {option.id === "snoopy"
                    ? "No setup"
                    : hasKey
                      ? "Key saved"
                      : "Needs key"}
                </span>
              </button>
            );
          })}
        </div>
      </motion.section>

      {isExternalAiProvider(selected) ? (
        <PrivateProviderSetup
          keyDraft={keyDraft}
          modelDraft={modelDraft}
          provider={selected}
          settings={settings}
          onKeyChange={setKeyDraft}
          onModelChange={setModelDraft}
          onRemove={removePrivateKey}
          onSave={savePrivateProvider}
        />
      ) : (
        <SnoopyCloudSetup />
      )}
    </div>
  );
}

function PrivateProviderSetup({
  keyDraft,
  modelDraft,
  provider,
  settings,
  onKeyChange,
  onModelChange,
  onRemove,
  onSave,
}: {
  keyDraft: string;
  modelDraft: string;
  provider: ExternalAiScanProvider;
  settings: AiScanSettings;
  onKeyChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onRemove: (provider: ExternalAiScanProvider) => void;
  onSave: (provider: ExternalAiScanProvider) => void;
}) {
  const option = providerOption(provider);
  const savedKey = settings.keys[provider]?.trim();

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-3xl bg-paper p-4 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink">
            {option.label}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            {savedKey
              ? `Saved as ${maskedKey(savedKey)}.`
              : "Paste an API key from your provider account."}
          </p>
        </div>
        {savedKey ? (
          <button
            type="button"
            onClick={() => onRemove(provider)}
            className="shrink-0 rounded-full bg-cream px-3 py-2 text-xs font-semibold text-coral-deep active:scale-[0.98] transition-transform"
          >
            Remove
          </button>
        ) : null}
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          API key
        </span>
        <input
          value={keyDraft}
          onChange={(event) => onKeyChange(event.currentTarget.value)}
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="rounded-2xl border border-black/5 bg-cream px-4 py-3 text-sm font-medium text-ink outline-none focus:border-coral/50"
          placeholder={option.keyPlaceholder}
        />
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          Model
        </span>
        <input
          value={modelDraft}
          onChange={(event) => onModelChange(event.currentTarget.value)}
          spellCheck={false}
          className="rounded-2xl border border-black/5 bg-cream px-4 py-3 text-sm font-medium text-ink outline-none focus:border-coral/50"
          placeholder={option.defaultModel}
        />
      </label>

      <button
        type="button"
        onClick={() => onSave(provider)}
        disabled={!keyDraft.trim()}
        className="mt-4 w-full rounded-2xl bg-coral px-4 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99] disabled:opacity-45"
      >
        Save private scan
      </button>

      <p className="mt-3 text-[11px] leading-snug text-ink-faint">
        The key stays in this browser. Receipt photos are compressed, then sent
        directly to {option.shortLabel} for parsing.
      </p>
    </motion.section>
  );
}

function SnoopyCloudSetup() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-3xl bg-paper p-4 shadow-soft"
    >
      <p className="font-display text-base font-semibold text-ink">
        Snoopy cloud
      </p>
      <p className="mt-1 text-[13px] leading-snug text-ink-soft">
        No API key needed. Real receipt photos use Snoopy&apos;s configured cloud
        parser when it is available, with the same mock fallback if parsing gets
        shy.
      </p>
    </motion.section>
  );
}
