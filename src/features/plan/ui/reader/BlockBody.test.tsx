import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { Given, Moves } from "../../model/moves";
import type { Cell, PlanTool } from "../../model/tools";
import type { Block } from "../../model/types";
import ExerciseCard from "../ExerciseCard";
import BlockArticle, { BlockBody } from "./BlockArticle";
import { selectorLine, slowTempoLine } from "./selectorLine";

const neck = (key: number): Cell => ({ type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key, boxes: [1] } as PlanTool });
const text = (t: string): Cell => ({ type: "text", text: t });
const moves: Moves = { key: "any", bpm: { from: 60, to: 90, step: 10 } };
const band: Cell = { type: "tool", tool: { type: "backing-band", bpm: 60, key: 9, parts: { click: "on" } } as PlanTool };
const block: Block = { title: "{{=key}} minor pentatonic", moves, cells: [text("Play it at {{=bpm}}."), band, neck(9)] };
const draw = (given?: Given, at?: { bpm?: number; key?: number }) => renderToStaticMarkup(<BlockBody block={block} size="card" given={given} at={at} />);
const chips = (html: string) => [...html.matchAll(/role="radio"[^>]*>([^<]*)</g)].map((m) => m[1]);

test("a version with an earlier tempo: chips before the first tool, the line under them, the text filled", () => {
  const html = draw({ bpm: { now: 70, back: [60] }, keys: { now: [9], back: [] }, moved: 1 });
  assert.deepEqual(chips(html), ["70", "60"]);
  assert.ok(html.includes(">Tempo<") && html.includes(">Earlier<"));
  assert.ok(html.includes("Play it at 70."));
  assert.ok(html.includes(selectorLine("bpm", true, true).replaceAll('"', "&quot;")));
  assert.ok(html.indexOf('role="radiogroup"') > html.indexOf("Play it at 70."), "the chips sit after the text, before the first tool");
  assert.equal(html.includes("{{="), false);
});

test("the earlier chip picked: the text and the tools are at the earlier tempo", () => {
  const html = draw({ bpm: { now: 70, back: [60] } }, { bpm: 1 });
  assert.ok(html.includes("Play it at 60."));
  assert.ok(/aria-checked="true"[^>]*>60</.test(html));
});

test("two keys now: a Key row with no Earlier, and no tempo row for one tempo", () => {
  const html = draw({ keys: { now: [7, 9], back: [] }, bpm: { now: 60, back: [] } });
  assert.deepEqual(chips(html), ["G", "A"]);
  assert.equal(html.includes(">Earlier<"), false);
  assert.equal(html.includes(">Tempo<"), false);
});

test("nothing given: the block as written, no chips, no line, params filled from the tools (Review Focus 1)", () => {
  const html = draw();
  assert.deepEqual(chips(html), []);
  assert.ok(html.includes("Play it at 60."));
  assert.equal(html.includes("selector"), false);
});

test("a block with no moves draws as before, whatever is given", () => {
  const plain: Block = { title: "Plain", cells: [text("Play."), neck(9)] };
  const a = renderToStaticMarkup(<BlockBody block={plain} size="card" />);
  const b = renderToStaticMarkup(<BlockBody block={plain} size="card" given={{ bpm: { now: 70, back: [60] } }} />);
  assert.equal(a, b);
  assert.deepEqual(chips(a), []);
});

test("the title is drawn filled: on a note's page as written, on a plan card in the given key", () => {
  assert.ok(renderToStaticMarkup(<BlockArticle block={block} />).includes(">A minor pentatonic<"));
  const card = renderToStaticMarkup(<ExerciseCard exercise={{ ...block, minutes: 5, given: { keys: { now: [7, 9], back: [] } } }} index={0} />);
  assert.ok(card.includes(">G minor pentatonic<"));
  assert.ok(card.includes('aria-label="G minor pentatonic"'));
});

test("selectorLine: what the selector changes, the earlier values only when there are some, Play only when there is one", () => {
  assert.equal(selectorLine("key", false, false), "The Key selector changes the key of this exercise.");
  assert.equal(selectorLine("key", true, true), 'The Key selector changes the key of this exercise. The keys after "Earlier" are the ones you played it in before. After a change, press Play to start again in the new key.');
  assert.equal(selectorLine("bpm", true, true), 'The Tempo selector changes the tempo of this exercise. The tempos after "Earlier" are the ones you played it at before. After a change, press Play to start again at the new tempo.');
});

test("a chip index past the values: the chips, the text and the tools all stand on the first value", () => {
  const html = draw({ bpm: { now: 70, back: [60] } }, { bpm: 5 });
  assert.ok(html.includes("Play it at 70."));
  assert.ok(/aria-checked="true"[^>]*>70</.test(html));
});

test("a block at a very slow tempo gets the app's line above its first tempo tool; a faster one does not", () => {
  const slowBand: Cell = { type: "tool", tool: { type: "backing-band", bpm: 40, key: 9, parts: { click: "on" } } as PlanTool };
  const at40 = renderToStaticMarkup(<BlockBody block={{ title: "t", cells: [text("Play."), neck(9), text("Now with the click."), slowBand] }} size="card" />);
  assert.ok(at40.includes(slowTempoLine(40)!));
  assert.ok(at40.indexOf("data-slow-tempo") > at40.indexOf("Now with the click."), "the line sits above the tempo tool, not above the block's first tool");
  assert.equal(draw().includes("data-slow-tempo"), false, "60 is not very slow");
  assert.equal(slowTempoLine(51), null);
});
