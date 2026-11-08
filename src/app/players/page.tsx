import type { Metadata } from "next";
import CoachingHome from "@/components/landing/home/CoachingHome";

/* The home page for players: practice, the video course and private lessons. Music schools have theirs at /. */

export const metadata: Metadata = {
  title: "attunr: daily guitar practice for your hands, ears and timing",
  description: "Drills that build your own guitar senses (hands, ears, voice and timing) and teach you to make up exercises of your own, with an AI practice plan that gives you something new to practise every day. Plus a video course with a 30-day money-back guarantee.",
  alternates: { canonical: "/players" },
};

export default function PlayersPage() {
  return <CoachingHome />;
}
