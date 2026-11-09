import type { Metadata } from "next";
import SchoolsHome from "@/components/landing/home/SchoolsHome";

/* The home page, for music schools (the main product). Players have theirs at /players; the footer links between them. */

export const metadata: Metadata = {
  title: "attunr for Music Schools: Guitar Practice, Notes & Teaching",
  description: "Give guitar students daily practice plans, teachers playable lesson notes and diagrams, and deliver branded online lessons under your music school's name.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <SchoolsHome />;
}
