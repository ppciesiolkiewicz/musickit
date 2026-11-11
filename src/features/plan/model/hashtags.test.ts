import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashtagLine, readTitle } from "./hashtags";

describe("readTitle", () => {
  it("reads trailing hashtags into area, level and kind tags, any order, any case", () => {
    assert.deepEqual(readTitle("Barre drill #guitar #beginner #technique"), { title: "Barre drill", area: "guitar", level: "beginner", tags: ["technique"], unknown: [] });
    assert.deepEqual(readTitle("Do Mi Sol #Sing #VOICE"), { title: "Do Mi Sol", area: "voice", tags: ["sing"], unknown: [] });
    assert.deepEqual(readTitle("Hearing changes #ear #theory #multi-octave #intermediate"), { title: "Hearing changes", area: "theory", level: "intermediate", tags: ["ear", "multi-octave"], unknown: [] });
  });
  it("only trailing hashtags count, and a # before a digit is never a tag", () => {
    assert.deepEqual(readTitle("Play #1 then #2 #guitar"), { title: "Play #1 then #2", area: "guitar", tags: [], unknown: [] });
    assert.deepEqual(readTitle("Plain title"), { title: "Plain title", tags: [], unknown: [] });
    assert.deepEqual(readTitle("A #guitar drill"), { title: "A #guitar drill", tags: [], unknown: [] });
  });
  it("an unknown hashtag is listed and dropped; a title of hashtags alone keeps its first word", () => {
    assert.deepEqual(readTitle("Drill #foo"), { title: "Drill", tags: [], unknown: ["foo"] });
    assert.deepEqual(readTitle("#voice"), { title: "voice", area: "voice", tags: [], unknown: [] });
    assert.deepEqual(readTitle("#foo #bar"), { title: "foo", tags: [], unknown: ["foo", "bar"] });
  });
  it("a repeated tag counts once", () => {
    assert.deepEqual(readTitle("X #ear #ear").tags, ["ear"]);
  });
});

describe("hashtagLine", () => {
  it("writes area, level, then the kind tags; nothing for none", () => {
    assert.equal(hashtagLine({ area: "guitar", level: "beginner", tags: ["technique", "ear"] }), "#guitar #beginner #technique #ear");
    assert.equal(hashtagLine({ level: "new" }), "#new");
    assert.equal(hashtagLine({}), "");
  });
});

describe("review fixes", () => {
  it("a sharp chord at the end of a title is not a hashtag", () => {
    assert.deepEqual(readTitle("Change from E to C#m"), { title: "Change from E to C#m", tags: [], unknown: [] });
    assert.deepEqual(readTitle("Key of F#m #guitar"), { title: "Key of F#m", area: "guitar", tags: [], unknown: [] });
  });
});
