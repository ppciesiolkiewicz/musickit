import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ImprovApp from "@/components/improv/ImprovApp";

export const metadata: Metadata = {
  title: "Improvisation · Music Kit",
  description: "Schillinger's rhythm interference and motive permutation as improvisation exercises, with practice games.",
};

export default function ImprovPage() {
  return (
    <PageShell active="/improv" title="Improvisation" intro="Ideas from Joseph Schillinger's system, turned into exercises and games for improvising.">
      <div className="max-w-4xl"><ImprovApp /></div>
    </PageShell>
  );
}
