import { MAJOR, rotate } from "../../theory/theory";
import { section, type CourseStage } from "../model";
import { E, MINOR_SEMIS, chords, links, melody, neck, task, text, toneDots, tune, visual } from "../build";

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
    section("lydian-locrian", "Lydian & Locrian", "modes", [
        text(
          "The last two modes. G Lydian is G major with a raised 4th, C♯: dreamy and floating, the sound of film scores. F♯ Locrian is the darkest mode, with both a ♭2 and a ♭5; it's rarely home, but it's the scale over a m7♭5 chord.",
          "Same seven notes as every other mode of the key; only the home note changes.",
        ),
        task("Over a G drone, play G major then G Lydian. Stop on C, then C♯, and hear the 4th lift."),
        links([{ href: "/theory/scales", label: "Scales and modes" }]),
      ]),
    section("modes-over-drone", "Modes over a drone", "modes", [
        text(
          "A drone fixes the root so you hear how every other note relates to it. Over a D drone, play D Dorian and stop on B, its 6th: it brightens the minor sound. Over A, play A Mixolydian and stop on G, the ♭7.",
          "Oye Como Va (Santana) is two chords, Am7 and D9, vamping in A Dorian. Loop them and solo with A Dorian over the top.",
        ),
        chords("The Oye Como Va vamp. Tap to hear.", ["Am7", "D9"]),
        task("For each mode, two minutes over a drone. Say which note gives it its colour."),
        links([{ href: "/theory/metronome-drone", label: "Metronome & drone" }]),
      ]),
    section("scarborough-fair", "Scarborough Fair", "melody", [
        text("A traditional English ballad in D Dorian: minor, but with the bright 6th, B, that gives it its haunted, open sound. Listen for it in the second line."),
        melody({ title: "Scarborough Fair", origin: "traditional English ballad (Dorian)", position: 5, notes: tune("D4:2 D4 A4:2 A4 A4 E4 F4 E4 D4:3 A4 C5:2 D5 C5:2 A4 B4 G4 A4:3") }),
      ]),
    section("harmonic-minor", "Harmonic minor and why B7 works", "modes", [
      text(
        "Back in stage 1, B7 stood in for Bm and pulled back to Em even harder. Here's why. B7 contains D♯, which isn't in E natural minor: the scale has D. D♯ is one fret below E, so it leans into the home note like Ti leans into Do in a major key.",
        "Raise the 7th of E minor from D to D♯ and you get E harmonic minor. Its 5 chord is B major (or B7), not Bm. Almost all minor-key music borrows that chord for its strong pull home, and the scale's gap between C and D♯ gives it its exotic, classical sound.",
      ),
      neck("E harmonic minor in position 1: the ringed 7 (D♯) replaces D.", 0, 3, marked(HARMONIC_MINOR, "7")),
      chords("Bm (from natural minor) against B7 (from harmonic minor). Play each, then Em.", ["Bm", "B7", "Em"]),
      task("Play Em Am Bm Em, then Em Am B7 Em. Then solo over the second loop with E harmonic minor and land D♯ → E as B7 goes to Em."),
    ]),
    section("melodic-minor", "Melodic minor", "modes", [
        text(
          "Melodic minor raises both the 6th and the 7th of natural minor: E F♯ G A B C♯ D♯. It's a minor chord on top of a major scale's top half, smooth to sing and the root of most jazz minor sounds.",
          "Classical players use it only going up; jazz players use it both ways.",
        ),
        neck("E melodic minor in position 1.", 0, 4, toneDots(E, [0, 2, 3, 5, 7, 9, 11], 0, 4)),
        task("Play E natural, harmonic and melodic minor one after another, over an Em drone. Which one sounds most finished?"),
      ]),
  ],
};
