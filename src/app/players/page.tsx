import type { Metadata } from "next";
import AutoplanHome, { PlayersEnding } from "@/components/landing/home/AutoplanHome";
import { publicPlans } from "@/features/account/server/publicPlans";

/* The home page for solo musicians: people who practise on their own. Music schools have theirs at /. The address stays /players. */

export const metadata: Metadata = {
  title: "Daily Guitar & Voice Practice Plan for Solo Musicians · attunr",
  description: "Answer a few questions and attunr puts together today's practice: short guitar or voice exercises for your level, each one something to play, sing or hear on the screen. Free while in beta.",
  alternates: { canonical: "/players" },
};

/** The Pricing section reads the plans table: the page is rebuilt at most once an hour, so a changed price shows within the hour. */
export const revalidate = 3600;

export default async function PlayersPage() {
  return <AutoplanHome audience="players" plans={await publicPlans()} ending={<PlayersEnding />} />;
}
