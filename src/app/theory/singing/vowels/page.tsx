import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ToolPresets from "@/features/practice/ToolPresets";

export const metadata: Metadata = {
  title: "Vowels for Singers: Hold Each Vowel on One Note · attunr",
  description: "Sing ah, eh, ee, oh and oo on a held note with the mic on, and keep each vowel steady as you climb towards your break.",
  alternates: { canonical: "/theory/singing/vowels" },
};

export default function VowelsPage() {
  return (
    <PageShell active="/theory/singing/vowels" full mic title="Vowels" intro="Hold one note and change the vowel on it, with the mic on. The drawn mouth shows the shape for each vowel. Start on one easy note, and climb only once each vowel stays on the note.">
      <ToolPresets
        type="vowel-guide"
        presets={[
          { label: "Beginner", props: { level: "beginner" } },
          { label: "Intermediate", props: { level: "intermediate" } },
          { label: "Advanced", props: { level: "advanced" } },
          { label: "ee and oo", props: { climb: "to-break", vowels: ["ee", "oo"], seconds: 2 } },
        ]}
      />
    </PageShell>
  );
}
