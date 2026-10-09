import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blobToken, checkAccess, describePath, libraryPath, ownPath } from "./cloud";

const env = { SAMPLER_SITE_PASSWORD: "pw", MUSICKIT_BLOB_READ_WRITE_TOKEN: "tok" };

describe("cloud library access", () => {
  it("is off without a password or token", () => {
    assert.equal(checkAccess({}, "pw").ok, false);
    assert.equal(checkAccess({ SAMPLER_SITE_PASSWORD: "pw" }, "pw").ok, false);
    assert.equal(checkAccess({ MUSICKIT_BLOB_READ_WRITE_TOKEN: "t" }, "x").ok, false);
  });
  it("needs the right password", () => {
    assert.deepEqual(checkAccess(env, "pw"), { ok: true });
    const bad = checkAccess(env, "nope");
    assert.ok(!bad.ok && bad.status === 401);
    assert.ok(!checkAccess(env, null).ok);
  });
  it("prefers its own password and token names", () => {
    assert.equal(checkAccess({ ...env, NAM_LIBRARY_PASSWORD: "own" }, "pw").ok, false);
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
