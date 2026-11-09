import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import ChordKit from "@/components/chordKit/ChordKit";
import { CHORDS_TOUR } from "@/features/guide/tours/chords";

export const metadata: Metadata = {
  title: "Guitar Chord Explorer: Movable Shapes & Progressions · attunr",
  description: "Explore guitar chords across the fretboard: open chords, movable shapes, diatonic chords for every key and mode, and common chord progressions.",
  alternates: { canonical: "/theory/chords" },
};

export default function ChordsPage() {
  return (
    <PageShell
      active="/theory/chords"
      pageId="chords"
      tour={CHORDS_TOUR}
      title="Chord explorer"
      intro="A chord is a few notes played together, and on guitar each one has a shape your fingers learn. Start with the open chords (Em, Am, C, D, G, E, A and Dm), which use open strings and are the easiest to play. When they feel comfortable, try the movable shapes, which you can slide up the neck to play the same chord in any key. You can also pick a key or a mode to see its chords, or a progression to see which shapes to play and where they sit on the neck."
    >
      <Lesson course="2/em-and-am" why="Chords are the backbone of every song you will accompany. Open chords come first; movable shapes let one fingering play every key." tryThis="Search Em, then Am, and switch between them for one minute. Count the clean changes." />
      <ChordKit />
    </PageShell>
  );
}
