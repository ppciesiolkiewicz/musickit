/**
 * Rules for the private cloud library of amp models (a private Vercel Blob store). Pure, so they can be tested; the routes
 * in src/app/api/nam call the Blob SDK. The store token never reaches the browser.
 */

export const NAM_PREFIX = "nam/";
export const MAX_MODEL_BYTES = 4 * 1024 * 1024; // a server upload on Vercel is limited to about 4.5 MB

/** The password that unlocks the cloud library. `NAM_LIBRARY_PASSWORD`, or the same site password the sampler uses. */
export const libraryPassword = (env: Record<string, string | undefined>): string | undefined => (env.NAM_LIBRARY_PASSWORD ?? env.SAMPLER_SITE_PASSWORD ?? env.SAMPLER_ACCESS_CODE)?.trim() || undefined;

/** The token of the private store. Prefixed so it does not clash with another store on the project. */
export const blobToken = (env: Record<string, string | undefined>): string | undefined => (env.MUSICKIT_BLOB_READ_WRITE_TOKEN ?? env.BLOB_READ_WRITE_TOKEN)?.trim() || undefined;

export type Access = { ok: true } | { ok: false; status: number; error: string };

/** Can this request use the library? Without a server password or token the library is switched off, never open. */
export function checkAccess(env: Record<string, string | undefined>, sent: string | null): Access {
  const pw = libraryPassword(env);
  if (!pw || !blobToken(env)) return { ok: false, status: 404, error: "The cloud library is not set up on this site." };
  if (!sent || !same(sent, pw)) return { ok: false, status: 401, error: "Wrong password." };
  return { ok: true };
}

/** Compares without stopping at the first difference. */
export function same(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** A safe pathname inside the library for a file name, or null. Only .nam files, no folders, no odd characters. */
export function libraryPath(fileName: unknown): string | null {
  if (typeof fileName !== "string") return null;
  const base = fileName.split(/[\\\\/]/).pop()?.trim() ?? "";
  if (!/\.nam$/i.test(base)) return null;
  const clean = base.replace(/[^\w.\- ()]+/g, "_").slice(0, 100);
  return clean.length > 4 ? NAM_PREFIX + clean : null;
}

/** Accept a pathname the client sends back (from the list) only if it is a model inside the library. */
export function ownPath(p: unknown): string | null {
  if (typeof p !== "string" || !p.startsWith(NAM_PREFIX) || p.includes("..") || p.slice(NAM_PREFIX.length).includes("/")) return null;
  return libraryPath(p.slice(NAM_PREFIX.length)) === p ? p : null;
}
