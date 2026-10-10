import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ChordKit from "@/components/chordKit/ChordKit";

export const metadata: Metadata = {
  title: "Chord explorer · Music Kit",
  description: "Movable guitar chord shapes, the chords of any key and mode, and progressions with neck positions.",
};

export default function ChordsPage() {
  return (
    <PageShell labels
      active="/theory/chords"
      title="Chord explorer"
      intro="Movable guitar shapes labelled by scale degree, the chords of any key and mode, and progressions with the shapes to use and every position on the neck."
    >
      <ChordKit />
    </PageShell>
  );
}
