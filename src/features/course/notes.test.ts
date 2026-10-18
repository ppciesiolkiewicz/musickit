import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PRESET_TAGS, compactMarks, makeCustomTag, parseCustomTags, parseNotesStore } from "./notes";

describe("notes store parsing", () => {
  it("missing or broken storage gives no notes", () => {
    assert.deepEqual(parseNotesStore(null), {});
    assert.deepEqual(parseNotesStore("{oops"), {});
    assert.deepEqual(parseNotesStore("[1,2]"), {});
  });
  it("keeps good fields and drops bad ones", () => {
    const s = parseNotesStore('{"1/chords":{"know":"solid","tags":["clicked"],"note":"x"},"1/triads":{"know":"bogus"}}');
    assert.equal(s["1/chords"].know, "solid");
    assert.deepEqual(s["1/chords"].tags, ["clicked"]);
    assert.equal(s["1/chords"].note, "x");
    assert.equal(s["1/triads"].know, undefined);
    assert.deepEqual(s["1/triads"].tags, []);
    assert.equal(s["1/triads"].note, "");
  });
  it("custom tags drop malformed entries", () => {
    assert.equal(parseCustomTags('[{"id":"c:x","text":"x"},{"nope":1}]').length, 1);
    assert.deepEqual(parseCustomTags("nope"), []);
  });
});

describe("custom tags", () => {
  it("blank input makes no tag", () => {
    assert.equal(makeCustomTag("   ", []), null);
  });
  it("a leading emoji is split from the words", () => {
    const t = makeCustomTag("🎯 Timing", [])!;
    assert.equal(t.emoji, "🎯");
    assert.equal(t.text, "Timing");
  });
  it("an emoji on its own is a tag", () => {
    const t = makeCustomTag("🎯", [])!;
    assert.equal(t.emoji, "🎯");
    assert.equal(t.text, "");
  });
  it("duplicates are refused, ignoring case", () => {
    assert.equal(makeCustomTag("timing", [{ id: "c:timing", text: "timing" }]), null);
    assert.equal(makeCustomTag("Timing", [{ id: "c:timing", text: "timing" }]), null);
    assert.equal(makeCustomTag("it clicked", PRESET_TAGS), null);
  });
  it("long text is cut to 24 characters", () => {
    assert.equal(makeCustomTag("a".repeat(40), [])!.text.length, 24);
  });
});

describe("preset tags and marks", () => {
  it("24 presets, unique ids, starting with it clicked", () => {
    assert.equal(PRESET_TAGS.length, 24);
    assert.equal(new Set(PRESET_TAGS.map((t) => t.id)).size, 24);
    assert.equal(PRESET_TAGS[0].emoji, "💡");
    assert.equal(PRESET_TAGS[0].text, "it clicked");
  });
  it("compact marks list know, like, keep-close, tags, then a note sign", () => {
    assert.deepEqual(compactMarks({ know: "getting", like: 4, often: true, warmup: true, tags: ["clicked"], note: "hi" }, PRESET_TAGS), ["🌿", "😍", "🔁", "🔥", "💡", "📝"]);
  });
  it("a custom tag without an emoji shows its first word", () => {
    assert.deepEqual(compactMarks({ tags: ["c:slow first"], note: "" }, [{ id: "c:slow first", text: "slow first" }]), ["slow"]);
  });
});
