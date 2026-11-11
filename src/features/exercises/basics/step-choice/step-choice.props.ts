/**
 * A row of chips for the same drill again with one thing changed: the student taps a chip and every tool in the same
 * block (heading to heading) is set to it, so one drill is played faster, in another key or in another position
 * without a copy of the tool per version. Each option is one chip and sets one or more parts: `key` moves every tool
 * in the block to that key, `bpm` sets the tempo of every tool that has one, `position` makes a scale-neck or
 * position-neck show that one position, `level` sets every tool that takes a `level` to that level (its chips are
 * always stages, each naming its level: "Stage 2 · Intermediate"). Every option holds the same parts, and option 1 is how the block's tools are
 * written. `label` names the chips: "stage" ("Stage 1", "Stage 2": each option harder than the last, such as a tempo
 * going up) or "variant" ("Variant 1", "Variant 2": equals to compare, such as the same pattern in two keys or
 * positions); each named chip also lists what it sets ("A · 80 bpm"). Without a label, for options that set one part,
 * the row is named Key, Tempo or Position and each chip shows its value ("Key  G  A"). It shows nothing else and makes
 * no sound. Put it right before the tool it moves, so the chips sit on that tool. One per block; with `key`, the
 * block's other tools must all be able to change key (not note-finder, interval-ears, run-singer, string-singer,
 * breathwork or the finger drills).
 * @component step-choice basic
 */
export interface StepChoiceProps {
  /** 2-4 different options, each with the same parts: [{ "bpm": 60 }, { "bpm": 80 }] or [{ "key": "g", "position": 1 }, { "key": "c", "position": 4 }]. `key` is a note ("a", "b-flat"), `bpm` 30-240, `position` 1-5, `level` "new", "beginner", "intermediate" or "advanced", easiest first: [{ "level": "intermediate" }, { "level": "advanced" }] */
  options: { key?: string; bpm?: number; position?: number; level?: "new" | "beginner" | "intermediate" | "advanced" }[];
  /** how the chips are named: "stage" or "variant"; leave out only when the options set one part */
  label?: "stage" | "variant";
}
