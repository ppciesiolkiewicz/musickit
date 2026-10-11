import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import TuningsArticle from "@/components/theory/TuningsArticle";

export const metadata: Metadata = {
  title: "Tunings · Music Kit",
  description: "Reference pitch (A440, 442, 415, 432) and the standard and alternate tunings of guitar, bass, ukulele, violin, viola, cello, mandolin and banjo.",
};

export default function TuningsPage() {
  return (
    <PageShell
      active="/theory/tunings"
      title="Tunings"
      intro="How instruments are tuned: the A4 reference pitch, then the standard and alternate tunings of each instrument. Hear any tuning, or open the tuner on it."
    >
      <TuningsArticle />
    </PageShell>
  );
}
