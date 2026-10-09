/**
 * Rules for the private cloud library of amp models (a private Vercel Blob store). Pure, so they can be tested; the routes
 * in src/app/api/nam call the Blob SDK. The store token never reaches the browser.
 */

export const NAM_PREFIX = "nam/";
export const MAX_MODEL_BYTES = 4 * 1024 * 1024; // a server upload on Vercel is limited to about 4.5 MB

/** An optional password for the library. Only `NAM_LIBRARY_PASSWORD` turns it on; without it the library is open to anyone who reaches the site. */
export const libraryPassword = (env: Record<string, string | undefined>): string | undefined => env.NAM_LIBRARY_PASSWORD?.trim() || undefined;

/** The token of the private store. Prefixed so it does not clash with another store on the project. */
export const blobToken = (env: Record<string, string | undefined>): string | undefined => (env.MUSICKIT_BLOB_READ_WRITE_TOKEN ?? env.BLOB_READ_WRITE_TOKEN)?.trim() || undefined;

export type Access = { ok: true } | { ok: false; status: number; error: string };

/** Can this request use the library? It needs the store token; a password is checked only when one is configured. */
export function checkAccess(env: Record<string, string | undefined>, sent: string | null): Access {
  if (!blobToken(env)) return { ok: false, status: 404, error: "The cloud library is not set up on this site." };
  const pw = libraryPassword(env);
  if (pw && (!sent || !same(sent, pw))) return { ok: false, status: 401, error: "Wrong password." };
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

const SEGMENT = /^[\w.\- ()]{1,100}$/;

/**
 * Accept a pathname the client sends back (from the list) only if it is a model inside the library: `nam/<file>.nam`, or
 * `nam/<setup>/<file>.nam` where the folder holds the variants of one setup. One level of folder, no tricks.
 */
export function ownPath(p: unknown): string | null {
  if (typeof p !== "string" || !p.startsWith(NAM_PREFIX)) return null;
  const parts = p.slice(NAM_PREFIX.length).split("/");
  if (parts.length < 1 || parts.length > 2) return null;
  if (!parts.every((x) => SEGMENT.test(x) && x !== "." && x !== ".." && !x.startsWith("."))) return null;
  return /\.nam$/i.test(parts[parts.length - 1]) ? p : null;
}

/** The setup (folder) and variant (file without .nam) of a library path. A file at the top has no setup. */
export function describePath(p: string): { group: string | null; variant: string } {
  const parts = p.slice(NAM_PREFIX.length).split("/");
  const file = parts[parts.length - 1].replace(/\.nam$/i, "");
  return { group: parts.length > 1 ? parts[0] : null, variant: file };
}
