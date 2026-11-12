import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import AlsoTry from "@/components/theory/AlsoTry";
import Lesson from "@/components/theory/Lesson";
import SingingApp from "@/components/theory/singing/SingingApp";
import { parseSingingLink } from "@/features/theory/singingLink";
import { RUNS } from "@/features/theory/singingMelodies";
import { SINGING_TOUR } from "@/features/guide/tours/singing";

export const metadata: Metadata = {
  title: "Sing a Scale: Vocal Pitch Training with Live Visuals · attunr",
  description: "Sing vocal scales with real-time pitch detection. Watch your voice trace notes on the musical staff with an accompanying drone and metronome.",
  alternates: { canonical: "/theory/singing" },
};

export default async function SingingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const initial = parseSingingLink(q);
  // the melodies and the runs were tabs on this page once: a shared tune link opens on its own page now
  if (initial.melody !== null) redirect(`/theory/singing/${RUNS.some((t) => t.n === initial.melody) ? "runs" : "melodies"}?${q}`);
  return (
    <PageShell
      active="/theory/singing"
      pageId="singing"
      tour={SINGING_TOUR}
      full
      related={<AlsoTry current="/theory/singing" />}
      devices mic
      title="Sing a scale"
      intro="Sing a scale and watch your voice. Pick a key, a scale and your voice type, then tap a note to hear it or play the scale up and down on the beat. Switch the mic on and sing: a dot follows your voice over the scale on the staff."
    >
      <SingingApp
        mode="scales"
        initial={initial}
        lead={<Lesson course="3/solfege" why="Singing a scale is the fastest way to hear it: once your voice can find each degree, your fingers have a sound to aim for." tryThis="Play the scale once and listen, then play it again and sing along with the mic on. The rest at the top is your breath before the way down." />}
      />
    </PageShell>
  );
}
