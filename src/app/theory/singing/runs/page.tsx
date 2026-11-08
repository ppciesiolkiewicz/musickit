import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SingingApp from "@/components/theory/singing/SingingApp";
import { parseSingingLink } from "@/features/theory/singingLink";

export const metadata: Metadata = {
  title: "Sing runs · attunr",
  description: "Scale runs that step up through keys across your whole voice. Sing along and watch your voice as a dot on the staff.",
};

export default async function SingRunsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell
      active="/theory/singing/runs"
      full
      devices
      title="Sing runs"
      intro="Warm-up runs that move through keys, so together they cover your whole voice. A bar of chords sets each new key before you sing it. Press play, sing along, and a dot shows your voice on the staff."
    >
      <SingingApp mode="runs" initial={parseSingingLink(q)} />
    </PageShell>
  );
}
