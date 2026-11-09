"use client";

import type { CSSProperties } from "react";
import { TEXT_MAX, type TextBlock } from "../model/subject";

/** A text widget's blocks as they read in a note: headings, paragraphs. `large` is the stage widget's bigger type, drawn big and then fitted to its box. */
export function TextBlocks({ blocks, large = false }: { blocks: TextBlock[]; large?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((b, i) =>
        b.type === "h1" ? (
          <h2 key={i} className={`font-semibold leading-tight text-slate-50 ${large ? "text-3xl" : "text-2xl sm:text-3xl"}`}>{b.text}</h2>
        ) : b.type === "h2" ? (
          <h3 key={i} className={`font-semibold leading-snug text-slate-100 ${large ? "text-2xl" : "text-xl sm:text-2xl"}`}>{b.text}</h3>
        ) : (
          <p key={i} className={`whitespace-pre-line leading-relaxed text-slate-300 ${large ? "text-xl" : "text-base sm:text-lg"}`}>{b.text}</p>
        ),
      )}
    </div>
  );
}

/** The editable text widget on the stage: a box to type in, with its words shown as they will read once the box is left. */
export default function TextWidget({ text, onChange }: { text: string; onChange: (text: string) => void }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <textarea
        value={text}
        maxLength={TEXT_MAX}
        rows={Math.max(3, text.split("\n").length)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"# A heading\n\nWrite a paragraph. A blank line starts the next one."}
        aria-label="Text"
        spellCheck
        style={{ fieldSizing: "content" } as CSSProperties}
        className="min-h-24 w-full resize-none bg-transparent text-xl leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
      />
    </div>
  );
}
