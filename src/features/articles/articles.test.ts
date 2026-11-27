import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { parseTool } from "@/features/plan/model/tools";
import { ARTICLES } from "./index";
import { articleJsonLd } from "./jsonLd";
import { markArticle, runsOf } from "./marks";
import { ARTICLE_VOICE_VERSION, type ArticleSeed } from "./model";
import { articleStats, articleTexts } from "./stats";

const seedOf = (slug: string): ArticleSeed => JSON.parse(readFileSync(new URL(`./seeds/${slug}.json`, import.meta.url), "utf8"));
const texts = articleTexts;

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
    for (const a of ARTICLES) for (const b of a.blocks) for (const t of b.type === "exercise" ? [b.tool, ...(b.beside ? [b.beside] : []), ...(b.parts ?? []).flatMap((p) => (p.tool ? [p.tool] : []))] : b.type === "row" ? b.tools : []) assert.ok(parseTool(t), `${a.slug}: ${b.type}`);
  });

  it("keep descriptions short enough for a search result, and link only to pages that exist", () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const a of ARTICLES) {
      assert.ok(a.description.length <= 160, a.slug);
      for (const t of texts(a)) for (const [, href] of t.matchAll(/\]\((.+?)\)/g)) if (href.startsWith("/learn/")) assert.ok(slugs.has(href.slice(7)), href);
    }
  });

  it("point every guide block at a guide that exists, never the article itself", () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const a of ARTICLES) for (const b of a.blocks) if (b.type === "guide") assert.ok(slugs.has(b.slug) && b.slug !== a.slug, `${a.slug}: ${b.slug}`);
  });

  it("count each article's exercises and reading minutes for its /learn card", () => {
    const stats = (slug: string) => articleStats(ARTICLES.find((a) => a.slug === slug)!);
    assert.equal(stats("pitch-matching-exercises").exercises, 6);
    assert.equal(stats("microphone-and-audio-interface-for-singing").exercises, 0);
    for (const a of ARTICLES) assert.ok(articleStats(a).minutes >= 1, a.slug);
  });

  it("tag every article with at least one topic, each once", () => {
    for (const a of ARTICLES) {
      assert.ok(a.topics.length > 0, a.slug);
      assert.equal(new Set(a.topics).size, a.topics.length, a.slug);
    }
  });

  it("VOICE.md's version is ARTICLE_VOICE_VERSION", () => {
    assert.equal(Number(/^version: (\d+)$/m.exec(readFileSync(new URL("./VOICE.md", import.meta.url), "utf8"))?.[1]), ARTICLE_VOICE_VERSION);
  });

  it("give search engines an Article and its breadcrumb, published by the site's organization", () => {
    for (const a of ARTICLES) {
      const [article, crumbs] = articleJsonLd(a, "https://x.test")["@graph"];
      assert.equal(article.headline, a.title);
      assert.equal(article.dateModified, a.updated);
      assert.equal(article.image, `https://x.test/learn/${a.slug}/opengraph-image`);
      assert.deepEqual(article.publisher, { "@id": "https://x.test/#organization" });
      assert.deepEqual(crumbs.itemListElement?.map((c) => c.item), ["https://x.test/", "https://x.test/learn", `https://x.test/learn/${a.slug}`]);
    }
  });

  it("mark each glossary word once per article, never inside a link, keeping every line's text", () => {
    for (const a of ARTICLES) {
      const marked = markArticle(a);
      const ids = marked.flat(3).flatMap((r) => (r.kind === "link" ? [] : r.pieces.flatMap((p) => (typeof p === "string" ? [] : [p.term.each ? `${p.term.id}:${p.text.toLowerCase()}` : p.term.id]))));
      assert.equal(new Set(ids).size, ids.length, a.slug);
      a.blocks.forEach((b, i) => {
        const lines = b.type === "p" || b.type === "care" ? [b.text] : b.type === "list" ? b.items : b.type === "exercise" ? [...b.lines, ...(b.between ?? []), ...(b.after ?? []), ...(b.parts ?? []).flatMap((p) => p.lines)] : [];
        lines.forEach((t, j) => assert.deepEqual(marked[i][j].map((r) => (r.kind === "link" ? r.text : r.pieces.map((p) => (typeof p === "string" ? p : p.text)).join(""))), runsOf(t).map((r) => r.text)));
      });
    }
    const words = (slug: string) => markArticle(ARTICLES.find((a) => a.slug === slug)!).flat(3).flatMap((r) => (r.kind === "link" ? [] : r.pieces.flatMap((p) => (typeof p === "string" ? [] : [p.term.id]))));
    for (const id of ["relative-pitch", "do", "degree", "interval", "drone", "solfege"]) assert.ok(words("scale-degree-feelings").includes(id), id);
  });

  it("write practice, not practise", () => {
    for (const a of ARTICLES) for (const t of [a.title, a.intro, a.description, ...texts(a)]) assert.ok(!/practis/i.test(t), t);
  });
});
