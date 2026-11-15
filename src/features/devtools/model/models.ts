/** The Claude models a prompt run can use: the studio's claude CLI aliases, and the pinned ids /dev/more-demos compares. */
export const STUDIO_MODELS = ["sonnet", "opus", "haiku"] as const;
export const DEMO_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-2"] as const;
export type DevModel = (typeof STUDIO_MODELS)[number] | (typeof DEMO_MODELS)[number];
/** The studio's model picker. */
export const DEV_MODELS: DevModel[] = [...STUDIO_MODELS];
export const isDevModel = (x: unknown): x is DevModel => ([...STUDIO_MODELS, ...DEMO_MODELS] as string[]).includes(x as string);
