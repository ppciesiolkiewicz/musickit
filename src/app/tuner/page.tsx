import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { Tuner } from "@/features/tuner";
import TuneByEar from "@/components/tuner/TuneByEar";

export const metadata: Metadata = {
  title: "Tuner · attunr",
  description: "A tuner for guitar (with alternate tunings), bass, ukulele, violin or any note, with a choice of input and A4 reference pitch, and drills to tune by ear: sing the open strings, and hear whether a string is flat or sharp.",
};

export default function TunerPage() {
  return (
    <PageShell active="/tuner" title="Tuner" intro="Pick an instrument and tuning (or Chromatic for any note) and the input. Press start and play one string. Tap a string below to hear its pitch.">
      <Tuner />
      <TuneByEar />
    </PageShell>
  );
}
