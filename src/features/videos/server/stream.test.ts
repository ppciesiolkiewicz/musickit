import { test } from "node:test";
import assert from "node:assert/strict";
import { blobRangeHeaders, failedStream, streamAnswer } from "./stream";

const body = () => new ReadableStream<Uint8Array>({ start: (c) => (c.enqueue(new Uint8Array([1, 2, 3])), c.close()) });

test("blobRangeHeaders: a single byte range is passed on, anything else is dropped", () => {
  assert.deepEqual(blobRangeHeaders("bytes=0-99"), { range: "bytes=0-99" });
  assert.deepEqual(blobRangeHeaders("bytes=100-"), { range: "bytes=100-" });
  assert.deepEqual(blobRangeHeaders("bytes=-500"), { range: "bytes=-500" });
  assert.equal(blobRangeHeaders(null), undefined);
  assert.equal(blobRangeHeaders(""), undefined);
  assert.equal(blobRangeHeaders("bytes=0-1,5-9"), undefined);
  assert.equal(blobRangeHeaders("bytes=0-1\r\nx: y"), undefined);
  assert.equal(blobRangeHeaders("items=0-1"), undefined);
});

test("streamAnswer: a full read is a 200 with the blob's headers, private and not stored", async () => {
  const headers = new Headers({ "content-type": "video/webm", "content-length": "3", "accept-ranges": "bytes", etag: "\"e\"", "x-vercel-id": "secret" });
  const r = streamAnswer({ statusCode: 200, stream: body(), headers });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "video/webm");
  assert.equal(r.headers.get("content-length"), "3");
  assert.equal(r.headers.get("accept-ranges"), "bytes");
  assert.equal(r.headers.get("content-range"), null);
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-vercel-id"), null);
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [1, 2, 3]);
});

test("streamAnswer: a partial read (content-range) is a 206, though the SDK reports 200", () => {
  const headers = new Headers({ "content-type": "video/webm", "content-length": "100", "content-range": "bytes 0-99/20971520", "accept-ranges": "bytes" });
  const r = streamAnswer({ statusCode: 200, stream: body(), headers });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get("content-range"), "bytes 0-99/20971520");
  assert.equal(r.headers.get("content-length"), "100");
});

test("streamAnswer: an explicit 206 is kept", () => {
  const r = streamAnswer({ statusCode: 206, stream: body(), headers: new Headers({ "content-range": "bytes 5-9/10" }) });
  assert.equal(r.status, 206);
});

test("streamAnswer: no blob is a 404; no body is a 502", () => {
  assert.equal(streamAnswer(null).status, 404);
  assert.equal(streamAnswer({ statusCode: 304, stream: null, headers: new Headers() }).status, 502);
});

test("streamAnswer: a missing content-type is sent as octet-stream", () => {
  const r = streamAnswer({ statusCode: 200, stream: body(), headers: new Headers() });
  assert.equal(r.headers.get("content-type"), "application/octet-stream");
});

test("failedStream: a range past the end is a 416, other failures a 502", () => {
  assert.equal(failedStream(new Error("Failed to fetch blob: 416 Range Not Satisfiable")).status, 416);
  assert.equal(failedStream(new Error("Failed to fetch blob: 500 Internal")).status, 502);
  assert.equal(failedStream("boom").status, 502);
});

test("a content video's answer may be cached; an error never is", () => {
  const read206 = () => ({ statusCode: 206, stream: body(), headers: new Headers({ "content-range": "bytes 0-2/3", "content-type": "video/webm" }) });
  assert.equal(streamAnswer(read206(), "public, max-age=3600").headers.get("cache-control"), "public, max-age=3600");
  assert.equal(streamAnswer(read206()).headers.get("cache-control"), "private, no-store");
  assert.equal(streamAnswer(null, "public, max-age=3600").headers.get("cache-control"), "no-store");
  assert.equal(streamAnswer({ statusCode: 200, stream: null, headers: new Headers() }, "public, max-age=3600").headers.get("cache-control"), "no-store");
});
