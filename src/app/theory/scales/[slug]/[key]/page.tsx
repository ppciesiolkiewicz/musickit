import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import ScalePage from "@/components/chordKit/ScalePage";
import { MODE_PAGES, findModePage } from "@/features/theory/scales";
import { FAMILIES, makeKeyContext } from "@/features/theory/theory";
import { keySlug, parseKeySlug, scaleHref } from "@/features/theory/keySlug";

type Params = { slug: string; key: string };

/** Every mode in every key is its own page, so each one can be found by search: /theory/scales/dorian/f-sharp */
export function generateStaticParams(): Params[] {
  return MODE_PAGES.flatMap((m) => Array.from({ length: 12 }, (_, pc) => ({ slug: m.slug, key: keySlug(pc) })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, key } = await params;
  const page = findModePage(slug);
  const pc = parseKeySlug(key);
  if (!page || pc === null) return {};
  const ctx = makeKeyContext(pc, page.familyIndex, page.modeIndex);
  const info = FAMILIES[page.familyIndex].info[page.modeIndex];
  const name = `${ctx.names[0]} ${ctx.modeName}`;
  return {
    title: `${name} scale: notes, chords and guitar positions · Music Kit`,
    description: `${name}: ${ctx.names.join(" ")}. ${info.mood} Every chord in the key, its relative major and minor, and the scale on the guitar neck.`,
    alternates: { canonical: scaleHref(slug, pc) },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug, key } = await params;
  const page = findModePage(slug);
  const pc = parseKeySlug(key);
  if (!page || pc === null) notFound();
  // other spellings (C-sharp, c#, 1) land on the one canonical address
  if (key !== keySlug(pc)) permanentRedirect(scaleHref(slug, pc));
  return (
    <PageShell active="/theory/scales" title="Scales and modes" full>
      <ScalePage familyIndex={page.familyIndex} modeIndex={page.modeIndex} initialKey={pc} />
    </PageShell>
  );
}
