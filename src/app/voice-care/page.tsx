import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { A, LegalSections, type LegalSection } from "@/components/legal";

/*
 * Look after your voice: the safety notes for singing. Public, linked from the voice-care box on /account/setup and a
 * personal invite's setup (`features/account/ui/VoiceCare.tsx`), which opens it in a new tab so nothing typed is lost.
 * It is there to make people aware, not a contract: the terms say the same in "Your voice and your body".
 */

export const metadata: Metadata = {
  title: "Look after your voice · attunr",
  description: "How to sing without straining your voice: warm up, sing at an easy volume, and when to stop and see a doctor.",
  alternates: { canonical: "/voice-care" },
};

const SECTIONS: LegalSection[] = [
  {
    title: "Before you sing",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Warm up first with a gentle hum, starting low and quiet.</li>
        <li>Don&apos;t sing when you&apos;re hoarse, losing your voice or have a sore throat.</li>
      </ul>
    ),
  },
  {
    title: "While you sing",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Sing at an easy volume. Don&apos;t shout, push or reach for high notes.</li>
        <li>Take short breaks and sip water as you practice.</li>
      </ul>
    ),
  },
  {
    title: "When to stop",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Stop if it hurts, your throat feels tight or scratchy, or you feel dizzy or light-headed. Rest your voice until it passes.</li>
        <li>See a doctor if hoarseness or pain lasts more than two weeks, or your voice changes suddenly. If you have a voice or breathing condition, ask a doctor before you start.</li>
      </ul>
    ),
  },
];

export default function VoiceCarePage() {
  return (
    <PageShell active="/voice-care" column title="Look after your voice" intro="Singing doesn't need much force. A few habits keep your voice healthy while you practice.">
      <LegalSections sections={SECTIONS} about="your voice and the app" source="voice-care" />
      <p className="mt-6 max-w-3xl text-sm text-slate-400">The <A href="/terms#your-voice-and-your-body">terms of use</A> say the same.</p>
    </PageShell>
  );
}
