import { test } from "node:test";
import assert from "node:assert/strict";
import { contentVideoPath } from "../server/rules";
import { UPLOADED_NOT_SAVED, contentVideoFileUrl, lookUpVideos, saveContentVideo, type SaveInput } from "./api";

const input: SaveInput = {
  id: "3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f", blob: new Blob(["x"], { type: "video/webm" }), type: "video/webm",
  title: "Funk riff on E9", note: "", seconds: 12, width: 1280, height: 720,
  madeFor: "guitar-advanced-funk-riff-on-e9", target: { kind: "cell", blockId: "guitar-advanced-funk-riff-on-e9", cell: 0 },
};
const video = { id: input.id, title: input.title, note: "", madeFor: input.madeFor, tool: null, steps: null, type: input.type, seconds: 12, width: 1280, height: 720, size: 1, savedAt: 1, overlay: null };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** A fake store and server: records every call. */
function fakes(put: () => Promise<unknown>, row: () => Promise<Response>) {
  const puts: { path: string; opts: { clientPayload: string; contentType: string } }[] = [];
  const rows: { url: string; init: RequestInit | undefined }[] = [];
  return {
    puts, rows,
    deps: {
      put: async (path: string, _blob: Blob, opts: { clientPayload: string; contentType: string }) => { puts.push({ path, opts }); return put(); },
      fetch: (async (url: string, init?: RequestInit) => { rows.push({ url, init }); return row(); }) as unknown as typeof fetch,
    },
  };
}

test("the file goes to its content path, then the row is saved", async () => {
  const f = fakes(async () => ({}), async () => json({ video, lost: [] }));
  const out = await saveContentVideo(input, f.deps);
  assert.deepEqual(out, { ok: true, video, lost: [] });
  assert.equal(f.puts[0].path, contentVideoPath(input.madeFor, input.id, input.type));
  assert.deepEqual(JSON.parse(f.puts[0].opts.clientPayload), { id: input.id, type: input.type, size: 1, madeFor: input.madeFor });
  assert.equal(f.rows[0].url, "/api/content-videos");
  assert.ok(f.rows[0].init?.signal, "the row has a timeout");
  const body = JSON.parse(String(f.rows[0].init?.body));
  assert.deepEqual(body, { id: input.id, title: input.title, note: "", type: input.type, seconds: 12, width: 1280, height: 720, path: f.puts[0].path, madeFor: input.madeFor, target: input.target });
});

test("a take whose file is up only retries the row", async () => {
  const f = fakes(async () => ({}), async () => json({ video, lost: [] }));
  const out = await saveContentVideo({ ...input, fileUp: true }, f.deps);
  assert.equal(out.ok, true);
  assert.equal(f.puts.length, 0);
  assert.equal(f.rows.length, 1);
});

test("a failed transfer tries the row once", async () => {
  const f = fakes(async () => { throw new Error("network"); }, async () => json({ video, lost: [] }));
  const out = await saveContentVideo(input, f.deps);
  assert.deepEqual(out, { ok: true, video, lost: [] });
  assert.equal(f.rows.length, 1);
});

test("a failed transfer and a refused row give the server's words", async () => {
  const f = fakes(async () => { throw new Error("network"); }, async () => json({ error: "The upload didn't finish. Try again." }, 400));
  assert.deepEqual(await saveContentVideo(input, f.deps), { ok: false, error: "The upload didn't finish. Try again.", fileUp: false });
});

test("the file is up but the row times out", async () => {
  const f = fakes(async () => ({}), async () => { throw new DOMException("timed out", "TimeoutError"); });
  assert.deepEqual(await saveContentVideo(input, f.deps), { ok: false, fileUp: true, error: UPLOADED_NOT_SAVED });
});

test("a 409 from the row is an error, with the file up and the server's words", async () => {
  const f = fakes(async () => ({}), async () => json({ error: "This video is already saved." }, 409));
  assert.deepEqual(await saveContentVideo(input, f.deps), { ok: false, fileUp: true, error: "This video is already saved." });
  const again = fakes(async () => { throw new Error("network"); }, async () => json({ error: "This video is already saved." }, 409));
  assert.deepEqual(await saveContentVideo(input, again.deps), { ok: false, fileUp: true, error: "This video is already saved." });
});

test("a failed transfer with no words from the row says the upload didn't finish", async () => {
  const f = fakes(async () => { throw new Error("socket hang up"); }, async () => { throw new Error("offline"); });
  const out = await saveContentVideo(input, f.deps);
  assert.equal(out.ok, false);
  assert.equal(!out.ok && out.fileUp, false);
  assert.match(!out.ok ? out.error : "", /didn't finish.*socket hang up/);
});

test("the file's address", () => assert.equal(contentVideoFileUrl("abc"), "/api/content-videos/abc/file"));

test("lookUpVideos answers the server's blocks and videos, and throws its words on a refusal", async () => {
  const was = globalThis.fetch;
  try {
    globalThis.fetch = (async () => json({ blocks: { b: [] }, videos: {} })) as unknown as typeof fetch;
    assert.deepEqual(await lookUpVideos([{ key: "b", cells: [] }]), { blocks: { b: [] }, videos: {} });
    globalThis.fetch = (async () => json({ error: "Send { blocks: [{ key, blockId, cells }] }." }, 400)) as unknown as typeof fetch;
    await assert.rejects(lookUpVideos([]), /Send \{ blocks/);
    globalThis.fetch = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    await assert.rejects(lookUpVideos([]), /The videos could not be loaded\./);
  } finally {
    globalThis.fetch = was;
  }
});
