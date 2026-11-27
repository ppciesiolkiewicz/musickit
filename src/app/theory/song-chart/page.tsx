import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ToolPresets from "@/features/practice/ToolPresets";

export const metadata: Metadata = {
  title: "Chord Charts: Play Chords Through a Verse and Chorus · attunr",
  description: "Play a chord chart through its verse and chorus while the backing track plays drums, bass and keys.",
  alternates: { canonical: "/theory/song-chart" },
};

export default function SongChartPage() {
  return (
    <PageShell active="/theory/song-chart" title="Chord charts" intro="Chords bar by bar, in sections like a verse and a chorus, in the order they come round. Play the chords along with the backing track, and keep your strumming hand going when a change comes late. Once a chart feels easy, try one with the chords hidden and find them by ear.">
      <ToolPresets
        type="song-chart"
        presets={[
          { label: "G, verse and chorus", props: { key: "g", bpm: 90, sections: [{ name: "Verse", bars: ["G", "G", "C", "G"] }, { name: "Chorus", bars: ["C", "D", "G", "Em"] }], form: ["Verse", "Verse", "Chorus", "Verse"], repeat: 2 } },
          { label: "A, rock", props: { key: "a", bpm: 80, style: "rock", sections: [{ name: "Verse", bars: ["A", "A", "D", "A"] }, { name: "Chorus", bars: ["D", "E", "A", "A"] }], parts: { drums: "always", bass: "on" } } },
          { label: "A minor, with a bridge", props: { key: "a", bpm: 100, sections: [{ name: "Verse", bars: ["Am", "F", "C", "G"] }, { name: "Chorus", bars: ["F", "G", "Am", "Am G"] }, { name: "Bridge", bars: ["Dm", "Am", "Dm", "E7"] }], form: ["Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus"], repeat: 1 } },
          { label: "A waltz in D", props: { key: "d", style: "waltz", sections: [{ name: "A", bars: ["D", "G", "A7", "D"] }, { name: "B", bars: ["G", "D", "A7", "D"] }], form: ["A", "A", "B", "A"] } },
          { label: "Chords hidden", props: { key: "c", bpm: 80, style: "ballad", sections: [{ name: "Verse", bars: ["C", "Am", "F", "G"] }, { name: "Chorus", bars: ["F", "G", "C", "C"] }], hide: true, parts: { drums: "on", bass: "on", keys: "always" } } },
        ]}
      />
    </PageShell>
  );
}
