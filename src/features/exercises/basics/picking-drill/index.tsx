import { StubView, stringsLabel } from "../stub";

/** Stub: the picking drill's settings in a placeholder box. */
export function View({ strokes, notesPerString, strings, skip, bpm }: { strokes: string; notesPerString: number; strings?: number[]; skip?: boolean; bpm: number }) {
  return <StubView name="picking drill" settings={[`strokes ${strokes.split("").join(" ")}`, `${notesPerString} per string`, stringsLabel(strings), ...(skip ? ["skipping strings"] : []), `${bpm} bpm`]} />;
}
