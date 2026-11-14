import type { Metadata } from "next";
import AutoplanHome, { PlayersEnding } from "@/components/landing/home/AutoplanHome";

/* The home page for players. Music schools have theirs at /. */

export const metadata: Metadata = {
  title: "Daily AI Guitar & Voice Practice Plan · attunr",
  description: "Answer a few questions and your own AI writes a week of short guitar or voice exercises, each with the diagram, drone or backing it needs. Every week builds on the last.",
  alternates: { canonical: "/players" },
};

export default function PlayersPage() {
  return <AutoplanHome audience="players" ending={<PlayersEnding />} />;
}
