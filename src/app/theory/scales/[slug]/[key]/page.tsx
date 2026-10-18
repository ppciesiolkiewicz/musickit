import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import ScalePage from "@/components/chordKit/ScalePage";
import PentatonicPage from "@/components/chordKit/PentatonicPage";
import { MODE_PAGES, findModePage } from "@/features/theory/scales";
import { FAMILIES, makeKeyContext } from "@/features/theory/theory";
import { PENTATONICS, findPentatonic, pentatonicContext } from "@/features/theory/pentatonics";
import { keySlug, parseKeySlug, scaleHref } from "@/features/theory/keySlug";

type Params = { slug: string; key: string };

/** Every mode and pentatonic in every key is its own page, so each one can be found by search: /theory/scales/dorian/f-sharp */
export function generateStaticParams(): Params[] {
  return [...MODE_PAGES, ...PENTATONICS].flatMap((m) => Array.from({ length: 12 }, (_, pc) => ({ slug: m.slug, key: keySlug(pc) })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, key } = await params;
  const page = findModePage(slug);
  const pc = parseKeySlug(key);
  const pent = findPentatonic(slug);
  if (pent && pc !== null) {
    const p = pentatonicContext(pc, pent);
    return {
      title: `${p.title} scale: notes and guitar positions · Music Kit`,
      description: `${p.title}: ${p.names.join(" ")} (${p.formula.join(" ")}). ${pent.mood} Where it comes from, the scales with the same notes, and five positions on the guitar neck.`,
      alternates: { canonical: scaleHref(slug, pc) },
    };
  }
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
  const pent = findPentatonic(slug);
  const pc = parseKeySlug(key);
  if ((!page && !pent) || pc === null) notFound();
  // other spellings (C-sharp, c#, 1) land on the one canonical address
  if (key !== keySlug(pc)) permanentRedirect(scaleHref(slug, pc));
  return (
    <PageShell active="/theory/scales" title="Scales and modes" full>
      {page ? <ScalePage familyIndex={page.familyIndex} modeIndex={page.modeIndex} initialKey={pc} /> : <PentatonicPage slug={slug} initialKey={pc} />}
    </PageShell>
  );
}
