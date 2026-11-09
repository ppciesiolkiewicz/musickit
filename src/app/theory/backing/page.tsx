import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { BackingTrack } from "@/features/backing";
import { BACKING_TOUR } from "@/features/guide/tours/backing";

export const metadata: Metadata = {
  title: "Backing tracks · attunr",
  description: "Play along with a band: drums, bass and chords from a chord progression in any key, mode and style, from pop and blues to swing, bossa and modal vamps. Change the tempo while it plays.",
};

export default function BackingPage() {
  return (
    <PageShell active="/theory/backing" devices pageId="backing" tour={BACKING_TOUR} title="Backing tracks" intro="Play along with a band. Pick a progression, a key and a style, then play a scale or a few chords over it, or make up a line. Change the tempo while it plays; a new chord, key or style comes in on the next bar. Space plays and stops.">
      <BackingTrack />
    </PageShell>
  );
}
