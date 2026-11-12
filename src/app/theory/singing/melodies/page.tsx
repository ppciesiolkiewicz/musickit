import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AlsoTry from "@/components/theory/AlsoTry";
import SingingApp from "@/components/theory/singing/SingingApp";
import { parseSingingLink } from "@/features/theory/singingLink";

export const metadata: Metadata = {
  title: "Vocal Melody Sight-Singing & Pitch Accuracy Trainer · attunr",
  description: "Practice sight-singing short melodic phrases. Sing tunes back with piano chord accompaniment and track your vocal pitch accuracy live on the staff.",
  alternates: { canonical: "/theory/singing/melodies" },
};

export default async function SingMelodiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell
      active="/theory/singing/melodies"
      full
      devices mic
      title="Sing melodies"
      intro="Sing short tunes in your key, each ending on a long Do. Start with Easy ones on Do and Re, then try skips, broken chords and leaps. Press play, sing along, and a dot shows your voice on the staff."
    >
      <SingingApp mode="melodies" initial={parseSingingLink(q)} />
      <AlsoTry group="singing" current="/theory/singing/melodies" />
    </PageShell>
  );
}
