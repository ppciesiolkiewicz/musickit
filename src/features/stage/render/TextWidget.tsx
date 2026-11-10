"use client";

import type { CSSProperties } from "react";
import { TEXT_MAX, type TextBlock } from "../model/subject";

/** A text widget's blocks as they read in a note: a title in the page title's type, headings, paragraphs. `large` is the stage widget's bigger type, drawn big and then fitted to its box. */
export function TextBlocks({ blocks, large = false }: { blocks: TextBlock[]; large?: boolean }) {
  // a heading further down the block stands clear of the paragraph over it
  const over = (i: number) => (i > 0 ? "mt-5" : "");
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) =>
        b.type === "title" ? (
          <h2 key={i} className={`leading-tight text-slate-50 text-balance ${over(i)} ${large ? "text-4xl" : "text-3xl sm:text-4xl"}`} style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' }}>{b.text}</h2>
        ) : b.type === "h1" ? (
          <h2 key={i} className={`font-semibold leading-tight text-slate-50 ${over(i)} ${large ? "text-3xl" : "text-2xl sm:text-3xl"}`}>{b.text}</h2>
        ) : b.type === "h2" ? (
          <h3 key={i} className={`font-semibold leading-snug text-slate-100 ${over(i)} ${large ? "text-2xl" : "text-xl sm:text-2xl"}`}>{b.text}</h3>
        ) : (
          <p key={i} className={`whitespace-pre-line leading-relaxed text-slate-300 ${large ? "text-xl" : "text-base sm:text-lg"}`}>{b.text}</p>
        ),
      )}
    </div>
  );
}

/** The editable text widget on the stage: a box to type in, with its words shown as they will read once the box is left. */
export default function TextWidget({ text, onChange }: { text: string; onChange: (text: string) => void }) {
  // named by its first line, so one text box can be told from the next without seeing the page
  const first = text.split("\n").map((l) => l.replace(/^#{1,3}\s+/, "").trim()).find(Boolean);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <textarea
        value={text}
        maxLength={TEXT_MAX}
        rows={Math.max(3, text.split("\n").length)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"# A title\n\n## A heading\n\nWrite a paragraph. A blank line starts the next one."}
        aria-label={first ? `Text: ${first.slice(0, 60)}` : "Text"}
        spellCheck
        style={{ fieldSizing: "content" } as CSSProperties}
        className="min-h-24 w-full resize-none bg-transparent text-xl leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
      />
    </div>
  );
}
