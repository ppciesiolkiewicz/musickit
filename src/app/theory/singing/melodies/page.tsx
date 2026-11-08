import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SingingApp from "@/components/theory/singing/SingingApp";
import { parseSingingLink } from "@/features/theory/singingLink";

export const metadata: Metadata = {
  title: "Sing melodies · attunr",
  description: "Short tunes that end on Do, easiest first. Sing them back and watch your voice as a dot on the staff, with piano chords under each tune.",
};

export default async function SingMelodiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell
      active="/theory/singing/melodies"
      full
      devices
      title="Sing melodies"
      intro="A book of short tunes in your key, two bars or four, each ending on a long Do: Do and Re first, then Mi, Fa and Sol, skips, La and Ti, broken chords, and leaps last. Each is marked Easy to Expert by how it moves. Press play, sing along, and a dot shows your voice on the staff."
    >
      <SingingApp mode="melodies" initial={parseSingingLink(q)} />
    </PageShell>
  );
}
