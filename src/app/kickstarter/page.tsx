import type { Metadata } from "next";
import FoundingHome from "@/components/landing/home/FoundingHome";
import { earlyTaken } from "@/features/account/server/earlyTaken";

/* The founding-partner page: the offer to the first teachers and schools. The outreach emails (/admin/dev/kickstarter) point here. */

const TITLE = "Founding partners: attunr for music teachers and schools";
const DESCRIPTION = "Become a founding partner of attunr: interactive lesson notes today, studio tools next. 50% off any teacher plan, locked in, with a 90-day 100% money-back guarantee.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/kickstarter" },
  openGraph: { type: "website", siteName: "attunr", url: "/kickstarter", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function Kickstarter() {
  const taken = await earlyTaken();
  return <FoundingHome joined={taken.schools} />;
}
