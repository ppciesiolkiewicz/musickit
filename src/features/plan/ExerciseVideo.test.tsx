import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import ExerciseCard from "./ui/ExerciseCard";
import type { PlanExercise } from "./model/types";
import type { Cell } from "./model/tools";

const tool = (t: object) => ({ type: "tool", tool: t }) as unknown as Cell;
const exercise = {
  title: "Two tools", minutes: 5,
  cells: [{ type: "text", text: "Count along." } as Cell, tool({ type: "metronome", bpm: 60 }), tool({ type: "picking-drill", strokes: "DU", level: "beginner", notesPerString: 4, bpm: 60 })],
} as PlanExercise;
const video = { id: "00000000-0000-4000-8000-000000000001", title: "Picking, beginner", note: "", seconds: 30, width: 1280, height: 720, overlay: null };

test("a tool with a video gets Watch video right above it; a tool without one gets nothing", () => {
  const html = renderToStaticMarkup(<ExerciseCard exercise={exercise} index={0} videos={{ 1: video }} />);
  assert.equal(html.match(/Watch video/g)?.length, 1);
  // the button sits after the metronome's figure and before the picking drill's
  const button = html.indexOf("Watch video");
  assert.ok(button > html.indexOf("Count along."));
  assert.ok(html.indexOf('aria-expanded="false"') > 0);
  // nothing is loaded until it is opened
  assert.doesNotMatch(html, /<video/);
});

test("no videos, no button", () => {
  assert.doesNotMatch(renderToStaticMarkup(<ExerciseCard exercise={exercise} index={0} />), /Watch video/);
});
