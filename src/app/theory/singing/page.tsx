import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import SingingApp from "@/components/theory/singing/SingingApp";
import { parseSingingLink } from "@/features/theory/singingLink";
import { RUNS } from "@/features/theory/singingMelodies";

export const metadata: Metadata = {
  title: "Sing a scale · attunr",
  description: "Sing a scale and watch your voice as a dot on the staff, moving over the notes as you sing. Tap a note to hear it, play the scale on the beat, with a drone and a metronome to sing against.",
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
      full
      devices
      title="Sing a scale"
      intro="Pick a key, a scale and your voice type, tap a note to hear it or play the scale up and down on the beat, then switch the mic on and sing: a dot follows your voice over the scale on the staff, up and down with the pitch and along from one note to the next."
    >
      <SingingApp
        mode="scales"
        initial={initial}
        lead={<Lesson course="3/solfege" why="Singing a scale is the fastest way to hear it: once your voice can find each degree, your fingers have a sound to aim for." tryThis="Play the scale once and listen, then play it again and sing along with the mic on. The rest at the top is your breath before the way down." />}
      />
    </PageShell>
  );
}
