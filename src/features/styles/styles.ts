/**
 * The music styles: one place for each style's settings. Colours live in `src/app/themes.css` and the landing look in
 * `src/app/landing-styles.css`, both keyed by `data-theme` on <html>; this file holds what code needs (names, photos, copy).
 */

export type StyleId = "funk" | "rock" | "blues" | "surf" | "metal" | "jazz" | "plain";

/** The landing page's photo slots (see `src/components/landing/Photo.tsx`). */
export const PHOTO_KEYS = ["teacherTablet", "teacher", "teacherSmile", "practising", "couch"] as const;
export type PhotoKey = (typeof PHOTO_KEYS)[number];

/** An Unsplash photo: `id` is the part after "photo-" in its images.unsplash.com address. No `by` means credit Unsplash alone. */
export type PhotoRef = { id: string; alt: string; by?: string; page?: string };

export type Style = {
  id: StyleId;
  label: string;
  emoji: string;
  /** its style course is coming sooner than the others */
  courseSoon: boolean;
  /** landing photos that differ from the defaults */
  photos: Partial<Record<PhotoKey, PhotoRef>>;
  /** the line between the hero and the story; Plain has none */
  divider: { text: string } | null;
};

export const STYLES: readonly Style[] = [
  {
    id: "funk", label: "Funk", emoji: "🕺", courseSoon: true, divider: { text: "on the one" },
    photos: {
      practising: { id: "1601148072347-4c63fe45bd33", alt: "A hand plucking a bass in warm yellow light" },
      couch: { id: "1602900332980-6e6f13946a3c", alt: "Fingers on the strings of a red electric bass" },
    },
  },
  {
    id: "rock", label: "Rock", emoji: "⚡", courseSoon: true, divider: { text: "turn it up to 11" },
    photos: {
      practising: { id: "1576416066728-3a83469793b4", alt: "A guitarist playing in orange stage smoke" },
      couch: { id: "1499424017184-418f6808abf9", alt: "A guitarist under a spotlight on stage", by: "bobby hendry", page: "https://unsplash.com/photos/man-playing-guitar-under-spotlight-MD3rdOB5pxk" },
    },
  },
  {
    id: "blues", label: "Blues", emoji: "🎷", courseSoon: true, divider: { text: "12 bars · I IV V" },
    photos: {
      practising: { id: "1510915361894-db8b60106cb1", alt: "Hands on a warm-lit acoustic guitar" },
      couch: { id: "1508186736123-44a5fcb36f9f", alt: "Close-up of a gold-top electric guitar's pickups" },
    },
  },
  {
    id: "surf", label: "Surf Rock", emoji: "🏄", courseSoon: true, divider: { text: "drenched in spring reverb" },
    photos: {
      practising: { id: "1562859921-84bf2f962ad1", alt: "A guitarist sitting on the sand between two surfboards" },
      couch: { id: "1616533719060-a7fc492e9299", alt: "An amp and a guitar on a wooden dock by the sea", by: "Sayla Brown", page: "https://unsplash.com/photos/brown-and-black-guitar-amplifier-on-brown-wooden-dock-during-daytime-H6j0Zsy91WY" },
    },
  },
  {
    id: "metal", label: "Metal", emoji: "🤘", courseSoon: false, divider: { text: "drop D" },
    photos: {
      practising: { id: "1515890326200-a07ce46010a1", alt: "A long-haired guitarist on a dark stage, in black and white" },
      couch: { id: "1751781529625-eb6329e52987", alt: "A guitarist headbanging, in black and white" },
    },
  },
  {
    id: "jazz", label: "Jazz", emoji: "🎺", courseSoon: false, divider: { text: "ii · V · I" },
    photos: {
      practising: { id: "1786207469194-56a839006771", alt: "A sunburst hollow-body guitar in a dim, warm room", by: "William Veitch", page: "https://unsplash.com/photos/hollow-body-electric-guitar-in-warm-light-xNoSLw36-lI" },
      couch: { id: "1536047852989-10896cf70749", alt: "A hollow-body guitar played in a dim club" },
    },
  },
  { id: "plain", label: "Plain", emoji: "🙂", courseSoon: false, divider: null, photos: {} },
];

export const DEFAULT_STYLE: StyleId = "funk";
export const THEME_KEY = "musickit.theme";
export const SEEN_KEY = "musickit.styleSeen";

export const isStyle = (v: unknown): v is StyleId => STYLES.some((s) => s.id === v);
export const resolveStyle = (saved: string | null): StyleId => (isStyle(saved) ? saved : DEFAULT_STYLE);
export const styleById = (id: StyleId): Style => STYLES.find((s) => s.id === id)!;

/** What the visitor has stored; blocked or missing storage reads as a first visit. */
export function readSaved(storage: Pick<Storage, "getItem"> | null): { style: StyleId; chosen: boolean; seen: boolean } {
  try {
    const saved = storage?.getItem(THEME_KEY) ?? null;
    return { style: resolveStyle(saved), chosen: isStyle(saved), seen: storage?.getItem(SEEN_KEY) === "1" };
  } catch {
    return { style: DEFAULT_STYLE, chosen: false, seen: false };
  }
}

/** Closing the first-visit picker without choosing ("Not now", click-away, Escape) settles on Plain. */
export const styleAfterIntroDismiss = (): StyleId => "plain";

export const courseNote = (id: StyleId): string | null => {
  const s = styleById(id);
  return s.courseSoon ? `${s.label} course: coming soon` : null;
};

/** The style's photo for a slot, or null to use the default. */
export const photoFor = (key: PhotoKey, id: StyleId): PhotoRef | null => styleById(id).photos[key] ?? null;
