import type { Metadata } from "next";
import { shareMeta } from "@/app/_og/share";
import AutoplanHome, { SchoolsEnding } from "@/components/landing/home/AutoplanHome";
import { publicPlans } from "@/features/account/server/publicPlans";
import { paymentsEnabled } from "@/features/account/server/paymentsEnabled";

/* The home page for music schools. Solo musicians have theirs at /; a logged-in person is sent to /plan (src/proxy.ts). */

const TITLE = "attunr for music schools: a week of practice for every student";
const DESCRIPTION = "Each guitar and voice student gets a week of short practice exercises, put together from attunr's library to fit where they are, with the diagrams, drones and backing each exercise needs. Teachers steer each new week and send lesson notes as a link.";

export const metadata: Metadata = {
  title: "attunr for Music Schools: Weekly Practice Plans for Guitar & Voice",
  description: DESCRIPTION,
  alternates: { canonical: "/schools" },
  ...shareMeta({ path: "/schools", title: TITLE, description: DESCRIPTION }),
};

/** The Pricing section reads the plans table: the page is rebuilt at most once an hour, so a changed price shows within the hour. */
export const revalidate = 3600;

export default async function SchoolsPage() {
  return <AutoplanHome audience="schools" plans={await publicPlans()} payments={paymentsEnabled()} ending={<SchoolsEnding />} />;
}
