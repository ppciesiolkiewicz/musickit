import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ToolPresets from "@/features/practice/ToolPresets";

export const metadata: Metadata = {
  title: "Read Notes on the Staff: Note Naming Game · attunr",
  description: "Name the note on the staff by letter, or sing or play it into the mic. Lines, spaces and ledger lines, treble and bass clef.",
  alternates: { canonical: "/theory/staff-reading" },
};

export default function StaffReadingPage() {
  return (
    <PageShell active="/theory/staff-reading" mic title="Read the staff" intro="A note appears on the staff, the five lines of music. Name it by its letter, or play or sing it with the mic on. Start with the lines, then add the spaces, and move on once the names come without thinking.">
      <ToolPresets
        type="staff-reading"
        presets={[
          { label: "The lines", props: { level: "new" } },
          { label: "The spaces", props: { level: "beginner" } },
          { label: "Lines and spaces", props: { notes: "staff" } },
          { label: "Ledger lines", props: { level: "intermediate" } },
          { label: "Every note", props: { level: "advanced" } },
          { label: "Bass clef", props: { level: "new", clef: "bass" } },
        ]}
      />
    </PageShell>
  );
}
