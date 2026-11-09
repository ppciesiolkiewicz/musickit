import type { Metadata } from "next";
import CoachingHome from "@/components/landing/home/CoachingHome";

/* The home page for players: practice, the video course and private lessons. Music schools have theirs at /. */

export const metadata: Metadata = {
  title: "Daily Guitar Practice: Drills for Hands, Ears & Timing · attunr",
  description: "Build essential guitar senses with interactive drills for hands, ears, voice, and timing. Get a daily AI practice plan and master the fretboard step-by-step.",
  alternates: { canonical: "/players" },
};

export default function PlayersPage() {
  return <CoachingHome />;
}
