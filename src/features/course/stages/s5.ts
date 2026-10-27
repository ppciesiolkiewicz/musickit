import { MAJOR, rotate } from "../../theory/theory";
import { section, type CourseStage } from "../model";
import { E, MINOR_SEMIS, chords, links, neck, task, text, toneDots, visual } from "../build";

const DORIAN = [0, 2, 3, 5, 7, 9, 10], PHRYGIAN = [0, 1, 3, 5, 7, 8, 10], HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
/** Scale dots with the note that sets the mode apart drawn as a ring. */
const marked = (semis: number[], changed: string) => toneDots(E, semis, 0, 3).map((d) => (d.label === changed ? { ...d, outline: true } : d));

export const STAGE_5: CourseStage = {
  slug: "5", label: "5", title: "Modes",
  intro: "Change one note of the scale and the mood changes. Modes in E and G, and the harmonic minor that explains B7.",
  sections: [
    section("modes", "Aeolian, Dorian, Phrygian, Mixolydian", "modes", [
      text(
        "E minor as you've played it is called E Aeolian, the natural minor. Raise its 6th (C → C♯) and it becomes E Dorian: still minor, but warmer and jazzier, the sound of a lot of funk and Santana. Lower its 2nd (F♯ → F) and it becomes E Phrygian: dark, Spanish, metal.",
        "On the major side, G with its 7th lowered (F♯ → F) is G Mixolydian: bluesy, rock-and-roll major. In every case one note changes and the rest of position 1 stays exactly as you know it.",
      ),
      visual({
        kind: "wheels", caption: "Each mode against plain major (dashed): the ringed notes are the ones that differ. Tap to hear.",
        wheels: [
          { name: "Aeolian", mood: "natural minor", steps: rotate(MAJOR, 5) },
          { name: "Dorian", mood: "minor, but warm", steps: rotate(MAJOR, 1) },
          { name: "Phrygian", mood: "dark, Spanish", steps: rotate(MAJOR, 2) },
          { name: "Mixolydian", mood: "bluesy major", steps: rotate(MAJOR, 4) },
        ],
      }),
      neck("E Aeolian (natural minor) in position 1: the scale you know.", 0, 3, toneDots(E, MINOR_SEMIS, 0, 3)),
      neck("E Dorian: the ringed 6 (C♯) replaces C.", 0, 3, marked(DORIAN, "6")),
      neck("E Phrygian: the ringed ♭2 (F) replaces F♯.", 0, 3, marked(PHRYGIAN, "♭2")),
      chords("Hear Dorian: Em7 to A (the C♯ is A's 3rd). Hear Phrygian: Em to F.", ["Em7", "A", "Em", "Fmaj7"]),
      task("Loop Em7 A. Solo with E Dorian and lean on the C♯ when the A comes. Then loop Em Fmaj7 and use E Phrygian."),
      links([{ href: "/theory/scales", label: "Scales explorer", note: "every mode, its chords and its boxes" }]),
    ]),
    // Planned: the last two modes: G Lydian (raised 4) and F♯ Locrian (♭2 and ♭5).
    section("lydian-locrian", "Lydian & Locrian", "modes"),
    // Planned: compare the modes side by side over the drone; Oye Como Va as a Dorian vamp (Am7 D9).
    section("modes-over-drone", "Modes over a drone", "modes"),
    // Planned: the Dorian ballad in tab.
    section("scarborough-fair", "Scarborough Fair", "melody"),
    section("harmonic-minor", "Harmonic minor and why B7 works", "modes", [
      text(
        "Back in stage 1, B7 stood in for Bm and pulled back to Em even harder. Here's why. B7 contains D♯, which isn't in E natural minor: the scale has D. D♯ is one fret below E, so it leans into the home note like Ti leans into Do in a major key.",
        "Raise the 7th of E minor from D to D♯ and you get E harmonic minor. Its 5 chord is B major (or B7), not Bm. Almost all minor-key music borrows that chord for its strong pull home, and the scale's gap between C and D♯ gives it its exotic, classical sound.",
      ),
      neck("E harmonic minor in position 1: the ringed 7 (D♯) replaces D.", 0, 3, marked(HARMONIC_MINOR, "7")),
      chords("Bm (from natural minor) against B7 (from harmonic minor). Play each, then Em.", ["Bm", "B7", "Em"]),
      task("Play Em Am Bm Em, then Em Am B7 Em. Then solo over the second loop with E harmonic minor and land D♯ → E as B7 goes to Em."),
    ]),
    // Planned: harmonic minor's neighbour: raised 6 and 7, the jazz minor.
    section("melodic-minor", "Melodic minor", "modes"),
  ],
};
