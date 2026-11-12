/** What the server needs to know of each preset note (`presetNotes.ts` holds the stage, which only the browser draws): its address, title and line. */
export const PRESET_INFO: Record<string, { title: string; description: string }> = {
  "minor-pentatonic": {
    title: "A minor pentatonic: play it, then sing it",
    description: "Find the five notes of A minor pentatonic in position 1, play them over a band, then sing the same notes.",
  },
  "three-chords-in-g": {
    title: "G, C and D: three chords, one band",
    description: "Learn the G, C and D chords, change between them in time, then play them with a band.",
  },
};

/** The preset note's title and line behind a slug, or null. */
export const presetInfo = (slug: string) => (Object.hasOwn(PRESET_INFO, slug) ? PRESET_INFO[slug] : null);
