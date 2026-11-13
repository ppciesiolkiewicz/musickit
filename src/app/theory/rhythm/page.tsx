import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SettingsPanel, SettingsSection } from "@/components/ui";
import { VolumeRow } from "@/features/settings";
import { RhythmGame } from "@/features/rhythm";
import { RHYTHM_TOUR } from "@/features/guide/tours/rhythm";

export const metadata: Metadata = {
  title: "Rhythm Trainer & Timing Game: Tap or Strum in Time · attunr",
  description: "Improve your rhythm and timing precision: tap on the beat or strum into your microphone with millisecond timing accuracy and real-time visual feedback.",
  alternates: { canonical: "/theory/rhythm" },
};

export default function RhythmPage() {
  return (
    <PageShell active="/theory/rhythm" full devices mic pageId="rhythm" tour={RHYTHM_TOUR} title="Rhythm" intro="Hit a rhythm in time. Pick a rhythm and a tempo, press Start, and after a bar of count-in hit each note as it reaches the line: with Space, a tap, or by strumming your guitar. Start slow, then speed up.">
      {/* the tool keeps its own tempo, key and style: the panel holds the app's volume */}
      <SettingsPanel settings={<SettingsSection first><VolumeRow /></SettingsSection>}>
        <RhythmGame />
      </SettingsPanel>
    </PageShell>
  );
}
