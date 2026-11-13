import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import EarGame from "@/components/practice/EarGame";
import { parseEarSettings } from "@/lib/practice/earGame";
import { EARS_TOUR } from "@/features/guide/tours/ears";

export const metadata: Metadata = {
  title: "Ear training · attunr",
  description: "Name the interval or the chord you hear, level by level, with a song to remember each interval by.",
};

export default async function EarsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell active="/theory/ears" full devices pageId="ears" tour={EARS_TOUR} title="Ear training" intro="Train your ear to name what you hear. Try naming the gap between two notes, or the kind of chord. Stay on one level until it feels easy, then add the next. Every question starts on a new note, so you learn the sound, not the notes.">
      <EarGame initial={parseEarSettings(q)} />
    </PageShell>
  );
}
