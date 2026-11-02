type Env = { NODE_ENV?: string; NEXT_PUBLIC_DEV_UI?: string };

/** Dev tools run everywhere except a production build. */
export const devOnly = (env: Env = process.env): boolean => env.NODE_ENV !== "production";

/**
 * The dev overlays on real pages (notes, tool names and params, draft stories): on in development unless
 * NEXT_PUBLIC_DEV_UI=off, to see the site as users do. /dev pages and /api/dev stay on.
 * The default reads each variable by name so Next inlines them in client code.
 */
export const devUi = (env: Env = { NODE_ENV: process.env.NODE_ENV, NEXT_PUBLIC_DEV_UI: process.env.NEXT_PUBLIC_DEV_UI }): boolean =>
  devOnly(env) && env.NEXT_PUBLIC_DEV_UI !== "off";

/** First line of every /api/dev handler: a 404 in production, else null. */
export function devGate(env: Env = process.env): Response | null {
  return devOnly(env) ? null : new Response("Not found", { status: 404 });
}
