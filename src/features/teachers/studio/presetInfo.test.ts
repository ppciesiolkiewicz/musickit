import assert from "node:assert/strict";
import test from "node:test";
import { parseText } from "@/features/stage/model/subject";
import { noteHeader } from "./notes";
import { PRESET_INFO } from "./presetInfo";
import { PRESET_NOTES } from "./presetNotes";

test("each preset note opens with its title and line, the same ones its page's metadata uses", () => {
  assert.deepEqual(Object.keys(PRESET_NOTES).sort(), Object.keys(PRESET_INFO).sort());
  for (const [slug, { stage }] of Object.entries(PRESET_NOTES)) {
    const first = stage.layers.find((l) => l.id === stage.order?.[0])?.subject;
    assert.equal(first?.kind, "text", slug);
    assert.deepEqual(parseText(first.kind === "text" ? first.text : "")[0], { type: "title", text: PRESET_INFO[slug].title }, slug);
    const h = noteHeader(stage);
    assert.deepEqual([h.title, h.intro], [PRESET_INFO[slug].title, PRESET_INFO[slug].description], slug);
  }
});
