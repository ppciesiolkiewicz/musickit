import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PracticeTiles from "@/features/practice/PracticeTiles";

export const metadata: Metadata = { title: "Practice · attunr", robots: { index: false } };

export default function PracticePage() {
  return (
    <PageShell active="/practice" title="Practice" intro="Every tool and drill in attunr. Your Practice plan opens the ones each exercise needs. Here you can open any of them yourself.">
      <PracticeTiles />
    </PageShell>
  );
}
