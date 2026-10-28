import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchEntries, searchFor } from "./searchIndex";

const entries = searchEntries();

describe("spotlight search", () => {
  it("lists the pages for an empty query", () => {
    const r = searchFor(entries, "  ");
    assert.ok(r.length > 10);
    assert.ok(r.every((e) => e.group === "Pages"));
  });

  it("puts a label that starts with the query first", () => {
    assert.equal(searchFor(entries, "tun")[0].href, "/tuner");
  });

  it("finds scales by name and alias, ignoring accents", () => {
    assert.ok(searchFor(entries, "dorian").some((e) => e.href.startsWith("/theory/scales/dorian/")));
    assert.ok(searchFor(entries, "egyptian").some((e) => e.href.includes("suspended-pentatonic")));
    assert.ok(searchFor(entries, "hirajoshi").some((e) => e.href.includes("hirajoshi")));
  });

  it("needs every word to match", () => {
    assert.deepEqual(searchFor(entries, "tuner zzzz"), []);
  });

  it("includes every course section", () => {
    assert.ok(entries.filter((e) => e.group === "Course").length > 0);
  });
});
