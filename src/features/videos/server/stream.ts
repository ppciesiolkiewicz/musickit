/**
 * Serving a video file from the private Blob store so the browser can seek: the request's Range goes to Blob, and Blob's
 * answer comes back as 200 (the whole file) or 206 (a part). Pure: the route passes in what `get()` returned.
 */

/** What the route needs of `get()`'s result. The SDK reports a partial read as statusCode 200; its `content-range` header tells. */
export interface BlobRead {
  statusCode: number;
  stream: ReadableStream<Uint8Array> | null;
  headers: { get(name: string): string | null };
}

const ONE_RANGE = /^bytes=(\d+-\d*|-\d+)$/;

/** The headers for Blob's `get`: a single byte range is passed on as it is; anything else (none, several, odd) is dropped and the whole file is read. */
export function blobRangeHeaders(range: string | null): { range: string } | undefined {
  return range && ONE_RANGE.test(range) ? { range } : undefined;
}

const FORWARD = ["content-range", "content-length", "accept-ranges", "content-type"] as const;

/** The answer to the browser: 404 when there is no blob, 206 when Blob sent a part, else 200, with only the headers a player needs and cached as `cache` says (private, never stored by default); an error is never cached. */
export function streamAnswer(read: BlobRead | null, cache: string = "private, no-store"): Response {
  if (!read) return Response.json({ error: "Not found." }, { status: 404, headers: { "cache-control": "no-store" } });
  if (!read.stream) return Response.json({ error: "The video could not be read." }, { status: 502, headers: { "cache-control": "no-store" } });
  const headers = new Headers({ "cache-control": cache, "x-content-type-options": "nosniff" });
  for (const h of FORWARD) {
    const v = read.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("content-type")) headers.set("content-type", "application/octet-stream");
  const partial = read.statusCode === 206 || headers.has("content-range");
  return new Response(read.stream, { status: partial ? 206 : 200, headers });
}

/** The answer when `get()` threw: 416 for a range past the end of the file, else 502. */
export function failedStream(err: unknown): Response {
  const message = err instanceof Error ? err.message : "";
  const status = /\b416\b/.test(message) ? 416 : 502;
  return Response.json({ error: status === 416 ? "That part of the video doesn't exist." : "The video could not be read." }, { status, headers: { "cache-control": "no-store" } });
}
