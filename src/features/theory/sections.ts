import type { IconName } from "@/components/Icon";

/** Every theory page, grouped the way the menu and the hub show them. One list feeds the mega menu, the hub and the breadcrumb. */
export type SectionGroup = "learn" | "explore" | "practice" | "tools";

export interface TheorySection {
  href: string;
  label: string;
  /** one short line under the label */
  desc: string;
  icon: IconName;
  group: SectionGroup;
}

export const GROUP_LABEL: Record<SectionGroup, string> = { learn: "Learn", explore: "Explore", practice: "Practice", tools: "Tools" };

export const THEORY_SECTIONS: TheorySection[] = [
  { group: "learn", href: "/theory", label: "Start here", desc: "The course: stages, tracks, songs", icon: "graduation-cap" },
  { group: "learn", href: "/theory/basics", label: "Guitar basics", desc: "Piano → guitar: notes and intervals", icon: "guitar" },
  { group: "explore", href: "/theory/chords", label: "Chords", desc: "Open chords and every movable shape", icon: "grid-3x3" },
  { group: "explore", href: "/theory/triads", label: "Triads", desc: "Three-note shapes on string sets", icon: "triangle" },
  { group: "explore", href: "/theory/scales", label: "Scales", desc: "Every mode, its chords and boxes", icon: "waves" },
  { group: "explore", href: "/theory/circle", label: "Circle of fifths", desc: "Keys, relatives, neighbours", icon: "circle-dot" },
  { group: "explore", href: "/theory/caged", label: "CAGED", desc: "One chord, five shapes up the neck", icon: "layers" },
  { group: "explore", href: "/theory/caged#neighbours", label: "Shape neighbours", desc: "I IV V ii vi without moving your hand", icon: "network" },
  { group: "explore", href: "/theory/arpeggios", label: "Arpeggios", desc: "Chord tones across the neck", icon: "spline" },
  { group: "practice", href: "/theory/notes", label: "Fretboard notes", desc: "Find the note, tap or play it", icon: "target" },
  { group: "practice", href: "/theory/ears", label: "Ear training", desc: "Name the interval you hear", icon: "ear" },
  { group: "practice", href: "/theory/improv", label: "Improv", desc: "Play over a groove", icon: "music" },
  { group: "practice", href: "/theory/drone", label: "Drone", desc: "Hear each degree against the root", icon: "audio-lines" },
  { group: "tools", href: "/theory/tunings", label: "Tunings", desc: "Alternate tunings", icon: "sliders-horizontal" },
  { group: "tools", href: "/cheatsheet", label: "Cheatsheet", desc: "Build your own reference sheet", icon: "file-text" },
];

/** The section a path belongs to: the longest matching href (hash links ignored). "/theory" only matches itself. */
export function sectionFor(path: string): TheorySection | undefined {
  if (path === "/theory") return THEORY_SECTIONS[0];
  return THEORY_SECTIONS.filter((s) => !s.href.includes("#") && s.href !== "/theory" && (path === s.href || path.startsWith(`${s.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
