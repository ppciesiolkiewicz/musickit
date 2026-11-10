/**
 * A row of key chips ("Key  A  G  C"): the student taps a key and every tool in the same block (heading to heading)
 * moves to it, so one drill is sung or played in each key without a copy of the tool per key. It shows nothing else
 * and makes no sound. Put it right before the tool it moves, so the chips sit on that tool. One per block; the block's
 * other tools must all be able to change key (not note-finder, interval-ears, run-singer, string-singer, breathwork
 * or the finger drills).
 * @component key-choice basic
 */
export interface KeyChoiceProps {
  /** 2-3 different keys as notes: ["a", "g", "c"]; the first is the key the block's tools are written in */
  keys: string[];
}
