import { notFound, permanentRedirect } from "next/navigation";
import { findModePage } from "@/features/theory/scales";
import { findPentatonic } from "@/features/theory/pentatonics";
import { keyOr, scaleHref } from "@/features/theory/keySlug";

type Params = { slug: string };
type Search = { key?: string };

/** A mode without a key (or with an old ?key=4) moves to its address with the key in the path: /theory/scales/dorian/e */
export default async function Page({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const { key } = await searchParams;
  if (!findModePage(slug) && !findPentatonic(slug)) notFound();
  permanentRedirect(scaleHref(slug, keyOr(key)));
}
