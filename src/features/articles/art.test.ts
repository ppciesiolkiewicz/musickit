import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { articleArt } from "./art";
import { ARTICLES } from "./index";

describe("article art", () => {
  it("names the light picture with -light", () => {
    assert.equal(articleArt("x"), "/images/learn/art/x.svg");
    assert.equal(articleArt("x", "light"), "/images/learn/art/x-light.svg");
  });
  it("has a picture for every article", () => {
    for (const a of ARTICLES) for (const tone of ["dark", "light"] as const)
      assert.ok(existsSync(new URL(`../../../public${articleArt(a.slug, tone)}`, import.meta.url)), `no ${tone} picture for ${a.slug}: run scripts/learn-art.mjs`);
  });
});
