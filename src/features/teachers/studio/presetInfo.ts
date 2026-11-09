/** What the server needs to know of each preset note (`presetNotes.ts` holds the stage, which only the browser draws): its address, title and line. */
export const PRESET_INFO: Record<string, { title: string; description: string }> = {
  "minor-pentatonic": {
    title: "A minor pentatonic in five minutes",
    description: "One page of notes: the five notes, the first box on the neck, all five boxes, and the chords that go under them.",
  },
};

/** The preset note's title and line behind a slug, or null. */
export const presetInfo = (slug: string) => (Object.hasOwn(PRESET_INFO, slug) ? PRESET_INFO[slug] : null);
