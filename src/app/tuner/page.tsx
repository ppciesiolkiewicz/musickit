import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { Tuner } from "@/features/tuner";
import { TUNER_TOUR } from "@/features/guide/tours/tuner";

export const metadata: Metadata = {
  title: "Free Online Guitar Tuner & Instrument Tuner · attunr",
  description: "Accurate online chromatic tuner for guitar, bass, ukulele, and violin. Supports standard and alternate tunings with customizable A4 reference pitch.",
  alternates: { canonical: "/tuner" },
};

export default function TunerPage() {
  return (
    <PageShell active="/tuner" full pageId="tuner" tour={TUNER_TOUR} title="Tuner" intro="Tune your instrument. Pick an instrument and tuning (or Chromatic for any note), press Start and play one string. Tap a string below to hear its pitch.">
      <Tuner guide />
    </PageShell>
  );
}
