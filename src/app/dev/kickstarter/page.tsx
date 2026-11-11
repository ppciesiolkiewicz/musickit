import DevShell from "@/features/devtools/DevShell";
import KickstarterPage from "@/features/devtools/kickstarter/KickstarterPage";
import type { DemoLink } from "@/features/devtools/model/kickstarter";
import { DEMO_PLANS } from "@/features/plan";
import { PRESET_INFO } from "@/features/teachers/studio";
import { SITE_URL } from "@/lib/site";

/** Every demo /demo lists, and the free tools worth showing, with their public address: an email goes to someone who can't open localhost. */
const DEMOS: DemoLink[] = [
  ...Object.entries(DEMO_PLANS).map(([slug, d]) => ({ label: d.label, about: "a practice plan: a week of daily exercises", url: `${SITE_URL}/demo/${slug}` })),
  ...Object.entries(PRESET_INFO).map(([slug, n]) => ({ label: n.title, about: `a teacher's lesson note: ${n.description}`, url: `${SITE_URL}/note/${slug}` })),
  { label: "Farinelli breathing", about: "a guided breathing exercise for singers: breathe in, hold and breathe out for the same count, one count longer each cycle, no mic needed", url: `${SITE_URL}/theory/singing/breathing` },
];

export default function Kickstarter() {
  return <DevShell><KickstarterPage demos={DEMOS} allDemosUrl={`${SITE_URL}/demo`} /></DevShell>;
}
