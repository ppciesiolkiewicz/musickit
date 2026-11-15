import { test } from "node:test";
import assert from "node:assert/strict";
import { sharedNoteGone, sharedNoteId } from "./sharedNoteGone";

const page = (accept = "text/html,application/xhtml+xml,*/*;q=0.8") => new Request("http://site.test/notes/shared/abc", { headers: { accept } });
const answering = (status: number) => {
  const asked: string[] = [];
  const fetcher = async (url: string | URL) => (asked.push(String(url)), new Response(null, { status }));
  return { asked, fetcher };
};

test("sharedNoteId: the id of a shared note's page, nothing else", () => {
  assert.equal(sharedNoteId("/notes/shared/abc_-1"), "abc_-1");
  assert.equal(sharedNoteId("/notes/shared/abc/x"), null);
  assert.equal(sharedNoteId("/notes/shared"), null);
  assert.equal(sharedNoteId("/plan"), null);
});

test("only a clear 404 from the share API is gone; 200, 401 and 503 pass through", async () => {
  for (const [status, gone] of [[404, true], [200, false], [401, false], [503, false]] as const) {
    const { asked, fetcher } = answering(status);
    assert.equal(await sharedNoteGone(page(), "abc", { fetch: fetcher }), gone, String(status));
    assert.deepEqual(asked, ["http://site.test/api/shares/abc"]);
  }
});

test("a fetch that throws or takes too long passes through", async () => {
  assert.equal(await sharedNoteGone(page(), "abc", { fetch: async () => { throw new Error("down"); } }), false);
  const slow = (_url: string | URL, init?: RequestInit) =>
    new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
  const started = Date.now();
  assert.equal(await sharedNoteGone(page(), "abc", { fetch: slow, timeoutMs: 30 }), false);
  assert.ok(Date.now() - started < 1000);
});

test("a request that isn't a page load (an RSC fetch or a prefetch, no text/html) isn't checked", async () => {
  const { asked, fetcher } = answering(404);
  assert.equal(await sharedNoteGone(page("*/*"), "abc", { fetch: fetcher }), false);
  assert.deepEqual(asked, []);
});
