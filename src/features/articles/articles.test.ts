import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { parseTool } from "@/features/plan/model/tools";
import { ARTICLES } from "./index";
import { ARTICLE_VOICE_VERSION, type ArticleSeed } from "./model";
import { articleStats } from "./stats";

const seedOf = (slug: string): ArticleSeed => JSON.parse(readFileSync(new URL(`./seeds/${slug}.json`, import.meta.url), "utf8"));
const texts = (a: (typeof ARTICLES)[number]) =>
  a.blocks.flatMap((b) => (b.type === "list" ? b.items : b.type === "exercise" ? [b.title, ...b.lines, ...(b.after ?? [])] : [b.text]));

describe("articles", () => {
  it("have unique slugs and a seed file each, written to versions no newer than the documents", () => {
    assert.equal(new Set(ARTICLES.map((a) => a.slug)).size, ARTICLES.length);
    for (const a of ARTICLES) {
      const s = seedOf(a.slug);
      assert.equal(s.slug, a.slug);
      assert.ok(s.versions.teaching <= DOC_VERSIONS.teaching && s.versions.agents <= DOC_VERSIONS.agents && s.versions.voice <= ARTICLE_VOICE_VERSION, a.slug);
      assert.ok(!("voice" in s), `${a.slug}: the voice is in VOICE.md, not the seed file`);
    }
  });

  it("set up every tool the way the plan's parser accepts", () => {
    for (const a of ARTICLES) for (const b of a.blocks) if (b.type === "exercise") assert.ok(parseTool(b.tool), `${a.slug}: ${b.title}`);
  });

  it("keep descriptions short enough for a search result, and link only to pages that exist", () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const a of ARTICLES) {
      assert.ok(a.description.length <= 160, a.slug);
      for (const t of texts(a)) for (const [, href] of t.matchAll(/\]\((.+?)\)/g)) if (href.startsWith("/learn/")) assert.ok(slugs.has(href.slice(7)), href);
    }
  });

  it("count each article's exercises and reading minutes for its /learn card", () => {
    const stats = (slug: string) => articleStats(ARTICLES.find((a) => a.slug === slug)!);
    assert.equal(stats("pitch-matching-exercises").exercises, 6);
    assert.equal(stats("microphone-and-audio-interface-for-singing").exercises, 0);
    for (const a of ARTICLES) assert.ok(articleStats(a).minutes >= 1, a.slug);
  });

  it("VOICE.md's version is ARTICLE_VOICE_VERSION", () => {
    assert.equal(Number(/^version: (\d+)$/m.exec(readFileSync(new URL("./VOICE.md", import.meta.url), "utf8"))?.[1]), ARTICLE_VOICE_VERSION);
  });

  it("write practice, not practise", () => {
    for (const a of ARTICLES) for (const t of [a.title, a.intro, a.description, ...texts(a)]) assert.ok(!/practis/i.test(t), t);
  });
});
