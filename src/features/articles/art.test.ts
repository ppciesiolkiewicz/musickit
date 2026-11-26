import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { articleArt } from "./art";
import { ARTICLES } from "./index";

describe("article art", () => {
  it("has a picture for every article", () => {
    for (const a of ARTICLES) assert.ok(existsSync(new URL(`../../../public${articleArt(a.slug)}`, import.meta.url)), `no picture for ${a.slug}: run scripts/learn-art.mjs`);
  });
});
