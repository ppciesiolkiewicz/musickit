import type { Metadata } from "next";
import AutoplanHome, { PlayersEnding } from "@/components/landing/home/AutoplanHome";
import { publicPlans } from "@/features/account/server/publicPlans";
import { paymentsEnabled } from "@/features/account/server/paymentsEnabled";

/** Payments are on (`STRIPE_ENABLED`), read on the server when the page is built: no beta line then. */
const PAYMENTS = paymentsEnabled();

/*
 * The home page, for solo musicians: people who practise on their own. Music schools have theirs at /schools; the old
 * /players address redirects here (next.config.ts). A logged-in person is sent to /plan (src/proxy.ts).
 */

const TITLE = "Daily Guitar & Voice Practice Plan for Solo Musicians · attunr";
const DESCRIPTION = `Answer a few questions and attunr puts together today's practice: short guitar or voice exercises for your level, each one something to play, sing or hear on the screen.${PAYMENTS ? "" : " Free while in beta."}`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "attunr", url: "/", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** The Pricing section reads the plans table: the page is rebuilt at most once an hour, so a changed price shows within the hour. */
export const revalidate = 3600;

export default async function Home() {
  return <AutoplanHome audience="players" plans={await publicPlans()} payments={paymentsEnabled()} ending={<PlayersEnding />} />;
}
