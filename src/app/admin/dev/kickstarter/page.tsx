import type { Metadata } from "next";
import { devTitle } from "@/features/devtools/registry";
import DevShell from "@/features/devtools/DevShell";
import KickstarterNav from "@/features/devtools/kickstarter/KickstarterNav";
import StudentOfferPage from "@/features/devtools/kickstarter/StudentOfferPage";
import { STUDENT_DEMOS } from "@/features/devtools/kickstarter/demos";

export const metadata: Metadata = { title: devTitle("/admin/dev/kickstarter", "Students") };

/** /admin/dev/kickstarter: the offer to students. The emails to teachers and schools are on /admin/dev/kickstarter/teachers. */
export default function Kickstarter() {
  return <DevShell><KickstarterNav /><StudentOfferPage demos={STUDENT_DEMOS} /></DevShell>;
}
