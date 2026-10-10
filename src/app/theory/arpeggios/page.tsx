import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ArpeggiosExplorer from "@/components/chordKit/ArpeggiosExplorer";

export const metadata: Metadata = {
  title: "Arpeggios · Music Kit",
  description: "Arpeggios of any chord overlaid on any scale or mode, across the whole guitar neck.",
};

export default function ArpeggiosPage() {
  return (
    <PageShell labels
      active="/theory/arpeggios"
      title="Arpeggios over scales"
      intro="Pick any key and any of the 21 modes, choose an arpeggio (the scale's own chord or any other type), and see it on the whole neck with the scale behind it."
    >
      <ArpeggiosExplorer />
    </PageShell>
  );
}
