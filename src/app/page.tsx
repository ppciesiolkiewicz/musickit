import type { Metadata } from "next";
import AutoplanHome, { SchoolsEnding } from "@/components/landing/home/AutoplanHome";

/* The home page, for music schools. Players have theirs at /players; a logged-in person is sent to /plan (src/proxy.ts). */

const TITLE = "attunr for music schools: a daily AI practice plan for every student";
const DESCRIPTION = "Each guitar and voice student gets a daily practice plan, put together from attunr's library of exercises, with the diagrams, drones and backing each exercise needs. Teachers send lesson notes as a link.";

export const metadata: Metadata = {
  title: "attunr for Music Schools: AI Practice Plans for Guitar & Voice",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "attunr", url: "/", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Home() {
  return <AutoplanHome audience="schools" ending={<SchoolsEnding />} />;
}
