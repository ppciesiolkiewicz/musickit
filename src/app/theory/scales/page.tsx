import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import ScalesIndex from "@/components/chordKit/ScalesIndex";
import { keyOr } from "@/features/theory/keySlug";

export const metadata: Metadata = {
  title: "Scales and modes · attunr",
  description: "All 21 modes, six exotic scales (Persian, double harmonic, Hungarian minor and more) and nine pentatonic scales side by side in any key: scale degrees, notes, step patterns, and relative major and minor.",
};

type Search = { key?: string };

export default async function ScalesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { key } = await searchParams;
  const initialKey = keyOr(key);
  return (
    <PageShell
      active="/theory/scales"
      full
      devices
      title="Scales and modes"
      intro="All 21 modes, plus exotic scales like Persian and double harmonic and the pentatonic scales, in the key you choose, with every scale degree, the notes, and the relative major and minor. Open any mode to see its chords."
    >
      <Lesson course="5/pentatonic" why="Scales are the notes a melody and a solo are made from. Each mode is a mood; the pentatonic boxes are the easiest way in." tryThis="Pick A natural minor, play its first pentatonic box at the 5th fret over an Am chord, then try the Dorian page and hear the F♯ change the mood." />
      <ScalesIndex initialKey={initialKey} />
    </PageShell>
  );
}
