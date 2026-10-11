/** The provider keys and site password, kept from the old sampler page (same storage key, so saved ones survive). */
const KEY = "musickit.sampler.settings";

export interface Settings {
  sitePassword: string;
  /** a person's own key for each provider, by provider id */
  ownKeys: Record<string, string>;
  /** keep own keys in this browser */
  remember: boolean;
}

export function readSettings(): Settings {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (v && typeof v === "object") {
      const keys: Record<string, string> = {};
      if (v.ownKeys && typeof v.ownKeys === "object") for (const [k, x] of Object.entries(v.ownKeys)) keys[k] = String(x);
      else if (v.ownKey) keys.elevenlabs = String(v.ownKey);
      return { sitePassword: String(v.sitePassword ?? v.accessCode ?? ""), ownKeys: keys, remember: Boolean(v.remember) };
    }
  } catch {
    /* ignore */
  }
  return { sitePassword: "", ownKeys: {}, remember: false };
}

/** Own keys are written only when the person asked to remember them. */
export function writeSettings(s: Settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s.remember ? s : { ...s, ownKeys: {} }));
  } catch {
    /* ignore */
  }
}
