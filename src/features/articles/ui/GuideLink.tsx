import Link from "next/link";
import { articleOf } from "../index";

/**
 * A link to a public article from a tool page, its title as the link text ("Free guide: The CAGED system on guitar: one chord,
 * five shapes →"), so a visitor and a search engine both see what it is about. Nothing for a slug that isn't an article.
 */
export default function GuideLink({ slug, className }: { slug: string; className?: string }) {
  const a = articleOf(slug);
  if (!a) return null;
  return <Link href={`/learn/${a.slug}`} className={className}>Free guide: {a.title} →</Link>;
}
