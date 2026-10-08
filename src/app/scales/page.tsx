import type { Metadata } from "next";
import PageShell from "@/components/chordKit/PageShell";
import ScalesIndex from "@/components/chordKit/ScalesIndex";

export const metadata: Metadata = {
  title: "Scales and modes · Music Kit",
  description: "All 21 modes side by side in any key: scale degrees, notes, step patterns, and relative major and minor.",
};

type Search = { key?: string };

export default async function ScalesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { key } = await searchParams;
  const parsed = Number(key);
  const initialKey = Number.isInteger(parsed) && parsed >= 0 && parsed < 12 ? parsed : 0;
  return (
    <PageShell
      active="/scales"
      title="Scales and modes"
      intro="All 21 modes in the key you choose, with every scale degree, the notes, and the relative major and minor. Open any mode to see its chords."
    >
      <ScalesIndex initialKey={initialKey} />
    </PageShell>
  );
}
