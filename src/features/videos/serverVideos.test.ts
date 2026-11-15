import { test } from "node:test";
import assert from "node:assert/strict";
import type { QueuedVideo } from "./queue";
import { UploadRefused, uploadQueued } from "./serverVideos";

const take = { id: "0b8a5c9e-3f1d-4a2b-9c7e-1d2f3a4b5c6d", accountId: "11111111-1111-4111-8111-111111111111", title: "Take", type: "video/webm", seconds: 10, width: 640, height: 360, state: "waiting", tries: 0, fileUp: true } as unknown as QueuedVideo;

/** Runs `fn` with `fetch` answering from `answer`, and gives the URLs it was asked. */
async function withFetch(answer: (call: string) => Response, fn: () => Promise<void>): Promise<string[]> {
  const asked: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const call = `${init?.method ?? "GET"} ${url}`;
    asked.push(call);
    return answer(call);
  }) as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = real;
  }
  return asked;
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("a 409 account-changed on the row is refused with words to reload, never read as 'the id is mine already'", async () => {
  let err: unknown;
  const asked = await withFetch(
    (call) => (call === "POST /api/videos" ? json(409, { error: "account-changed" }) : json(200, { videos: [{ id: take.id }] })),
    async () => {
      err = await uploadQueued(take).then(() => null, (e) => e);
    },
  );
  assert.ok(err instanceof UploadRefused);
  assert.equal(err.code, 409);
  assert.equal(err.message, "Another account is logged in now. Reload the page, then try again.");
  assert.deepEqual(asked, ["POST /api/videos"], "the list is not asked: the other account's list says nothing about this take");
});

test("a 409 for an id already in the player's own list is saved", async () => {
  const asked = await withFetch((call) => (call === "POST /api/videos" ? json(409, { error: "This video is saved already." }) : json(200, { videos: [{ id: take.id }] })), () => uploadQueued(take));
  assert.deepEqual(asked, ["POST /api/videos", "GET /api/videos"]);
});
