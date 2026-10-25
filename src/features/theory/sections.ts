import type { IconName } from "@/components/Icon";

/** Every theory page, grouped the way the menu and the hub show them. One list feeds the mega menu, the hub and the breadcrumb. */
export type SectionGroup = "learn" | "explore" | "practice" | "tools";

export interface TheorySection {
  href: string;
  label: string;
  /** one short line under the label */
  desc: string;
  icon: IconName;
  /** the page's own colour, so it is remembered by it: no two pages in a group share one */
  tone: Tone;
  group: SectionGroup;
}

/* the inner practice group is "Drills": the whole menu is called Practice */
export const GROUP_LABEL: Record<SectionGroup, string> = { learn: "Learn", explore: "Explore", practice: "Drills", tools: "Tools" };

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
  { group: "learn", href: "/theory", tone: "emerald", label: "Start here", desc: "The course: stages, tracks, songs", icon: "graduation-cap" },
  { group: "learn", href: "/theory/basics", tone: "teal", label: "Guitar basics", desc: "Piano → guitar: notes and intervals", icon: "guitar" },
  { group: "explore", href: "/theory/chords", tone: "sky", label: "Chords", desc: "Open chords and every movable shape", icon: "grid-3x3" },
  { group: "explore", href: "/theory/triads", tone: "violet", label: "Triads", desc: "Three-note shapes on string sets", icon: "triangle" },
  { group: "explore", href: "/theory/scales", tone: "emerald", label: "Scales", desc: "Every mode, its chords and boxes", icon: "waves" },
  { group: "explore", href: "/theory/circle", tone: "amber", label: "Circle of fifths", desc: "Keys, relatives, neighbours", icon: "circle-dot" },
  { group: "explore", href: "/theory/caged", tone: "rose", label: "CAGED", desc: "One chord, five shapes up the neck", icon: "layers" },
  { group: "explore", href: "/theory/caged#neighbours", tone: "pink", label: "Shape neighbours", desc: "I IV V ii vi without moving your hand", icon: "network" },
  { group: "explore", href: "/theory/arpeggios", tone: "red", label: "Arpeggios", desc: "Chord tones across the neck", icon: "spline" },
  { group: "practice", href: "/theory/notes", tone: "teal", label: "Fretboard notes", desc: "Find the note, tap or play it", icon: "target" },
  { group: "practice", href: "/theory/ears", tone: "pink", label: "Ear training", desc: "Name the interval you hear", icon: "ear" },
  { group: "practice", href: "/theory/improv", tone: "rose", label: "Improv", desc: "Play over a groove", icon: "music" },
  { group: "practice", href: "/theory/drone", tone: "violet", label: "Drone", desc: "Hear each degree against the root", icon: "audio-lines" },
  { group: "practice", href: "/theory/piano", tone: "sky", label: "Piano", desc: "Play and see notes, intervals and chords on the staff", icon: "piano" },
  { group: "practice", href: "/theory/singing", tone: "emerald", label: "Singing", desc: "Sing a scale and watch your voice on the staff", icon: "mic" },
  { group: "practice", href: "/theory/rhythm", tone: "amber", label: "Rhythm", desc: "Tap or strum on the beat", icon: "metronome" },
  { group: "tools", href: "/theory/tunings", tone: "amber", label: "Tunings", desc: "Alternate tunings", icon: "sliders-horizontal" },
  { group: "tools", href: "/cheatsheet", tone: "emerald", label: "Cheatsheet", desc: "Build your own reference sheet", icon: "file-text" },
  { group: "tools", href: "/looper", tone: "teal", label: "Looper", desc: "Record loops and stack takes over drums", icon: "repeat" },
];

/** The section a path belongs to: the longest matching href (hash links ignored). "/theory" only matches itself. */
export function sectionFor(path: string): TheorySection | undefined {
  if (path === "/theory") return THEORY_SECTIONS.find((s) => s.href === "/theory");
  return THEORY_SECTIONS.filter((s) => !s.href.includes("#") && s.href !== "/theory" && (path === s.href || path.startsWith(`${s.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
