import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PlayAlongGenerator from "@/features/practice/PlayAlongGenerator";

export const metadata: Metadata = {
  title: "Guitar Play-Along: Intervals, Tunes and Arpeggios in Time · attunr",
  description: "Play intervals, short tunes and arpeggios as they scroll past, in time, with the mic listening.",
  alternates: { canonical: "/theory/play-along" },
};

export default function PlayAlongPage() {
  return (
    <PageShell active="/theory/play-along" mic title="Guitar play-along" intro="Notes scroll towards the line. Play each one as it reaches the line. Pick what to play, a level and a key, then press New exercise below for a new one.">
      <PlayAlongGenerator />
    </PageShell>
  );
}
