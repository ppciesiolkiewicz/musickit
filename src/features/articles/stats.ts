import type { Article } from "./model";

/** Every line of text a reader reads in an article, block by block (a photo gives its caption; the player block's words are in its component). */
export function articleTexts(article: Article): string[] {
  return article.blocks.flatMap((b) =>
    b.type === "list" ? b.items : b.type === "exercise" ? [b.title, ...b.lines, ...(b.between ?? []), ...(b.after ?? [])] : b.type === "figure" ? [b.caption] : b.type === "player" || b.type === "row" || b.type === "labels" || b.type === "names" ? [] : [b.text],
  );
}

/** What a /learn card says about an article: how many exercises it has, and how long it takes to read if it has none. */
export function articleStats(article: Article): { exercises: number; minutes: number } {
  const exercises = article.blocks.filter((b) => b.type === "exercise").length;
  const words = articleTexts(article).join(" ").replace(/\]\([^)]*\)/g, " ").split(/\s+/).filter(Boolean).length;
  return { exercises, minutes: Math.max(1, Math.round(words / 200)) };
}
