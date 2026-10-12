import { OPEN_PITCH } from "./shapeTools";

/** The twelve intervals inside an octave, with a well-known tune that starts with each one (a memory hook for ear training). */
export interface IntervalInfo {
  semis: number;
  short: string;
  name: string;
  song: string;
}

export const INTERVALS: IntervalInfo[] = [
  { semis: 1, short: "m2", name: "minor 2nd", song: "Jaws" },
  { semis: 2, short: "M2", name: "major 2nd", song: "Happy Birthday" },
  { semis: 3, short: "m3", name: "minor 3rd", song: "Greensleeves" },
  { semis: 4, short: "M3", name: "major 3rd", song: "When the Saints" },
  { semis: 5, short: "P4", name: "perfect 4th", song: "Here Comes the Bride" },
  { semis: 6, short: "TT", name: "tritone", song: "The Simpsons" },
  { semis: 7, short: "P5", name: "perfect 5th", song: "Star Wars" },
  { semis: 8, short: "m6", name: "minor 6th", song: "The Entertainer (opening leap)" },
  { semis: 9, short: "M6", name: "major 6th", song: "My Bonnie" },
  { semis: 10, short: "m7", name: "minor 7th", song: "Somewhere (West Side Story)" },
  { semis: 11, short: "M7", name: "major 7th", song: "Take On Me (chorus leap)" },
  { semis: 12, short: "P8", name: "octave", song: "Somewhere Over the Rainbow" },
];

/** Where an interval lands from a start note: string and fret, plus the move in strings and frets. `gb` is true when the move crosses from the G string to the B string, which is tuned a 3rd apart instead of a 4th. */
export interface IntervalPos {
  string: number;
  fret: number;
  strings: number;
  frets: number;
  gb: boolean;
}

/** Every place an interval above (startString, startFret) can be played on the same or a higher string, within five frets of the start hand position. Strings: 0 = low E … 5 = high e. */
export function intervalPositions(startString: number, startFret: number, semis: number, maxFret = 15): IntervalPos[] {
  const target = OPEN_PITCH[startString] + startFret + semis;
  const out: IntervalPos[] = [];
  for (let s = startString; s < 6; s++) {
    const fret = target - OPEN_PITCH[s];
    if (fret < 0 || fret > maxFret || Math.abs(fret - startFret) > (s === startString ? 12 : 5)) continue;
    out.push({ string: s, fret, strings: s - startString, frets: fret - startFret, gb: startString <= 3 && s >= 4 });
  }
  return out;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The move in words: "1 string over, 2 frets up (crosses G–B)". */
export function describeMove(p: IntervalPos): string {
  const frets = p.frets === 0 ? "same fret" : `${plural(Math.abs(p.frets), "fret")} ${p.frets > 0 ? "up" : "back"}`;
  const where = p.strings === 0 ? "same string" : `${plural(p.strings, "string")} over`;
  return `${where}, ${frets}${p.gb ? " (crosses G–B)" : ""}`;
}
