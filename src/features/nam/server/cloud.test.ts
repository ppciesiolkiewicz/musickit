import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blobToken, checkAccess, describePath, libraryPath, ownPath } from "./cloud";

const env = { MUSICKIT_BLOB_READ_WRITE_TOKEN: "tok" };

describe("cloud library access", () => {
  it("is off without a token", () => {
    assert.equal(checkAccess({}, null).ok, false);
    assert.equal(checkAccess({ SAMPLER_SITE_PASSWORD: "pw" }, "pw").ok, false);
  });
  it("is open with a token and no library password", () => {
    assert.deepEqual(checkAccess(env, null), { ok: true });
    assert.deepEqual(checkAccess({ ...env, SAMPLER_SITE_PASSWORD: "pw" }, null), { ok: true });
  });
  it("checks NAM_LIBRARY_PASSWORD when it is set", () => {
    const locked = { ...env, NAM_LIBRARY_PASSWORD: "own" };
    assert.deepEqual(checkAccess(locked, "own"), { ok: true });
    const bad = checkAccess(locked, "nope");
    assert.ok(!bad.ok && bad.status === 401);
    assert.ok(!checkAccess(locked, null).ok);
    assert.equal(blobToken({ MUSICKIT_BLOB_READ_WRITE_TOKEN: "a", BLOB_READ_WRITE_TOKEN: "b" }), "a");
  });
});

describe("library paths", () => {
  it("only takes .nam files and cleans the name", () => {
    assert.equal(libraryPath("Fender Twin.nam"), "nam/Fender Twin.nam");
    assert.equal(libraryPath("../../etc/x.nam"), "nam/x.nam");
    assert.equal(libraryPath("a b$%.nam"), "nam/a b_.nam");
    assert.equal(libraryPath("song.mp3"), null);
    assert.equal(libraryPath(".nam"), null);
    assert.equal(libraryPath(5), null);
  });
  it("only gives back paths inside the library", () => {
    assert.equal(ownPath("nam/Fender Twin.nam"), "nam/Fender Twin.nam");
    assert.equal(ownPath("other/x.nam"), null);
    assert.equal(ownPath("nam/../x.nam"), null);
    assert.equal(ownPath("nam/a/b/c.nam"), null, "one level of folder only");
    assert.equal(ownPath("nam/x.txt"), null);
    assert.equal(ownPath("nam/../x.nam"), null);
    assert.equal(ownPath("nam/.hidden/x.nam"), null);
    assert.equal(ownPath("nam//x.nam"), null);
  });
  it("accepts a setup folder and describes it", () => {
    assert.equal(ownPath("nam/JCM800/Clean.nam"), "nam/JCM800/Clean.nam");
    assert.deepEqual(describePath("nam/JCM800/Crunch ch2.nam"), { group: "JCM800", variant: "Crunch ch2" });
    assert.deepEqual(describePath("nam/Twin.nam"), { group: null, variant: "Twin" });
  });
});
