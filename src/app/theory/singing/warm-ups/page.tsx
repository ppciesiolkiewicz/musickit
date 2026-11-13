import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AlsoTry from "@/components/theory/AlsoTry";
import Lesson from "@/components/theory/Lesson";
import WarmUpsApp from "@/components/theory/singing/WarmUpsApp";

export const metadata: Metadata = {
  title: "Voice Warm-ups: Lip Rolls and Easy Holds with the Mic · attunr",
  description: "Warm up your voice: lip roll a slide, a siren or one note after the tone, then hold an easy hum or “oo” low, in the middle and high while a ball on a hill shows your voice.",
  alternates: { canonical: "/theory/singing/warm-ups" },
};

export default function WarmUpsPage() {
  return (
    <PageShell
      active="/theory/singing/warm-ups"
      full
      related={<AlsoTry current="/theory/singing/warm-ups" />}
      devices mic
      title="Voice warm-ups"
      intro="Warm up before you sing. Start with lip rolls: listen to the tone, then lip roll the same slide back while the mic draws your line. Then hold an easy sound low, in the middle and high while a ball on a hill shows your voice."
    >
      <WarmUpsApp
        lead={<Lesson course="3/breath-and-holding-a-note" why="A lip roll and an easy hum let your voice move with almost no effort, so it is loose before you ask it for a tune." tryThis="Pick your voice first, so the notes sit where it is easy. Then do the lip rolls, and the hill from low to high." />}
      />
    </PageShell>
  );
}
