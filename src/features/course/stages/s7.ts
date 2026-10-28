import { section, type CourseStage } from "../model";
import { chords, links, songs, task, text } from "../build";

export const STAGE_7: CourseStage = {
  slug: "7", label: "11", title: "Jazz colours",
  intro: "Shell voicings, 9ths and 13ths, and the jazz standards that use them.",
  sections: [
    section("shells", "Shell voicings", "colour", [
        text(
          "A shell voicing keeps only the root, the 3rd and the 7th: the notes that say what a chord is. Leave the 5th out and the chord is lighter, easier to move, and leaves room for a bass player and a singer.",
          "Two shapes cover everything: root on the 6th string, and root on the 5th string. That's how jazz and soul players comp.",
        ),
        chords("Shells on the 6th and 5th strings. Tap to hear.", [{ name: "Gmaj7", prefer: "shell" }, { name: "G7", prefer: "shell" }, { name: "Cmaj7", prefer: "shell" }, { name: "Dm7", prefer: "shell" }]),
        task("Play Dm7 G7 Cmaj7, the ii–V–I in C, with shells, moving as little as you can."),
        links([{ href: "/theory/chords?q=shell", label: "Shell voicings" }]),
      ]),
    section("extended", "9ths & 13ths", "colour", [
        text(
          "A 9th or 13th is a colour note stacked on top of a shell: the 9th is the 2 an octave up, the 13th is the 6. D9 is the bright, funky dominant; G13 is the classic jazz and soul chord before C.",
          "Add them on the top strings and keep the shell underneath.",
        ),
        chords("9th chords. Tap to hear.", ["G9", "D9", "Am9"]),
        task("Play Am9 D9 Gmaj7. Then play D7 in place of D9 and hear what the 9th adds. For a 13th, keep D7 and add B, the 6th, on the top string."),
        links([{ href: "/theory/chords?q=jazz", label: "Jazz voicings" }]),
      ]),
    section("jazz-standards", "Jazz standards", "colour", [
        text(
          "Standards are built from ii–V–I, in major and minor. Autumn Leaves is two of them back to back, in B♭ major and its relative, G minor. Fly Me to the Moon walks down the circle of fifths.",
          "Play them with shells first, then add 9ths and 13ths where they sound right.",
        ),
        chords("The changes of Autumn Leaves.", ["Cm7", "F7", "B♭maj7", "E♭maj7", "Am7♭5", "D7", "Gm"]),
        songs(
          { title: "Autumn Leaves", artist: "jazz standard", chords: ["Cm7", "F7", "B♭maj7", "E♭maj7", "Am7♭5", "D7", "Gm"], progression: "Cm7 F7 B♭maj7 E♭maj7 · Am7♭5 D7 Gm" },
          { title: "Fly Me to the Moon", artist: "jazz standard", chords: ["Am7", "Dm7", "G7", "Cmaj7", "Fmaj7", "Bm7♭5", "E7"], progression: "Am7 Dm7 G7 Cmaj7 · Fmaj7 Bm7♭5 E7 Am7" },
        ),
      ]),
  ],
};
