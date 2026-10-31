/** The Claude models a prompt run can use (claude CLI aliases). */
export type DevModel = "sonnet" | "opus" | "haiku";
export const DEV_MODELS: DevModel[] = ["sonnet", "opus", "haiku"];
export const isDevModel = (x: unknown): x is DevModel => DEV_MODELS.includes(x as DevModel);
