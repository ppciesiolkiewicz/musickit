import type { KeyContext } from "./theory";

const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/** What a chord on one degree of a major or natural minor key is called and what it does there, for a tooltip. */
export function degreeInfo(ctx: KeyContext, degree: number): { name: string; role: string; notes: string[]; text: string } {
  const minor = ctx.steps[2] === 3;
  const leading = ctx.steps[6] === 11;
  const notes = [0, 2, 4].map((k) => ctx.names[(degree + k) % 7]);
  const home = ctx.names[0];
  const five = ctx.chords[4].triadName;
  const [name, role, text] = ([
    ["Tonic", "home", `Home: the chord the key rests on. Songs usually start and end on ${ctx.chords[0].triadName}.`],
    ["Supertonic", "leads to the V", `Moves away from home and leads well to the V (${five}).${minor ? " Diminished in minor, so it is often swapped for iv." : " ii–V–I is the most common turn in jazz and pop."}`],
    ["Mediant", "stands in for the I", minor ? `The relative major of the key: bright, but it shares two notes with the i, so it sits close to home.` : `Shares two notes with the I, so it can stand in for it as a softer, more wistful home.`],
    ["Subdominant", "moves away from home", `A step away from home that is not yet tense. ${minor ? "iv–i" : "IV–I"} is the "amen" ending, and ${minor ? "iv–V–i" : "IV–V–I"} the classic one.`],
    ["Dominant", "pulls back to the I", minor ? `Minor here, so its pull back to ${home} is gentle. Harmonic minor raises its 3rd to make it major and pull harder.` : `The most tension in the key: it wants to resolve to ${home}. Its 3rd is the leading tone, a half step below ${home}.`],
    ["Submediant", "stands in for the I", minor ? `A warm major chord a half step above the v. ♭VI–♭VII–i is a classic rock and film ending.` : `The relative minor of the key. It shares two notes with the I; I–V–vi–IV is built on it.`],
    leading
      ? ["Leading tone", "pulls back to the I", `Diminished: it works like the V7 without its root, so it pulls back to ${home} too. Its root is a half step below ${home}.`]
      : ["Subtonic", "leads home by a whole step", `Built a whole step below ${home}, so it leads home without the half-step pull of a leading tone. ♭VII–i is a rock and modal favourite.`],
  ] as const)[degree];
  return { name, role, notes, text: `${name}: the chord on the ${ORDINAL[degree]} note of the key. ${text}` };
}
