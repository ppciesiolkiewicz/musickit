import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import ScalePage from "@/components/chordKit/ScalePage";
import { MODE_PAGES, findModePage } from "@/features/theory/scales";

type Params = { slug: string };
type Search = { key?: string };

export function generateStaticParams(): Params[] {
  return MODE_PAGES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = findModePage(slug);
  return page ? { title: `${page.name} · Music Kit`, description: `The ${page.name} mode in any key: relatives, every chord and its notes.` } : {};
}

export default async function Page({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const { key } = await searchParams;
  const page = findModePage(slug);
  if (!page) notFound();
  const parsed = Number(key);
  const initialKey = Number.isInteger(parsed) && parsed >= 0 && parsed < 12 ? parsed : 0;
  return (
    <PageShell active="/theory/scales" title="Scales and modes">
      <ScalePage familyIndex={page.familyIndex} modeIndex={page.modeIndex} initialKey={initialKey} />
    </PageShell>
  );
}
