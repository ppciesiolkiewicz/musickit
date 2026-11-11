import DevShell from "@/features/devtools/DevShell";
import KickstarterPage from "@/features/devtools/kickstarter/KickstarterPage";
import type { DemoLink } from "@/features/devtools/model/kickstarter";
import { DEMO_PLANS } from "@/features/plan";
import { PRESET_INFO } from "@/features/teachers/studio";
import { SITE_URL } from "@/lib/site";

/** Every page an email may link, by group and strongest first, with its public address: an email goes to someone who can't open localhost. Pages never to link are LINKS_TO_AVOID in the model. */
const DEMOS: DemoLink[] = [
  { group: "Lead with", label: "Demos", about: "every practice plan and note in one place, and where they can create a note or a plan with their own AI chat", url: `${SITE_URL}/demo` },
  ...Object.entries(DEMO_PLANS).map(([slug, d]): DemoLink => ({ group: "Lead with", label: d.label, about: "a practice plan: a week of daily exercises", url: `${SITE_URL}/demo/${slug}` })),
  ...Object.entries(PRESET_INFO).map(([slug, n]): DemoLink => ({ group: "Lead with", label: n.title, about: `a teacher's lesson note: ${n.description}`, url: `${SITE_URL}/note/${slug}` })),
  { group: "For singers", label: "Singing runs", about: "stepwise runs across the singer's range, with the mic tracing their pitch on the staff", url: `${SITE_URL}/theory/singing/runs` },
  { group: "For singers", label: "Sing a scale", about: "sing a scale over a drone and see the voice trace each note on the staff", url: `${SITE_URL}/theory/singing` },
  { group: "For singers", label: "Sing a melody", about: "sing short melodies back over piano chords, with pitch shown live", url: `${SITE_URL}/theory/singing/melodies` },
  { group: "For singers", label: "Sing an interval", about: "see an interval by name, hear Do, sing the other note; the mic checks it", url: `${SITE_URL}/theory/singing/intervals` },
  { group: "For singers", label: "Farinelli breathing", about: "a guided breathing exercise: breathe in, hold and breathe out for the same count, one count longer each cycle, no mic needed", url: `${SITE_URL}/theory/singing/breathing` },
  { group: "For guitarists", label: "Backing tracks", about: "play along with drums, bass and chords in any key and style, and change the tempo while it plays", url: `${SITE_URL}/theory/backing` },
  { group: "For guitarists", label: "CAGED shapes", about: "the five CAGED shapes with their chords, arpeggios and pentatonics on the neck", url: `${SITE_URL}/theory/caged` },
  { group: "For guitarists", label: "Scales and modes", about: "any scale or mode in any key, position by position on the neck", url: `${SITE_URL}/theory/scales` },
  { group: "For guitarists", label: "Triads", about: "triads and their inversions on each set of three strings", url: `${SITE_URL}/theory/triads` },
  { group: "For guitarists", label: "Arpeggios", about: "arpeggio shapes laid over a scale across the neck", url: `${SITE_URL}/theory/arpeggios` },
  { group: "For any instrument", label: "Ear training", about: "name the interval or chord you hear, level by level", url: `${SITE_URL}/theory/ears` },
  { group: "For any instrument", label: "Rhythm trainer", about: "tap or strum in time and see how close each hit is to the beat", url: `${SITE_URL}/theory/rhythm` },
];

export default function Kickstarter() {
  return <DevShell><KickstarterPage demos={DEMOS} /></DevShell>;
}
