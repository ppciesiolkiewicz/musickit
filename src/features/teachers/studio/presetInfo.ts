/** What the server needs to know of each preset note (`presetNotes.ts` holds the stage, which only the browser draws): its address, title and line. */
export const PRESET_INFO: Record<string, { title: string; description: string }> = {
  "minor-pentatonic": {
    title: "A minor pentatonic: play it, then sing it",
    description: "Five notes, on the neck and in your voice: a position to play, the chords and a band to play it over, then two melodies and a run to sing.",
  },
};

/** The preset note's title and line behind a slug, or null. */
export const presetInfo = (slug: string) => (Object.hasOwn(PRESET_INFO, slug) ? PRESET_INFO[slug] : null);

/** A preset opened in the notes creator, to change it: `/note/<slug>-editable`. */
const EDITABLE = "-editable";
export const editableSlug = (slug: string) => `${slug}${EDITABLE}`;
/** The preset an editable address names, or null when it is not one. */
export const editablePreset = (slug: string): string | null => (slug.endsWith(EDITABLE) && presetInfo(slug.slice(0, -EDITABLE.length)) ? slug.slice(0, -EDITABLE.length) : null);
