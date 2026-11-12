"use client";

import { useCallback, useState } from "react";
import { GRID_COLUMNS, gridLayers, gridSpan, type Layer, type Stage } from "../model/layers";
import { isPage, parseText } from "../model/subject";
import HeadphonesNotice from "./HeadphonesNotice";
import { FlowInBox, ShapeReport } from "./shape";
import { TextBlocks } from "./TextWidget";

/** Types of widget (a quarter or a third of a row on the grid) are never drawn narrower than this share of the article's column. */
const MIN_SHARE = 0.4;

/** One widget in the article: as wide as it was set by hand on the grid, else as its kind is there (at least MIN_SHARE), in the shape of its own content, centred. A page grows to its content: nothing scrolls inside. */
function Figure({ layer, children }: { layer: Layer; children: (readOnly: true) => React.ReactNode }) {
  const [aspect, setAspect] = useState<number | null>(null);
  const report = useCallback((a: number) => setAspect((cur) => (cur === a ? cur : a)), []);
  const page = isPage(layer.subject);
  // a tune or a run streams across its staff, and a backing track lays its bars out in a row, so each takes the whole column, as a neck does
  const wide = layer.subject.kind === "tool" && (layer.subject.tool.type === "melody-singer" || layer.subject.tool.type === "run-singer" || layer.subject.tool.type === "backing-track");
  // a width set by hand on the grid is kept
  const share = page ? 1 : layer.gridWidth !== undefined ? layer.gridWidth : layer.subject.kind === "neck" || layer.subject.kind === "position" || wide ? 1 : Math.max(MIN_SHARE, gridSpan(layer) / GRID_COLUMNS);
  return (
    <figure className="mx-auto w-full" style={{ maxWidth: `${share * 100}%` }}>
      <div className={`overflow-hidden rounded-xl bg-slate-950 ring-1 ring-slate-800 [container-type:inline-size]`} style={{ aspectRatio: aspect ?? 16 / 9 }}>
        <ShapeReport.Provider value={report}>
          <FlowInBox.Provider value>{children(true)}</FlowInBox.Provider>
        </ShapeReport.Provider>
      </div>
    </figure>
  );
}

/**
 * The space over a block, so the page reads in sections: a text that opens with a heading starts one, well clear of what came before;
 * a widget sits close under the words about it; anything else keeps an even step.
 */
function spaceOver(l: Layer, before: Layer | undefined): string {
  if (!before) return "";
  if (l.subject.kind === "headphones") return "mt-6";
  if (l.subject.kind === "text") return /^(title|h1|h2)$/.test(parseText(l.subject.text)[0]?.type ?? "") ? "mt-12 sm:mt-14" : "mt-6";
  return before.subject.kind === "text" || before.subject.kind === "headphones" ? "mt-5" : "mt-6";
}

/**
 * A shared note, read as an article: its text and widgets in one column, in the order they were put on the stage's grid, with nothing to
 * edit, drag, add or share. Widgets still play (a neck rings its notes, a staff plays) but pin nothing and change nothing.
 */
export default function NoteArticle({ stage, renderLayer }: { stage: Stage; renderLayer: (l: Layer, readOnly: true) => React.ReactNode }) {
  const layers = gridLayers(stage).filter((l) => l.visible && !(l.subject.kind === "text" && !l.subject.text.trim()));
  if (layers.length === 0) return <p className="text-slate-400">This note is empty.</p>;
  return (
    <article className="mx-auto flex w-full flex-col" aria-label="Note">
      {layers.map((l, i) =>
        l.subject.kind === "text" ? (
          <div key={l.id} className={`mx-auto w-full max-w-2xl ${spaceOver(l, layers[i - 1])}`}>
            <TextBlocks blocks={parseText(l.subject.text)} />
          </div>
        ) : l.subject.kind === "headphones" ? (
          // a notice reads with the words, in their column, not as a framed widget
          <div key={l.id} className={`mx-auto w-full max-w-2xl ${spaceOver(l, layers[i - 1])}`}>
            <HeadphonesNotice />
          </div>
        ) : (
          <div key={l.id} className={spaceOver(l, layers[i - 1])}>
            <Figure layer={l}>
              {(ro) => renderLayer(l, ro)}
            </Figure>
          </div>
        ),
      )}
    </article>
  );
}
