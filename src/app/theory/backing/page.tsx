import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { BackingTrack } from "@/features/backing";

export const metadata: Metadata = {
  title: "Backing tracks · attunr",
  description: "Play along with a band: drums, bass and chords from a chord progression in any key, mode and style, from pop and blues to swing, bossa and modal vamps. Change the tempo while it plays.",
};

export default function BackingPage() {
  return (
    <PageShell active="/theory/backing" devices title="Backing tracks" intro="Pick a progression, a key and a style, and play over the band. Change the tempo while it plays; a new chord, key or style comes in on the next bar. Space plays and stops.">
      <BackingTrack />
    </PageShell>
  );
}
