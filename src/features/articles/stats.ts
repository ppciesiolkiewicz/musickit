import type { Article } from "./model";

/** What a /learn card says about an article: how many exercises it has, and how long it takes to read if it has none. */
export function articleStats(article: Article): { exercises: number; minutes: number } {
  const exercises = article.blocks.filter((b) => b.type === "exercise").length;
  const text = article.blocks.flatMap((b) =>
    b.type === "list" ? b.items : b.type === "exercise" ? [b.title, ...b.lines, ...(b.after ?? [])] : [b.text],
  );
  const words = text.join(" ").replace(/\]\([^)]*\)/g, " ").split(/\s+/).filter(Boolean).length;
  return { exercises, minutes: Math.max(1, Math.round(words / 200)) };
}
