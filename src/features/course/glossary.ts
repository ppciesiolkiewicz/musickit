/**
 * Words a player may not know yet, each with a one-line meaning and the course article that explains it.
 * Text anywhere (an AI plan's sections, for one) is scanned with `explain()`, so the AI never has to mark them up.
 */
export interface Term {
  id: string;
  /** the word as shown in the note's heading */
  label: string;
  /** every spelling to find, the first being the name the AI prompt uses; plurals (-s, -es) are added, spaces also match hyphens */
  forms: string[];
  short: string;
  href: string;
}

export const GLOSSARY: Term[] = [
  { id: "scale", label: "Scale", forms: ["scale"], short: "A set of notes in order from a root, that melodies and solos are built from.", href: "/course/3/do-re-mi" },
  { id: "chord", label: "Chord", forms: ["chord"], short: "Three or more notes played together.", href: "/course/2/what-is-a-chord" },
  { id: "interval", label: "Interval", forms: ["interval"], short: "The distance between two notes, named by counting the letter names from one to the other: C to E is a 3rd.", href: "/course/3/intervals" },
  { id: "solfege", label: "Solfège", forms: ["solfège", "solfege"], short: "Do, Re, Mi, Fa, Sol, La, Ti: names for the notes of a key. Do is always home, so the names work in any key.", href: "/course/3/solfege" },
  { id: "on-the-note-names", label: "On the note names", forms: ["on the note names"], short: "Sing each note's name as its word: Do, Re, Mi. The names help you remember how each note sounds.", href: "/course/3/solfege" },
  { id: "sing-on", label: "Sing it on a sound", forms: ['on "ah"', 'on "oo"', 'on "ee"', 'on "la"'], short: "Sing every note on this one sound, with no words, so you hear only the pitch. \"oo\" and \"ee\" are the easiest on high notes.", href: "/course/3/matching-a-pitch" },
  { id: "high-notes", label: "Reaching for high notes", forms: ["reach for high notes", "reach for a high note", "reaching for high notes", "reaching for a high note"], short: "Pushing your voice up to a note that feels tight. Stop below that note and sing where your voice feels easy: your range grows from there.", href: "/course/9/stretching-your-range" },
  { id: "staff", label: "Staff", forms: ["staff"], short: "The five lines music is written on: a note sits higher on it the higher it sounds. While you sing, your pitch shows on it as a line.", href: "/course/3/staff" },
  { id: "tab", label: "Tab", forms: ["tab", "tablature"], short: "Guitar notation: six lines for the strings, low E at the bottom, and a number on a line for the fret to press. 0 means the open string.", href: "/course/1/tab-and-chord-boxes" },
  { id: "chord-box", label: "Chord box", forms: ["chord box", "chord diagram"], short: "A diagram of a chord on the neck: the lines are strings and frets, each dot is where a finger presses, O plays a string open and X leaves it out.", href: "/course/1/tab-and-chord-boxes" },
  { id: "eighths", label: "Eighths", forms: ["eighths", "eighth", "eighth note", "8th", "8th note"], short: "Two even notes or strums per beat, counted \"1 & 2 & 3 & 4 &\".", href: "/course/2/all-downstrums" },
  { id: "sixteenths", label: "Sixteenths", forms: ["sixteenths", "sixteenth", "sixteenth note", "16th", "16th note"], short: "Four even notes or strums per beat, counted \"1 e & a\".", href: "/course/2/sixteenths" },
  { id: "home-note", label: "Home note", forms: ["home note", "tonic"], short: "The note a key is named after (Do), where melodies sound finished.", href: "/course/3/home-note" },
  { id: "drone", label: "Drone", forms: ["drone"], short: "One note held underneath, so you hear how every other note sits against it.", href: "/course/3/home-note" },
  { id: "degree", label: "Degree", forms: ["scale degree", "degree"], short: "A note's number in the scale, counted from the home note: 1, 2, 3 up to 7.", href: "/course/3/do-re-mi" },
  { id: "octave", label: "Octave", forms: ["octave"], short: "The same note name, higher or lower: 12 frets apart on one string.", href: "/course/3/intervals" },
  { id: "half-step", label: "Half step", forms: ["half step", "semitone"], short: "The smallest step: one fret, or one piano key to the next, black or white.", href: "/course/3/intervals" },
  { id: "whole-step", label: "Whole step", forms: ["whole step", "whole tone"], short: "Two half steps: two frets apart.", href: "/course/3/intervals" },
  { id: "step", label: "Step", forms: ["step"], short: "A move to the very next note of the scale, up or down: Do to Re, or Mi to Fa.", href: "/course/3/step-melodies" },
  { id: "skip", label: "Skip", forms: ["skip"], short: "A move that jumps over one note of the scale: Do to Mi, or Re to Fa. A skip is a 3rd.", href: "/course/3/do-mi-sol" },
  { id: "leap", label: "Leap", forms: ["leap", "leaping"], short: "A jump bigger than a skip, such as Do up to Fa, Sol or the high Do. Hear the landing note before you sing it.", href: "/course/6/singing-leaps" },
  { id: "key", label: "Key", forms: ["key"], short: "The notes a piece uses, named after its home note: in G major, G is Do and the scale starts there.", href: "/course/3/do-re-mi" },
  { id: "major", label: "Major", forms: ["major"], short: "The bright sound: a scale or chord with a major 3rd, four frets, above the root.", href: "/course/3/major-or-minor" },
  { id: "minor", label: "Minor", forms: ["minor"], short: "The darker sound: a scale or chord with a minor 3rd, three frets, above the root.", href: "/course/3/major-or-minor" },
  { id: "pitch", label: "Pitch", forms: ["pitch"], short: "How high or low a note sounds.", href: "/course/3/matching-a-pitch" },
  { id: "tempo", label: "Tempo", forms: ["tempo", "bpm"], short: "How fast the beat goes, counted in beats per minute (bpm).", href: "/course/1/steady-beat" },
  { id: "count-in", label: "Count-in", forms: ["count-in"], short: "A bar of clicks before the music starts, so you come in on beat 1.", href: "/course/1/steady-beat" },
  { id: "strum", label: "Strum", forms: ["strum", "strumming", "strummed"], short: "Brushing the pick or your fingers across the strings, down or up, so they ring together.", href: "/course/2/all-downstrums" },
  { id: "phrase", label: "Phrase", forms: ["phrase"], short: "A short line of notes, like a sentence, with a gap after it. The note it ends on sets its mood.", href: "/course/5/soloing" },
  { id: "bend", label: "Bend", forms: ["bend", "bending"], short: "Pushing the string across the fret so the note rises, a half step or a whole step.", href: "/course/5/bends-and-slides" },
  { id: "slide", label: "Slide", forms: ["slide", "sliding"], short: "Gliding from one note to another without lifting: a finger along the string, or your voice through every pitch on the way.", href: "/course/5/bends-and-slides" },
  { id: "trill", label: "Trill", forms: ["trill"], short: "Fast hammer-ons and pull-offs between two notes, over and over.", href: "/course/4/legato" },
  { id: "root", label: "Root", forms: ["root"], short: "The note a chord or scale is built on and named after.", href: "/course/2/what-is-a-chord" },
  { id: "beat", label: "Beat", forms: ["beat"], short: "The steady pulse you tap your foot to.", href: "/course/1/steady-beat" },
  { id: "bar", label: "Bar", forms: ["bar"], short: "A group of beats, usually four, counted \"1 2 3 4\" and then again.", href: "/course/1/steady-beat" },
  { id: "spider", label: "Spider", forms: ["spider"], short: "A finger drill: one finger per fret, walking across all six strings.", href: "/course/1/spider" },
  { id: "alternate-picking", label: "Alternate picking", forms: ["alternate picking"], short: "Picking down, up, down, up, never two the same way in a row.", href: "/course/1/spider" },
  { id: "hammer-on", label: "Hammer-on", forms: ["hammer-on"], short: "Sounding a higher note by tapping a finger down on the string, without picking.", href: "/course/4/legato" },
  { id: "pull-off", label: "Pull-off", forms: ["pull-off"], short: "Sounding a lower note by flicking a finger off the string, without picking.", href: "/course/4/legato" },
  { id: "legato", label: "Legato", forms: ["legato"], short: "Smooth and connected: notes joined by hammer-ons, pull-offs and slides rather than picked.", href: "/course/4/legato" },
  { id: "triad", label: "Triad", forms: ["triad"], short: "A three-note chord: root, 3rd and 5th.", href: "/course/5/triads" },
  { id: "double-stop", label: "Double stop", forms: ["double stop"], short: "Two notes played together, often a 5th or a 3rd apart.", href: "/course/5/fifths" },
  { id: "power-chord", label: "Power chord", forms: ["power chord"], short: "Root and 5th only: neither major nor minor, the sound of rock.", href: "/course/5/power-chords" },
  { id: "arpeggio", label: "Arpeggio", forms: ["arpeggio"], short: "A chord's notes played one at a time.", href: "/course/5/arpeggios" },
  { id: "chord-tones", label: "Chord tones", forms: ["chord tone"], short: "The notes that make up a chord: root, 3rd, 5th, and the 7th if it has one.", href: "/course/5/arpeggios" },
  { id: "circle-of-fifths", label: "Circle of fifths", forms: ["circle of fifths", "circle of 5ths"], short: "The twelve keys in a ring, each a 5th from the next; neighbours share most of their notes.", href: "/course/5/one-four-five" },
  { id: "pentatonic", label: "Pentatonic", forms: ["pentatonic"], short: "A five-note scale: major without its 4th and 7th, or minor without its 2nd and ♭6th, so almost nothing clashes.", href: "/course/5/pentatonic" },
  { id: "position", label: "Position", forms: ["position 1", "position 2", "position 3", "position 4", "position 5", "position 6", "position 7"], short: "One area of the neck, four or five frets wide, where a whole scale lies under the hand without shifting. Position 1 is the lowest; the rest follow up the neck, each sharing notes with the next. Often called a box.", href: "/course/8/pentatonic-boxes" },
  { id: "crossing", label: "Crossing", forms: ["crossing"], short: "The way from one position to the next: a slide along one string that carries your hand into the next position.", href: "/course/6/joining" },
  { id: "barre-chord", label: "Barre chord", forms: ["barre chord", "bar chord", "barre"], short: "A chord with one finger pressing several strings across a fret, so the shape can move to any key.", href: "/course/6/bm-barre" },
  { id: "drop-3", label: "Drop 3", forms: ["drop 3", "drop-3 voicing"], short: "A four-note chord with the second-highest note dropped an octave: spread out and easy to move.", href: "/course/6/drop-3" },
  { id: "caged", label: "CAGED", forms: ["CAGED"], short: "A map of the neck from the five open chord shapes C, A, G, E and D, moved up so each one starts where the last ends.", href: "/course/8/d-c-a-shapes" },
  { id: "twelve-bar", label: "12-bar blues", forms: ["12-bar blues", "twelve-bar blues", "12-bar"], short: "The chord pattern most blues uses: twelve bars on the 1, 4 and 5 chords.", href: "/course/7/twelve-bar" },
  { id: "sus", label: "Sus chord", forms: ["sus chord", "sus2", "sus4"], short: "A chord with its 3rd swapped for the 2nd or 4th: open, unresolved.", href: "/course/7/sus-add9" },
  { id: "add9", label: "add9", forms: ["add9"], short: "A chord with the 9th (the 2, an octave up) added on top.", href: "/course/7/sus-add9" },
  { id: "mode", label: "Mode", forms: ["mode"], short: "The major scale's notes played from a different starting note, so a different note is home and the mood changes.", href: "/course/9/modes" },
  { id: "ionian", label: "Ionian", forms: ["Ionian"], short: "The major scale, as a mode.", href: "/course/9/modes" },
  { id: "dorian", label: "Dorian", forms: ["Dorian"], short: "Minor with a raised 6th: minor, but brighter.", href: "/course/9/modes" },
  { id: "phrygian", label: "Phrygian", forms: ["Phrygian"], short: "Minor with a flat 2nd: dark, Spanish-sounding.", href: "/course/9/modes" },
  { id: "lydian", label: "Lydian", forms: ["Lydian"], short: "Major with a raised 4th: dreamy, floating.", href: "/course/9/lydian-locrian" },
  { id: "mixolydian", label: "Mixolydian", forms: ["Mixolydian"], short: "Major with a flat 7th: the sound of blues-rock and dominant chords.", href: "/course/9/modes" },
  { id: "aeolian", label: "Aeolian", forms: ["Aeolian", "natural minor"], short: "The natural minor scale, as a mode.", href: "/course/9/modes" },
  { id: "locrian", label: "Locrian", forms: ["Locrian"], short: "Minor with a flat 2nd and flat 5th: so unstable that songs rarely use it as home.", href: "/course/9/lydian-locrian" },
  { id: "harmonic-minor", label: "Harmonic minor", forms: ["harmonic minor"], short: "Natural minor with a raised 7th, so the 5 chord becomes major and pulls home.", href: "/course/9/harmonic-minor" },
  { id: "melodic-minor", label: "Melodic minor", forms: ["melodic minor"], short: "Natural minor with a raised 6th and 7th: minor, but smooth on the way up to the root.", href: "/course/9/melodic-minor" },
  { id: "shell", label: "Shell voicing", forms: ["shell voicing", "shell chord"], short: "A chord played with only its root, 3rd and 7th.", href: "/course/11/shells" },
  { id: "ii-v-i", label: "ii–V–I", forms: ["ii–V–I", "ii-V-I", "2-5-1"], short: "The 2, 5 and 1 chords of a key in a row: the core move of jazz.", href: "/course/11/ii-v-i" },
  { id: "comp", label: "Comp", forms: ["comp", "comping", "comped"], short: "To play chords behind a soloist or singer: short, rhythmic, leaving them room.", href: "/course/11/comping" },
  { id: "guide-tones", label: "Guide tones", forms: ["guide tone"], short: "The 3rd and 7th of a chord: the two notes that say what it is and lead smoothly into the next chord.", href: "/course/11/guide-tones" },
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
