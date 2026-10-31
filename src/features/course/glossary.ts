/**
 * Words a player may not know yet, each with a one-line meaning and the course article that explains it.
 * Text anywhere (an AI plan's sections, for one) is scanned with `explain()`, so the AI never has to mark them up.
 */
export interface Term {
  id: string;
  /** the word as shown in the note's heading */
  label: string;
  /** every spelling to find, singular; plurals (-s, -es) are added, spaces also match hyphens */
  forms: string[];
  short: string;
  href: string;
}

export const GLOSSARY: Term[] = [
  {
    id: "eighths", label: "Eighths", forms: ["eighth", "eighth note", "8th", "8th note"],
    short: "Two even notes or strums per beat, counted \"1 & 2 & 3 & 4 &\".",
    href: "/course/2/all-downstrums",
  },
  {
    id: "comp", label: "Comp", forms: ["comp", "comping", "comped"],
    short: "To play chords behind a soloist or singer: short, rhythmic, leaving them room.",
    href: "/course/11/comping",
  },
  {
    id: "guide-tones", label: "Guide tones", forms: ["guide tone"],
    short: "The 3rd and 7th of a chord: the two notes that say what it is and lead smoothly into the next chord.",
    href: "/course/11/guide-tones",
  },
  {
    id: "shell", label: "Shell voicing", forms: ["shell voicing", "shell chord"],
    short: "A chord played with only its root, 3rd and 7th.",
    href: "/course/11/shells",
  },
];

export type Piece = string | { text: string; term: Term };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = (form: string) => escape(form).split(/\s+/).join("[\\s-]+") + "(?:e?s)?";

/** Longest forms first, so "guide tones" wins over a shorter overlapping form. */
const ENTRIES = GLOSSARY.flatMap((term) => term.forms.map((form) => ({ form, term }))).sort((a, b) => b.form.length - a.form.length);
const RE = new RegExp(`(?<![\\w-])(?:${ENTRIES.map((e) => `(${pattern(e.form)})`).join("|")})(?![\\w-])`, "gi");

/**
 * Splits each text into plain strings and glossary terms. A term is marked once, at its first use across all the texts
 * (pass an exercise's texts together), so a paragraph isn't covered in icons.
 */
export function explain(texts: string[]): Piece[][] {
  const seen = new Set<string>();
  return texts.map((text) => {
    const out: Piece[] = [];
    let last = 0;
    for (const m of text.matchAll(RE)) {
      const term = ENTRIES[m.slice(1).findIndex((g) => g !== undefined)].term;
      if (seen.has(term.id)) continue;
      seen.add(term.id);
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push({ text: m[0], term });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  });
}
