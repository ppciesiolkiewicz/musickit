"use client";

import { useEffect, useRef } from "react";

/** The longest text a cell keeps, as the parser does. */
const MAX = 4000;

/**
 * A text cell being written: a plain box with spell check on, so the browser's and extensions' writing and AI helpers work in it.
 * Some of them set the value from a script, which React does not report: a native `input` listener catches those too. It grows
 * to its words and never scrolls. A line break is a new line in the note.
 */
export default function TextCell({ text, label, onChange }: { text: string; label: string; onChange: (text: string) => void }) {
  const box = useRef<HTMLTextAreaElement>(null);
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
  useEffect(() => {
    const el = box.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);
  return (
    <textarea
      ref={box}
      value={text}
      maxLength={MAX}
      rows={Math.max(2, text.split("\n").length)}
      onChange={(e) => send(e.target.value)}
      placeholder="Write what to play, what to listen for, what to try next."
      aria-label={label}
      spellCheck
      className="w-full max-w-2xl resize-none overflow-hidden bg-transparent text-base leading-relaxed text-slate-200 outline-none placeholder:text-slate-600 [field-sizing:content] sm:text-lg"
    />
  );
}
