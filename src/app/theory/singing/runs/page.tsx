import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AlsoTry from "@/components/theory/AlsoTry";
import SingingApp from "@/components/theory/singing/SingingApp";
import { parseSingingLink } from "@/features/theory/singingLink";

export const metadata: Metadata = {
  title: "Vocal Agility Runs & Scale Drills with Mic Feedback · attunr",
  description: "Develop vocal agility with stepwise scale runs across your vocal range. Sing along with live pitch tracking and real-time vocal feedback on the staff.",
  alternates: { canonical: "/theory/singing/runs" },
};

export default async function SingRunsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell
      active="/theory/singing/runs"
      full
      devices mic
      title="Sing runs"
      intro="Warm up your voice with runs through your keys, so together they cover your whole range. A bar of chords sets each new key before you sing it. Press play, sing along, and a dot shows your voice on the staff."
    >
      <SingingApp mode="runs" initial={parseSingingLink(q)} />
      <AlsoTry group="singing" current="/theory/singing/runs" />
    </PageShell>
  );
}
