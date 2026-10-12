import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import EarGame from "@/components/practice/EarGame";
import { parseEarSettings } from "@/lib/practice/earGame";

export const metadata: Metadata = {
  title: "Ear training · Music Kit",
  description: "Name the interval or the chord you hear, level by level, with a song to remember each interval by.",
};

export default async function EarsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell active="/theory/ears" title="Ear training" intro="Hear two notes and name the gap between them, or hear a chord and name its kind. Each level adds intervals; stay on one until it feels easy. Every question starts on a new random note, so you learn the sound of the gap, not the notes. Share the page address to give a student the same set-up.">
      <EarGame initial={parseEarSettings(q)} />
    </PageShell>
  );
}
