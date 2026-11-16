/** The Claude models a prompt run can use: the studio's claude CLI aliases, and the pinned ids /dev/compare-models compares. */
export const STUDIO_MODELS = ["sonnet", "opus", "haiku"] as const;
export const DEMO_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-2"] as const;
/** A model served by the local Ollama, by its Ollama name. */
export type OllamaModel = `ollama:${string}`;
export type DevModel = (typeof STUDIO_MODELS)[number] | (typeof DEMO_MODELS)[number] | OllamaModel;
export const isOllamaModel = (x: unknown): x is OllamaModel => typeof x === "string" && /^ollama:[\w.:/-]+$/.test(x);
export const isDevModel = (x: unknown): x is DevModel => ([...STUDIO_MODELS, ...DEMO_MODELS] as string[]).includes(x as string) || isOllamaModel(x);
/** The name Ollama knows a model by. */
export const ollamaName = (m: OllamaModel): string => m.slice("ollama:".length);
