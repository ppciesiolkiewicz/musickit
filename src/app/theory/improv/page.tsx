import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import ImprovApp from "@/components/improv/ImprovApp";

export const metadata: Metadata = {
  title: "Improvisation · attunr",
  description: "Schillinger's rhythm interference and motive permutation as improvisation exercises, with practice games.",
};

export default function ImprovPage() {
  return (
    <PageShell active="/theory/improv" title="Improvisation" intro="Ideas from Joseph Schillinger's system, turned into exercises and games for improvising.">
      <Lesson course="1/soloing" why="Improvising turns scales into music. Small, repeatable ideas (a rhythm, a motif) work better than running up and down the scale." tryThis="Pick one game, play it over a groove for two minutes, and keep only three notes." />
      <div className="max-w-4xl"><ImprovApp /></div>
    </PageShell>
  );
}
