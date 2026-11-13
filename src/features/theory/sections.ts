import type { IconName } from "@/components/Icon";

/** Every page the top nav lists, grouped by what you came to do: one top-nav menu per group. One list feeds the menus, the hub
 * and the breadcrumb. */
export type SectionGroup = "learn" | "guitar" | "singing" | "tools";

export interface TheorySection {
  href: string;
  label: string;
  /** one short line under the label */
  desc: string;
  icon: IconName;
  /** the page's own colour, so it is remembered by it: no two pages in one column share one */
  tone: Tone;
  group: SectionGroup;
  /** a column inside a big menu (Guitar splits into Explore and Practice) */
  sub?: string;
  /** other menu columns that list this page too, at their top (the AI plan heads Tools, the circle of fifths sits with the theory tools) */
  alsoIn?: { group: SectionGroup; sub?: string }[];
}

export const GROUP_LABEL: Record<SectionGroup, string> = { learn: "Learn", guitar: "Guitar", singing: "Singing", tools: "Tools" };

/** A hue every theme remaps (themes.css), so each page keeps its colour on light pages too. */
export type Tone = "emerald" | "sky" | "amber" | "violet" | "rose" | "teal" | "pink" | "red";

/** Full class names so Tailwind sees them. */
export const TONE: Record<Tone, { icon: string; chip: string }> = {
  emerald: { icon: "text-emerald-300", chip: "bg-emerald-500/15" },
  sky: { icon: "text-sky-300", chip: "bg-sky-500/15" },
  amber: { icon: "text-amber-300", chip: "bg-amber-500/15" },
  violet: { icon: "text-violet-300", chip: "bg-violet-500/15" },
  rose: { icon: "text-rose-300", chip: "bg-rose-500/15" },
  teal: { icon: "text-teal-300", chip: "bg-teal-500/15" },
  pink: { icon: "text-pink-300", chip: "bg-pink-500/15" },
  red: { icon: "text-red-300", chip: "bg-red-500/15" },
};

export const THEORY_SECTIONS: TheorySection[] = [
  { group: "learn", href: "/course", tone: "amber", label: "Course", desc: "Learn the neck one position at a time", icon: "graduation-cap" },
  { group: "learn", href: "/plan", tone: "violet", label: "AI practice plan", desc: "A continuous daily plan for your practice", icon: "sparkles", alsoIn: [{ group: "tools", sub: "Plan & notes" }] },
  { group: "learn", href: "/theory/circle", tone: "sky", label: "Circle of fifths", desc: "Keys, relatives, neighbours", icon: "circle-dot", alsoIn: [{ group: "tools", sub: "Tuning & theory" }] },
  { group: "guitar", sub: "Explore", href: "/theory/chords", tone: "sky", label: "Chords", desc: "Open chords and every movable shape", icon: "grid-3x3" },
  { group: "guitar", sub: "Explore", href: "/theory/triads", tone: "violet", label: "Triads", desc: "Three-note shapes on string sets", icon: "triangle" },
  { group: "guitar", sub: "Explore", href: "/theory/scales", tone: "emerald", label: "Scales", desc: "Every mode, its chords and boxes", icon: "waves" },
  { group: "guitar", sub: "Explore", href: "/theory/caged", tone: "rose", label: "CAGED", desc: "One chord, five shapes up the neck", icon: "layers" },
  { group: "guitar", sub: "Explore", href: "/theory/caged#neighbours", tone: "pink", label: "Shape neighbours", desc: "I IV V ii vi without moving your hand", icon: "network" },
  { group: "guitar", sub: "Explore", href: "/theory/arpeggios", tone: "red", label: "Arpeggios", desc: "Chord tones across the neck", icon: "spline" },
  { group: "guitar", sub: "Practice", href: "/theory/notes", tone: "teal", label: "Fretboard notes", desc: "Find the note, tap or play it", icon: "target" },
  { group: "guitar", sub: "Practice", href: "/theory/rhythm", tone: "amber", label: "Rhythm", desc: "Tap or strum on the beat", icon: "metronome" },
  { group: "singing", href: "/theory/singing", tone: "emerald", label: "Sing a scale", desc: "Sing a scale and watch your voice on the staff", icon: "mic" },
  { group: "singing", href: "/theory/singing/melodies", tone: "sky", label: "Sing melodies", desc: "Short tunes that end on Do, easiest first", icon: "music" },
  { group: "singing", href: "/theory/singing/runs", tone: "amber", label: "Sing runs", desc: "Warm-up runs across your whole voice", icon: "waves" },
  { group: "singing", href: "/theory/singing/breathing", tone: "teal", label: "Farinelli breathing", desc: "Breathe in, hold and out, one count longer each time", icon: "wind" },
  { group: "singing", href: "/theory/singing/intervals", tone: "violet", label: "Sing an interval", desc: "See its name, hear Do, sing the other note", icon: "target" },
  { group: "singing", href: "/theory/ears", tone: "pink", label: "Ear training", desc: "Name the interval you hear", icon: "ear" },
  { group: "singing", href: "/theory/tune-by-ear", tone: "red", label: "Tune by ear", desc: "Sing the open strings, hear a string out of tune", icon: "guitar", alsoIn: [{ group: "guitar", sub: "Practice" }] },
  { group: "tools", sub: "Plan & notes", href: "/teachers/studio?notes=1", tone: "emerald", label: "Notes creator", desc: "Build a page of notes and share it as a link", icon: "file-text" },
  { group: "tools", sub: "Tuning & theory", href: "/tuner", tone: "rose", label: "Tuner", desc: "Tune your guitar with the mic", icon: "gauge" },
  { group: "tools", sub: "Play along", href: "/theory/metronome-drone", tone: "violet", label: "Metronome & drone", desc: "Keep time to a click, hear each degree over a root", icon: "audio-lines" },
  { group: "tools", sub: "Play along", href: "/theory/backing", tone: "pink", label: "Backing tracks", desc: "Drums, bass and chords from a progression, any key and style", icon: "drum" },
  { group: "tools", sub: "Tuning & theory", href: "/theory/piano", tone: "red", label: "Piano", desc: "Play and see notes, intervals and chords on the staff", icon: "piano" },
  { group: "tools", sub: "Tuning & theory", href: "/theory/tunings", tone: "amber", label: "Tunings", desc: "Alternate tunings", icon: "sliders-horizontal" },
  { group: "tools", sub: "Play along", href: "/looper", tone: "teal", label: "Looper", desc: "Record loops and stack takes over drums", icon: "repeat" },
];

/** The pages a menu lists, in order: any page from another group it also lists (`alsoIn`, placed in that column), then its own. */
export function sectionsIn(group: SectionGroup): TheorySection[] {
  const borrowed = THEORY_SECTIONS.flatMap((s) => (s.alsoIn ?? []).filter((a) => a.group === group).map((a) => ({ ...s, group, sub: a.sub })));
  return [...borrowed, ...THEORY_SECTIONS.filter((s) => s.group === group)];
}

/** The section a path belongs to: the longest matching href (hash links ignored). */
export function sectionFor(path: string): TheorySection | undefined {
  return THEORY_SECTIONS.filter((s) => !s.href.includes("#") && (path === s.href || path.startsWith(`${s.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
