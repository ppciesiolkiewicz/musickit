/*
 * The proxy's one look at a shared note before its page renders (src/proxy.ts). A stopped or unknown note link must answer
 * HTTP 404, and the page can't set it: the root `loading.tsx` has already streamed a 200 by the time it reads the share. So
 * the proxy asks the share's public API (`GET /api/shares/<id>`; the proxy never imports the database) and rewrites to a 404
 * only on a clear 404. Every other outcome fails open: the page renders and still shows its own notice, with a 200.
 *
 * - Timeout: the ask is cut off after `timeoutMs` (2 s), so a slow database never holds the page.
 * - Only page loads (`Accept` with text/html). Next strips its own RSC and prefetch headers before the proxy sees them
 *   (`skipProxyUrlNormalize` in the Next docs), so a client navigation or a prefetch is told apart by its Accept header
 *   (`*\/*`, never text/html) and skipped: it gets the page's notice with a 200.
 * - Host: the URL is built from the request's own address. Vercel checks the Host it routes, so this reaches this deployment;
 *   a self-hosted server that passes any Host through would make it ask that host (a fixed path, and only "404 or not" is
 *   used), so put such a server behind a proxy that sets Host.
 * - Behind Vercel Deployment Protection the ask gets a 401, so a stopped link there answers 200 with the notice.
 */

export const SHARED_NOTE_TIMEOUT_MS = 2000;

const SHARED_NOTE = /^\/notes\/shared\/([^/]+)$/;

/** The share id when the path is a shared note's page, else null. */
export const sharedNoteId = (pathname: string): string | null => SHARED_NOTE.exec(pathname)?.[1] ?? null;

type Fetch = (url: string | URL, init?: RequestInit) => Promise<Response>;

/** True only when the share API says 404 for this id on a page load; false for anything else, a failure or a timeout. */
export async function sharedNoteGone(req: Request, id: string, opts: { fetch?: Fetch; timeoutMs?: number } = {}): Promise<boolean> {
  if (!(req.headers.get("accept") ?? "").includes("text/html")) return false;
  const ask = opts.fetch ?? fetch;
  try {
    const res = await ask(new URL(`/api/shares/${encodeURIComponent(id)}`, req.url), { cache: "no-store", signal: AbortSignal.timeout(opts.timeoutMs ?? SHARED_NOTE_TIMEOUT_MS) });
    void res.body?.cancel();
    return res.status === 404;
  } catch {
    return false;
  }
}
