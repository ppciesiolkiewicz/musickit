import type { DemoLink } from "../model/kickstarter";
import { DEMO_PLANS } from "@/features/plan";
import { PRESET_INFO } from "@/features/teachers/notes";
import { SITE_URL } from "@/lib/site";

/*
 * Every page /admin/dev/kickstarter may point at, with its public address: an email or an ad goes to someone who can't open
 * localhost. Within a group the strongest is first. Pages never to link are LINKS_TO_AVOID in the model.
 */

const HUB: DemoLink = { group: "Lead with", label: "Demos", about: "every practice plan and note in one place, and where they can make a note of their own", url: `${SITE_URL}/demo` };

const plans = (about: string): DemoLink[] => Object.entries(DEMO_PLANS).map(([slug, d]) => ({ group: "Lead with", label: d.label, about, url: `${SITE_URL}/demo/${slug}` }));

const NOTES: DemoLink[] = Object.entries(PRESET_INFO).map(([slug, n]) => ({ group: "Lead with", label: n.title, about: `a teacher's lesson note: ${n.description}`, url: `${SITE_URL}/note/${slug}` }));

const TOOLS: DemoLink[] = [
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

/** What an email to a teacher or a school may link: the demos page, every demo plan and preset note, then the tools. */
export const TEACHER_DEMOS: DemoLink[] = [HUB, ...plans("a practice plan: a week of daily exercises"), ...NOTES, ...TOOLS];

/** What shows a student the offer: the demo plans (a week to look through; a student gets one day at a time), then the tools. No lesson notes: those are a teacher's. */
export const STUDENT_DEMOS: DemoLink[] = [...plans("a sample week of daily exercises, to try without signing up"), ...TOOLS];
