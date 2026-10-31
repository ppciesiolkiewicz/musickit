type Env = { NODE_ENV?: string };

/** Dev tools run everywhere except a production build. */
export const devOnly = (env: Env = process.env): boolean => env.NODE_ENV !== "production";

/** First line of every /api/dev handler: a 404 in production, else null. */
export function devGate(env: Env = process.env): Response | null {
  return devOnly(env) ? null : new Response("Not found", { status: 404 });
}
