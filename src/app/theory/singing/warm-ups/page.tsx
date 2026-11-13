import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AlsoTry from "@/components/theory/AlsoTry";
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
      intro="Warm up before you sing, with two exercises. Start with the lip roll, then the hill. Pick one below: each has its own choices and its own instructions."
    >
      <WarmUpsApp />
    </PageShell>
  );
}
