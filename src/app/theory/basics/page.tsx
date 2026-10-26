import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import BasicsArticle from "@/components/theory/BasicsArticle";

export const metadata: Metadata = {
  title: "Guitar basics · attunr",
  description: "Strings, frets and note names, and every interval shown on a piano and then on the guitar: same string and across strings.",
};

export default async function BasicsPage({ searchParams }: { searchParams: Promise<{ interval?: string }> }) {
  const { interval } = await searchParams;
  const n = Number(interval);
  const initial = Number.isInteger(n) && n >= 1 && n <= 12 ? n : 7;
  return (
    <PageShell active="/theory/basics" title="Guitar basics" intro="If you know a little piano, or nothing at all: how the strings and frets map to notes, and what each interval looks like on a keyboard and on the neck.">
      <BasicsArticle initialInterval={initial} />
    </PageShell>
  );
}
