import { section, type CourseStage } from "../model";
import { A, D, E, chords, links, neck, songs, task, text, toneDots, visual } from "../build";

const PENT = [0, 3, 5, 7, 10];

export const STAGE_6: CourseStage = {
  slug: "10", label: "10", title: "Other keys",
  intro: "Everything so far was in E minor and G major. Move it to other keys, with the circle of fifths as the map.",
  sections: [
    section("moving-keys", "Moving it all to Am/C, Dm/F", "keys", [
      text(
        "In stage 5 you moved the E minor scale up three frets and got G minor. Every shape in this course moves the same way. Slide the position 1 pentatonic up five frets and it's A minor pentatonic, the most famous box in rock and blues. Slide it up ten and it's D minor.",
        "Chords move too, as long as nothing relies on open strings: that's what barres and drop 3 shapes are for. And some keys have their own open position: A minor / C major uses Am, Dm, Em, C, G and F (Fmaj7 until the barre comes), so the stage 5 ideas work there as well.",
      ),
      neck("The position 1 E minor pentatonic shape (frets 0–3)…", 0, 3, toneDots(E, PENT, 0, 3)),
      neck("…moved up five frets is A minor pentatonic (frets 5–8).", 4, 9, toneDots(A, PENT, 5, 8), { window: { from: 5, to: 8 } }),
      neck("…and up ten frets, D minor pentatonic (frets 10–13).", 9, 14, toneDots(D, PENT, 10, 13), { window: { from: 10, to: 13 } }),
      chords("A minor / C major in the open position: 1, 4 and 5 of A minor, plus the relative major's C, F and G.", ["Am", "Dm", "E7", "C", "Fmaj7", "G"]),
      task("Play Am Dm E7 Am, then C Fmaj7 G C. Then solo over the Am loop with the A minor pentatonic at the 5th fret."),
    ]),
    section("rising-sun", "House of the Rising Sun", "melody", [
        text(
          "A traditional tune in A minor: Am C D F · Am C E. Pick each chord as an arpeggio in 6/8, one note at a time, and hum the tune over it.",
          "The E at the end of the line is the V chord of A minor, borrowed from harmonic minor: it pulls you back to Am.",
        ),
        chords("The chords, in position 1.", ["Am", "C", "D", "F", "E"]),
        songs({ title: "House of the Rising Sun", artist: "traditional (The Animals)", chords: ["Am", "C", "D", "F", "E"], progression: "Am C D F · Am C E" }),
      ]),
    section("circle-map", "The circle as a map between keys", "keys", [
      text(
        "The circle of fifths puts every key in a ring, each one a 5th above the last. Any key's 4 and 5 chords are its neighbours, so a key's three main chords are always three keys in a row: C–G–D for G major, F–C–G for C major.",
        "Neighbouring keys share six of their seven notes, which is why songs move between them so easily. Inside the ring sit the relative minors: Em with G, Am with C, Dm with F. Pick a key below and its whole family lights up.",
      ),
      visual({ kind: "circle", caption: "Pick a key: its 4 and 5 sit either side, its relative minor inside." }),
      task("Pick a key next to G on the circle (C or D). Find its 1, 4 and 5 chords on the circle, then play them as 1 → 4 → 5 → 1."),
      links([{ href: "/theory/circle", label: "Circle of fifths explorer", note: "every key's chords, signature and neighbours" }]),
    ]),
    section("cheatsheet", "Your own cheatsheet", "keys", [
        text(
          "You now know more shapes than you can keep in your head at once. Pick the ones you actually use: your favourite voicing of each chord, the scale boxes you solo with, the progressions you love. Put them on one page.",
          "A cheatsheet you made yourself is one you'll look at.",
        ),
        task("Build a sheet with one key: its chords, one shape for each, and its pentatonic box. Print it or keep it open while you play."),
        links([{ href: "/cheatsheet", label: "Build your own cheatsheet" }]),
      ]),
  ],
};
