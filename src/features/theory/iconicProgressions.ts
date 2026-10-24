/**
 * A few iconic progressions for each of the 21 modes (major, harmonic minor and melodic minor families), written as scale degrees so they
 * follow whatever key is picked. `why` says what the progression does and where the mode's colour note sits in it. The other scales have none.
 * Pure data, no sound. Chord names and roman numerals come from the key context at render time.
 */
import type { KeyContext } from "./theory";

export type Quality = "tri" | "sev";

export interface IconicProgression {
  /** 0-based scale degrees, in order */
  degs: number[];
  /** triad or seventh for every chord, or one list entry per chord */
  q: Quality | Quality[];
  why: string;
}

/** Keyed "family-mode": 0-0 is the major scale, 1-0 harmonic minor, 2-0 melodic minor. */
export const ICONIC: Record<string, IconicProgression[]> = {
  // ---- major modes
  "0-0": [
    { degs: [0, 4, 5, 3], q: "tri", why: "The pop progression: home, the bright V, the sadder vi, then the IV that cushions the return. Four triads, no outside notes, which is why hundreds of songs share it." },
    { degs: [0, 3, 4], q: "tri", why: "The three primary chords. I, IV and V are all major and between them they use all seven notes of the scale. Folk, country, early rock and the skeleton of the blues." },
    { degs: [1, 4, 0], q: "sev", why: "The ii–V–I, the basic move of jazz. The roots fall by a fifth each time, the strongest motion in harmony, and the sevenths make every chord lean on the next." },
    { degs: [0, 5, 3, 4], q: "tri", why: "The 1950s doo-wop turnaround. The vi gives a sad step, the IV lifts, and the V sets up the return to I." },
  ],
  "0-1": [
    { degs: [0, 3], q: "sev", why: "Two chords hold the whole Dorian sound. The IV7 is a major chord that carries the natural 6th, the one note that separates Dorian from natural minor. “Oye Como Va” lives here." },
    { degs: [0, 6, 3], q: "tri", why: "A rock vamp. The ♭VII falls a whole step from home as in natural minor, but the IV after it brings the natural 6th back, so it sounds minor and hopeful at once." },
    { degs: [2, 3, 0], q: "tri", why: "A climb into home. ♭III steps up to IV (which holds the Dorian 6th) and then falls to i." },
  ],
  "0-2": [
    { degs: [0, 1], q: "tri", why: "The Phrygian signature: a half step up to the chord on the ♭2 and back. Flamenco, metal and film tension all lean on this move." },
    { degs: [0, 1, 2, 1], q: "tri", why: "Home, then the dark half step, then ♭III, then back to ♭II. The loop keeps leaning on the ♭2 and never settles." },
    { degs: [3, 2, 1, 0], q: "tri", why: "The descending “Andalusian” run: each root steps down and the last move, ♭II to i, is a half step onto home. In flamenco the final chord is usually made major, which is Phrygian dominant." },
  ],
  "0-3": [
    { degs: [0, 1], q: "sev", why: "The Lydian signature. The II is a major chord a whole step up, and it contains the ♯4, the note that makes the scale float." },
    { degs: [0, 1, 4, 0], q: "tri", why: "Home, the bright II, the major V and back. The first three chords are all major, which is why Lydian sounds so open." },
    { degs: [0, 1, 2], q: "tri", why: "A rising line of three steps: I, II, iii. Each root is a whole step above the last, a film-score “wonder” gesture." },
  ],
  "0-4": [
    { degs: [0, 6, 3], q: "tri", why: "I – ♭VII – IV, the rock and folk staple (the “Sweet Home Alabama” riff). The ♭VII is the note that is not in plain major." },
    { degs: [0, 4, 6, 3], q: "tri", why: "Mixolydian has a minor v, not a major V. A minor v in the loop is the sign you are in Mixolydian and not major." },
    { degs: [6, 3, 0], q: "tri", why: "The same chords turned round, arriving on I from the IV. It sounds relaxed, like an amen ending, because the IV steps straight onto I." },
  ],
  "0-5": [
    { degs: [0, 5, 6], q: "tri", why: "The natural-minor anthem. The roots rise from ♭VI to ♭VII and then fall back to i." },
    { degs: [0, 6, 5], q: "tri", why: "The same two chords the other way round: a stepwise slide down from i, through ♭VII to ♭VI. Hendrix’s “All Along the Watchtower” is built on it." },
    { degs: [0, 5, 2, 6], q: "tri", why: "A four-chord minor loop made of the tonic and the scale’s three major chords." },
    { degs: [0, 3, 6, 2], q: "tri", why: "The roots rise by a fourth three times in a row (the circle of fifths running backwards), then fall a third back to i." },
  ],
  "0-6": [
    { degs: [0, 1], q: "sev", why: "Locrian is rarely a home key because its tonic chord is diminished. Alternating that chord with the major ♭II, a half step above, is the clearest way to make it sound like home." },
    { degs: [4, 1, 0], q: "sev", why: "The ♭V major chord falls to ♭II, and ♭II falls a half step onto the diminished home chord. Roots moving down is what lets an unstable chord feel like an ending." },
  ],
  // ---- harmonic minor modes
  "1-0": [
    { degs: [0, 3, 4], q: ["tri", "tri", "sev"], why: "Harmonic minor’s gift is the major V. Its 3rd is the raised 7th, the leading tone, which pulls up to the root: the strongest cadence in minor." },
    { degs: [1, 4, 0], q: ["sev", "sev", "tri"], why: "The minor ii–V–i. The half-diminished ii and the dominant V share most of their notes and move by half steps into the tonic." },
    { degs: [0, 5, 4], q: "tri", why: "i – ♭VI – V. The bass falls from ♭6 to 5, a half step, and the major V then pulls home. A baroque lament." },
    { degs: [0, 6, 0], q: ["tri", "sev", "tri"], why: "The diminished 7th on the raised 7th degree. It is symmetrical, so its notes can be heard as several chords, and it resolves up by a half step to i." },
  ],
  "1-1": [
    { degs: [0, 3], q: "sev", why: "The IV7 holds the natural 6th, the note that separates this mode from Locrian. A half-diminished tonic is rarely a home, so the IV gives it somewhere to lean." },
    { degs: [2, 3, 0], q: "sev", why: "♭iii up to IV and down onto the diminished home chord: a short stepwise approach that points at the tonic." },
  ],
  "1-2": [
    { degs: [0, 3], q: "sev", why: "The augmented tonic has a ♯5 that sits a half step below the 6th. When the IV arrives that note resolves up into it." },
    { degs: [1, 2, 5], q: "sev", why: "The III is a dominant 7th chord. Its 3rd, the ♯5 of the scale, is also the major 7th of the vi chord, so one note links both chords." },
  ],
  "1-3": [
    { degs: [0, 1], q: "sev", why: "The “Romanian minor” sound. The II is a major chord a whole step up and its 3rd is the ♯4, the note that sets this mode apart from Dorian." },
    { degs: [0, 1, 2, 0], q: "tri", why: "Home, the major II, ♭III and back: the roots climb a whole step and then a half step, then fall to i." },
  ],
  "1-4": [
    { degs: [0, 1, 0], q: "tri", why: "A major tonic and the chord a half step above. This is the Spanish and Middle-Eastern sound." },
    { degs: [0, 6, 1, 0], q: "tri", why: "Home, the minor ♭vii, then the half-step ♭II, back to I. The ♭II falls back onto the major tonic." },
  ],
  "1-5": [
    { degs: [0, 6], q: "sev", why: "The VII is a dominant 7th chord that holds both signature notes of the mode, the ♯2 and the ♯4." },
    { degs: [0, 6, 5], q: "tri", why: "I, VII and vi fall by a step each time: a bright chord, a major chord one step below, then a minor one." },
  ],
  "1-6": [
    { degs: [0, 5], q: "sev", why: "The most tense of the 21 modes: treat it as a colour more than a key. A diminished 7th tonic and a dominant 7th on the ♭6 is a short, strange vamp." },
    { degs: [0, 1], q: "sev", why: "Two tense chords a half step apart, the diminished 7th home and the minor-major ♭ii. Nothing here settles." },
  ],
  // ---- melodic minor modes
  "2-0": [
    { degs: [0, 3], q: "sev", why: "The minor-major tonic and a dominant IV7. The IV7 carries the natural 6th, which gives melodic minor its smooth, jazzy lift." },
    { degs: [1, 4, 0], q: "sev", why: "A ii–V–i with a minor-major tonic. The i(maj7) holds the raised 7th, so the home chord still has a leading tone in it." },
    { degs: [0, 2, 3], q: "sev", why: "The augmented ♭III chord between i and IV. Its raised 5th is the 7th of the scale." },
  ],
  "2-1": [
    { degs: [0, 1], q: "sev", why: "A half step up to the augmented ♭II and back: Phrygian’s dark step with a natural 6th over it." },
    { degs: [0, 3], q: "sev", why: "A minor tonic and a dominant IV7. The IV7 carries the natural 6th, as in Dorian, but the ♭2 stays in the scale." },
  ],
  "2-2": [
    { degs: [0, 1], q: "sev", why: "The augmented tonic holds the ♯5 and the II dominant chord holds the ♯4, so both notes that define this mode sound in two chords." },
    { degs: [0, 2], q: "sev", why: "The ♯5 is a common tone: it is the 3rd of the III dominant chord, so the note carries over as the chord changes." },
  ],
  "2-3": [
    { degs: [0, 1], q: "sev", why: "Two dominant 7th chords a whole step apart. The 3rd of the II7 is the ♯4, the “overtone” note." },
    { degs: [0, 1, 5, 0], q: "sev", why: "Add the minor vi between the two dominants for contrast, then come home to the I7." },
  ],
  "2-4": [
    { degs: [0, 3, 0], q: "tri", why: "A major tonic with a minor iv. The ♭6 is the 3rd of the iv, so the sad borrowed chord is exactly the mode’s colour note." },
    { degs: [0, 3, 6, 0], q: "tri", why: "Major I, minor iv, major ♭VII, back to I: two rising fourths in the roots, and a major home with minor-key shading." },
  ],
  "2-5": [
    { degs: [0, 3], q: "sev", why: "Half-diminished tonic moving to a minor 7th chord. The natural 2nd makes this the least unstable of the Locrian-type modes." },
    { degs: [0, 5, 6], q: "tri", why: "A diminished home chord with two major chords above it, ♭VI and ♭VII, climbing in steps." },
  ],
  "2-6": [
    { degs: [0, 5], q: "sev", why: "The altered scale is made for dominant 7th chords that resolve; played as a home key it is just tension. A half-diminished chord and a ♭VI dominant 7th keep that going." },
    { degs: [5, 4, 0], q: "sev", why: "Two dominant 7ths sliding down a whole step, then home. Each dominant 7th is a chord the altered scale fits." },
  ],
};

export function iconicFor(ctx: KeyContext): IconicProgression[] {
  return ICONIC[`${ctx.familyIndex}-${ctx.modeIndex}`] ?? [];
}

export interface IconicChord {
  degree: number;
  roman: string;
  name: string;
  /** how many stacked notes to play: 3 for a triad, 4 for a seventh */
  notes: 3 | 4;
}

/** The chords of one progression in a key, named and numbered. */
export function iconicChords(ctx: KeyContext, p: IconicProgression): IconicChord[] {
  return p.degs.map((d, i) => {
    const c = ctx.chords[d];
    const q = Array.isArray(p.q) ? p.q[i] : p.q;
    return { degree: d, roman: c.roman, name: q === "sev" ? c.seventhName : c.triadName, notes: q === "sev" ? 4 : 3 };
  });
}
