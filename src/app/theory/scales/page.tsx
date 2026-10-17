import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import ScalesIndex from "@/components/chordKit/ScalesIndex";
import { keyOr } from "@/features/theory/keySlug";

export const metadata: Metadata = {
  title: "Scales and modes · Music Kit",
  description: "All 21 modes side by side in any key: scale degrees, notes, step patterns, and relative major and minor.",
};

type Search = { key?: string };

export default async function ScalesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { key } = await searchParams;
  const initialKey = keyOr(key);
  return (
    <PageShell
      active="/theory/scales"
      title="Scales and modes"
      intro="All 21 modes in the key you choose, with every scale degree, the notes, and the relative major and minor. Open any mode to see its chords."
    >
      <Lesson stage={2} why="Scales are the notes a melody and a solo are made from. Each mode is a mood; the pentatonic boxes are the easiest way in." tryThis="Pick A natural minor, play its first pentatonic box at the 5th fret over an Am chord, then try the Dorian page and hear the F♯ change the mood." />
      <ScalesIndex initialKey={initialKey} />
    </PageShell>
  );
}
