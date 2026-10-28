import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import TuningsArticle from "@/components/theory/TuningsArticle";

export const metadata: Metadata = {
  title: "Tunings · attunr",
  description: "Reference pitch (A440, 442, 415, 432) and the standard and alternate tunings of guitar, bass, ukulele, violin, viola, cello, mandolin and banjo.",
};

export default function TuningsPage() {
  return (
    <PageShell
      active="/theory/tunings"
      title="Tunings"
      intro="How instruments are tuned: the A4 reference pitch, then the standard and alternate tunings of each instrument. Hear any tuning, or open the tuner on it."
    >
      <Lesson course="0-1/strings-and-tuning" why="Alternate tunings change which notes ring open, opening new chord voicings and drone-heavy sounds used in folk, rock and blues." tryThis="Try Drop D: lower the low E to D and play a D power chord with one finger across the bottom three strings." />
      <TuningsArticle />
    </PageShell>
  );
}
