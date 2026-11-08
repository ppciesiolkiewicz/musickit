import type { Metadata } from "next";
import SchoolsHome from "@/components/landing/home/SchoolsHome";

/* The home page, for music schools (the main product). Players have theirs at /players; the footer links between them. */

export const metadata: Metadata = {
  title: "attunr for music schools: guitar practice, lesson notes and online teaching",
  description: "Give guitar students a daily practice plan, your teachers playable lesson notes and diagrams, and online lessons that show what you mean. Under your school's name if you want it.",
};

export default function Home() {
  return <SchoolsHome />;
}
