"use client";

import { useEffect, useRef, type CSSProperties } from "react";
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

/**
 * The editable text widget on the stage: a box to type in, with its words shown as they will read once the box is left.
 * A plain field with spell check on, so the browser's and extensions' writing and AI helpers work in it. Some of them set the
 * field's value from a script, which React does not report as a change: a native `input` listener catches those too.
 */
export default function TextWidget({ text, onChange }: { text: string; onChange: (text: string) => void }) {
  const box = useRef<HTMLTextAreaElement>(null);
  // the words last handed up, so a change reported both by React and by the native listener is sent once
  const sent = useRef(text);
  const change = useRef(onChange);
  useEffect(() => {
    sent.current = text;
    change.current = onChange;
  }, [text, onChange]);
  const send = (v: string) => {
    if (v === sent.current) return;
    sent.current = v;
    change.current(v);
  };
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => send(el.value);
    el.addEventListener("input", read);
    el.addEventListener("change", read);
    return () => {
      el.removeEventListener("input", read);
      el.removeEventListener("change", read);
    };
  }, []);
  // the box grows to its words and never scrolls: CSS does it where `field-sizing` works, else its height follows the text, at any width
  useEffect(() => {
    const el = box.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    const grow = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    grow();
    const ro = new ResizeObserver(grow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  // named by its first line, so one text box can be told from the next without seeing the page
  const first = text.split("\n").map((l) => l.replace(/^#{1,3}\s+/, "").trim()).find(Boolean);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <textarea
        ref={box}
        value={text}
        maxLength={TEXT_MAX}
        rows={Math.max(3, text.split("\n").length)}
        onChange={(e) => send(e.target.value)}
        placeholder={"# A title\n\n## A heading\n\nWrite a paragraph. A blank line starts the next one."}
        aria-label={first ? `Text: ${first.slice(0, 60)}` : "Text"}
        spellCheck
        style={{ fieldSizing: "content" } as CSSProperties}
        className="min-h-24 w-full resize-none overflow-hidden bg-transparent text-xl leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
      />
    </div>
  );
}
