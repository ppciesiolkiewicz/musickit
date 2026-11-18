import DevShell from "@/features/devtools/DevShell";
import KickstarterNav from "@/features/devtools/kickstarter/KickstarterNav";
import StudentOfferPage from "@/features/devtools/kickstarter/StudentOfferPage";
import { STUDENT_DEMOS } from "@/features/devtools/kickstarter/demos";

/** /dev/kickstarter: the offer to students. The emails to teachers and schools are on /dev/kickstarter/teachers. */
export default function Kickstarter() {
  return <DevShell><KickstarterNav /><StudentOfferPage demos={STUDENT_DEMOS} /></DevShell>;
}
