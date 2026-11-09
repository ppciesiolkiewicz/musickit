import type { Metadata } from "next";
import SchoolsHome from "@/components/landing/home/SchoolsHome";

/* The home page, for music schools (the main product). Players have theirs at /players; the footer links between them. */

export const metadata: Metadata = {
  title: "attunr for Music Schools: Guitar Practice, Notes & Teaching",
  description: "Give guitar students daily practice plans, teachers playable lesson notes and diagrams, and deliver branded online lessons under your music school's name.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "attunr",
    url: "/",
    title: "attunr for music schools: guitar and voice practice between lessons",
    description: "Daily practice plans for students, playable lesson notes and diagrams for teachers, and a teaching studio for online lessons, under your school's name.",
  },
  twitter: {
    card: "summary_large_image",
    title: "attunr for music schools: guitar and voice practice between lessons",
    description: "Daily practice plans for students, playable lesson notes and diagrams for teachers, and a teaching studio for online lessons, under your school's name.",
  },
};

export default function Home() {
  return <SchoolsHome />;
}
