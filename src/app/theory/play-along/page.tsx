import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ToolPresets from "@/features/practice/ToolPresets";

export const metadata: Metadata = {
  title: "Guitar Play-Along: Intervals, Tunes and Arpeggios in Time · attunr",
  description: "Play intervals, short tunes and arpeggios as they scroll past, in time, with the mic listening.",
  alternates: { canonical: "/theory/play-along" },
};

export default function PlayAlongPage() {
  return (
    <PageShell active="/theory/play-along" full mic title="Guitar play-along" intro="Notes scroll towards the line. Play each one as it reaches the line. Start with octaves, where both notes have the same name, then try 5ths, a tune and an arpeggio.">
      <ToolPresets
        type="guitar-play-along"
        presets={[
          { label: "Octaves of G", props: { shape: { shape: "interval", key: "g", intervals: ["octave"], strings: "64", direction: "up", to: 7 }, bpm: 60 } },
          { label: "5ths in C", props: { shape: { shape: "interval", key: "c", intervals: ["5th"], strings: "54", direction: "down", to: 7 }, bpm: 60 } },
          { label: "3rds on the G string", props: { shape: { shape: "interval", key: "g", intervals: ["3rd"], strings: "33", to: 7 }, bpm: 60 } },
          { label: "A tune in G", props: { shape: { shape: "melody", tune: 100, key: "g", octave: 1 }, bpm: 60 } },
          { label: "C Am F G arpeggios", props: { shape: { shape: "arpeggio-part", chords: ["C", "Am", "F", "G"], degrees: ["1", "3"], bars: 4 }, bpm: 80 } },
        ]}
      />
    </PageShell>
  );
}
