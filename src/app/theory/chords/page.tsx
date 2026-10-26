import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import ChordKit from "@/components/chordKit/ChordKit";

export const metadata: Metadata = {
  title: "Chord explorer · attunr",
  description: "Movable guitar chord shapes, the chords of any key and mode, and progressions with neck positions.",
};

export default function ChordsPage() {
  return (
    <PageShell
      active="/theory/chords"
      title="Chord explorer"
      intro="Open chords and movable guitar shapes labelled by scale degree, the chords of any key and mode, and progressions with the shapes to use and every position on the neck. New to guitar? Start with the open chords: Em, Am, C, D, G, E, A, Dm."
    >
      <Lesson stage={1} why="Chords are the backbone of every song you will accompany. Open chords come first; movable shapes let one fingering play every key." tryThis="Search Em, then Am, and switch between them for one minute. Count the clean changes." />
      <ChordKit />
    </PageShell>
  );
}
