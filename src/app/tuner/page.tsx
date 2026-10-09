import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Tuner from "@/features/tuner/Tuner";

export const metadata: Metadata = {
  title: "Tuner · Music Kit",
  description: "A chromatic guitar tuner that listens through your microphone.",
};

export default function TunerPage() {
  return (
    <PageShell active="/tuner" title="Tuner" intro="Press start, allow the microphone and play one string. Tap a string below to hear its pitch.">
      <Tuner />
    </PageShell>
  );
}
