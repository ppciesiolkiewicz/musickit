import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ToolPresets from "@/features/practice/ToolPresets";

export const metadata: Metadata = {
  title: "Guitar Technique Drills: Fingers, Picking, Legato · attunr",
  description: "Finger patterns, alternate picking and hammer-on and pull-off trills to the metronome, from slow to fast.",
  alternates: { canonical: "/theory/drills" },
};

const LEVELS = ["new", "beginner", "intermediate", "advanced"] as const;
const NAME = { new: "New", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const levels = (extra: Record<string, unknown>) => LEVELS.map((level) => ({ label: NAME[level], props: { level, ...extra } }));

export default function DrillsPage() {
  return (
    <PageShell active="/theory/drills" full title="Technique drills" intro="Short drills for your hands, played to the metronome. Start slow enough to play every note clean, and raise the tempo once your fingers move without thinking.">
      <div className="flex flex-col gap-10">
        <ToolPresets heading="Finger patterns" type="finger-pattern" presets={levels({ bpm: 60 })} />
        <ToolPresets heading="Picking" type="picking-drill" presets={levels({ bpm: 70 })} />
        <ToolPresets heading="Hammer-ons and pull-offs" type="legato-trill" presets={levels({ string: 3, fret: 5, bpm: 70 })} />
      </div>
    </PageShell>
  );
}
