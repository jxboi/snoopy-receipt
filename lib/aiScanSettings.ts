export type AiScanProvider = "snoopy" | "anthropic" | "openai" | "gemini";
export type ExternalAiScanProvider = Exclude<AiScanProvider, "snoopy">;

export interface AiProviderOption {
  id: AiScanProvider;
  label: string;
  shortLabel: string;
  defaultModel: string;
  keyPlaceholder: string;
  description: string;
}

export interface AiScanSettings {
  provider: AiScanProvider;
  keys: Partial<Record<ExternalAiScanProvider, string>>;
  models: Partial<Record<ExternalAiScanProvider, string>>;
  updatedAt?: string;
}

const AI_SCAN_SETTINGS_KEY = "snoopy.aiScanSettings.v1";

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: "snoopy",
    label: "Snoopy cloud",
    shortLabel: "Snoopy",
    defaultModel: "",
    keyPlaceholder: "",
    description: "Uses the app's cloud parser when it is configured.",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    shortLabel: "Claude",
    defaultModel: "claude-opus-4-8",
    keyPlaceholder: "sk-ant-...",
    description: "Direct browser scan with your Anthropic key.",
  },
  {
    id: "openai",
    label: "OpenAI",
    shortLabel: "OpenAI",
    defaultModel: "gpt-5.4-mini",
    keyPlaceholder: "sk-...",
    description: "Direct browser scan with your OpenAI key.",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    shortLabel: "Gemini",
    defaultModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza...",
    description: "Direct browser scan with your Gemini API key.",
  },
];

export const DEFAULT_AI_SCAN_SETTINGS: AiScanSettings = {
  provider: "snoopy",
  keys: {},
  models: {
    anthropic: "claude-opus-4-8",
    openai: "gpt-5.4-mini",
    gemini: "gemini-2.5-flash",
  },
};

export function isExternalAiProvider(
  provider: AiScanProvider
): provider is ExternalAiScanProvider {
  return provider !== "snoopy";
}

export function providerOption(provider: AiScanProvider): AiProviderOption {
  return (
    AI_PROVIDER_OPTIONS.find((option) => option.id === provider) ??
    AI_PROVIDER_OPTIONS[0]
  );
}

export function normalizeAiScanSettings(value: unknown): AiScanSettings {
  const raw = value && typeof value === "object" ? value : {};
  const provider =
    "provider" in raw && typeof raw.provider === "string"
      ? raw.provider
      : "snoopy";
  const validProvider = AI_PROVIDER_OPTIONS.some((option) => option.id === provider)
    ? (provider as AiScanProvider)
    : "snoopy";

  const keys =
    "keys" in raw && raw.keys && typeof raw.keys === "object" ? raw.keys : {};
  const models =
    "models" in raw && raw.models && typeof raw.models === "object"
      ? raw.models
      : {};

  return {
    provider: validProvider,
    keys: {
      anthropic:
        "anthropic" in keys && typeof keys.anthropic === "string"
          ? keys.anthropic
          : "",
      openai:
        "openai" in keys && typeof keys.openai === "string" ? keys.openai : "",
      gemini:
        "gemini" in keys && typeof keys.gemini === "string" ? keys.gemini : "",
    },
    models: {
      anthropic:
        "anthropic" in models && typeof models.anthropic === "string"
          ? models.anthropic
          : DEFAULT_AI_SCAN_SETTINGS.models.anthropic,
      openai:
        "openai" in models && typeof models.openai === "string"
          ? models.openai
          : DEFAULT_AI_SCAN_SETTINGS.models.openai,
      gemini:
        "gemini" in models && typeof models.gemini === "string"
          ? models.gemini
          : DEFAULT_AI_SCAN_SETTINGS.models.gemini,
    },
    updatedAt:
      "updatedAt" in raw && typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : undefined,
  };
}

export function readAiScanSettings(): AiScanSettings {
  try {
    const raw = localStorage.getItem(AI_SCAN_SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_SCAN_SETTINGS;
    return normalizeAiScanSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_AI_SCAN_SETTINGS;
  }
}

export function writeAiScanSettings(settings: AiScanSettings) {
  localStorage.setItem(
    AI_SCAN_SETTINGS_KEY,
    JSON.stringify({
      ...normalizeAiScanSettings(settings),
      updatedAt: new Date().toISOString(),
    })
  );
}

export function configuredExternalProvider(
  settings = readAiScanSettings()
): ExternalAiScanProvider | null {
  if (!isExternalAiProvider(settings.provider)) return null;
  return settings.keys[settings.provider]?.trim() ? settings.provider : null;
}

export function maskedKey(key?: string): string {
  const clean = key?.trim() ?? "";
  if (!clean) return "";
  if (clean.length <= 10) return `${clean.slice(0, 2)}...`;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}
