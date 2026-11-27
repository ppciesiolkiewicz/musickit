import { explain, type Piece } from "@/features/course/glossary";
import { parseKeySlug } from "@/features/theory/keySlug";
import type { NoteRoot } from "@/features/plan/model/noteText";
import type { Article, ArticleBlock } from "./model";

/** A run of article text: plain, `**bold**` or a `_care line_`, split into glossary pieces; or a `[label](href)` link, never marked. */
export type Mark = { kind: "text" | "bold" | "care"; pieces: Piece[] } | { kind: "link"; text: string; href: string };

/** The runs of one line of article text, in order, before the glossary marks them. */
export function runsOf(text: string): ({ kind: "text" | "bold" | "care"; text: string } | { kind: "link"; text: string; href: string })[] {
  const out: ReturnType<typeof runsOf> = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)|_(.+?)_/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1]) out.push({ kind: "bold", text: m[1] });
    else if (m[2]) out.push({ kind: "link", text: m[2], href: m[3] });
    else out.push({ kind: "care", text: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** The lines of a block the glossary reads: paragraphs, list items, care lines and an exercise's lines (not titles or headings). */
const linesOf = (b: ArticleBlock): string[] =>
  b.type === "p" || b.type === "care" || b.type === "guide" ? [b.text] : b.type === "list" ? b.items : b.type === "exercise" ? [...b.lines, ...(b.between ?? []), ...(b.after ?? []), ...(b.parts ?? []).flatMap((p) => p.lines)] : [];

/**
 * Every line of an article as marked runs, per block (`[block][line]`, an exercise's `lines`, its `between`, its `after`, then its `parts`' lines). The glossary
 * reads the whole article as plan text reads a block: each word marked once, at its first use. Links are left alone.
 */
export function markArticle(article: Article): Mark[][][] {
  const lines = article.blocks.map((b) => linesOf(b).map(runsOf));
  const texts = lines.flat(2).flatMap((r) => (r.kind === "link" ? [] : [r.text]));
  const pieces = explain(texts);
  let n = 0;
  return lines.map((block) => block.map((runs) => runs.map((r): Mark => (r.kind === "link" ? r : { kind: r.kind, pieces: pieces[n++] }))));
}

/**
 * A title (an exercise's or a part's) as glossary pieces. Each title is read on its own, so a word is explained in every
 * title it names ("Movable shapes" above each part), apart from the article's text, where it is marked once.
 */
export const markTitle = (title: string): Piece[] => explain([title])[0];

const keyOf = (b: ArticleBlock): number | null => {
  const tool = b.type === "exercise" ? b.tool : b.type === "row" ? b.tools[0] : null;
  return tool?.key != null ? parseKeySlug(String(tool.key)) : null;
};

/**
 * The root each block's `{{1}}` notes count from: its own tool's key, else its own `key`, else the next exercise's tool's,
 * else the last one before it (as plan text reads the tool after it). Null when no exercise has a key.
 */
export function blockRoots(article: Article): (NoteRoot | null)[] {
  const keys = article.blocks.map(keyOf);
  return keys.map((tool, i) => {
    const b = article.blocks[i];
    const own = tool ?? (b.type === "exercise" && b.key != null ? parseKeySlug(b.key) : null);
    const root = own ?? keys.slice(i + 1).find((k) => k !== null) ?? keys.slice(0, i).reverse().find((k) => k !== null) ?? null;
    return root === null ? null : { root };
  });
}
