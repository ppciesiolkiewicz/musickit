import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import BasicsArticle from "@/components/theory/BasicsArticle";
import { BASICS_TOUR } from "@/features/guide/tours/basics";

export const metadata: Metadata = {
  title: "Guitar Basics: Fretboard, Notes & Musical Intervals · attunr",
  description: "Learn guitar fretboard fundamentals: open strings, frets, note names, and musical intervals mapped visually from the piano keyboard to the guitar neck.",
  alternates: { canonical: "/theory/basics" },
};

export default async function BasicsPage({ searchParams }: { searchParams: Promise<{ interval?: string }> }) {
  const { interval } = await searchParams;
  const n = Number(interval);
  const initial = Number.isInteger(n) && n >= 1 && n <= 12 ? n : 7;
  return (
    <PageShell active="/theory/basics" pageId="basics" tour={BASICS_TOUR} title="Guitar basics" intro="If you know a little piano, or nothing at all: how the strings and frets map to notes, and what each interval looks like on a keyboard and on the neck.">
      <BasicsArticle initialInterval={initial} />
    </PageShell>
  );
}
