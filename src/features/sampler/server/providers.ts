/** The sample providers. Plain data, safe to import in the browser; the keys never appear here. */
export interface ProviderInfo {
  id: "elevenlabs";
  label: string;
  /** the environment variable that holds the app's own key on the server */
  keyEnv: string;
  minSeconds: number;
  maxSeconds: number;
}

export const PROVIDERS: readonly ProviderInfo[] = [{ id: "elevenlabs", label: "ElevenLabs", keyEnv: "ELEVENLABS_API_KEY", minSeconds: 0.5, maxSeconds: 22 }];

export const getProvider = (id: unknown): ProviderInfo | undefined => PROVIDERS.find((p) => p.id === id);

/** What the server can do, as the page sees it. */
export interface Capabilities {
  providers: { id: ProviderInfo["id"]; label: string; /** the app has a key and an access code configured */ server: boolean; minSeconds: number; maxSeconds: number }[];
}
