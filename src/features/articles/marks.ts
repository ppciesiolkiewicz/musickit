import { explain, type Piece } from "@/features/course/glossary";
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
  b.type === "p" || b.type === "care" ? [b.text] : b.type === "list" ? b.items : b.type === "exercise" ? [...b.lines, ...(b.after ?? [])] : [];

/**
 * Every line of an article as marked runs, per block (`[block][line]`, an exercise's `lines` then its `after`). The glossary
 * reads the whole article as plan text reads a block: each word marked once, at its first use. Links are left alone.
 */
export function markArticle(article: Article): Mark[][][] {
  const lines = article.blocks.map((b) => linesOf(b).map(runsOf));
  const texts = lines.flat(2).flatMap((r) => (r.kind === "link" ? [] : [r.text]));
  const pieces = explain(texts);
  let n = 0;
  return lines.map((block) => block.map((runs) => runs.map((r): Mark => (r.kind === "link" ? r : { kind: r.kind, pieces: pieces[n++] }))));
}
