"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { squeeze, type CopyNote } from "../model/copyNotes";

/*
 * Where this page's text notes sit: a dashed outline round each text a note was made on, with the note beside it; a
 * click opens the page's notes. The text is found again by its wording and its place in the page (`placesOf`, as
 * `CopyNotes` saved them), so the marks follow it as it renders, scrolls or moves, and go when it does. Section notes
 * show under their sections and are left out.
 */

interface Mark {
  note: CopyNote;
  rect: { top: number; left: number; width: number; height: number };
}

/** The elements whose text is `text`, innermost only (a wrapper with the same text is the same place). */
function elementsOf(text: string, root: string): HTMLElement[] {
  const head = text.replace(/…$/, "").slice(0, 24);
  const hits = [...document.body.querySelectorAll<HTMLElement>("*")].filter(
    (e) => !e.closest(`[${root}]`) && squeeze(e.textContent ?? "").includes(head) && squeeze(e.innerText ?? "") === text,
  );
  return hits.filter((e) => !hits.some((o) => o !== e && e.contains(o)));
}

/** An element's children, leaving out the notes' own (they come and go, and would shift the indexes). */
const kids = (el: Element, root: string) => [...el.children].filter((c) => !c.hasAttribute(root));

/** Where `el` sits in the page: tag and index among its parent's children, per level from <body> ("div1>main0>p3"). */
export function pathOf(el: Element, root: string): string {
  const steps: string[] = [];
  for (let e: Element | null = el; e && e !== document.body && e.parentElement; e = e.parentElement)
    steps.unshift(`${e.tagName.toLowerCase()}${kids(e.parentElement, root).indexOf(e)}`);
  return steps.join(">");
}

/** The element at `path`, when each level still has that tag there. */
function atPath(path: string, root: string): Element | null {
  let el: Element | null = document.body;
  for (const step of path.split(">")) {
    const [, tag, i] = /^(.+?)(\d+)$/.exec(step) ?? [];
    el = el && tag ? kids(el, root)[Number(i)] ?? null : null;
    if (!el || el.tagName.toLowerCase() !== tag) return null;
  }
  return el;
}

/**
 * Where a text note's text is now: the element at its path when that one still reads the noted text, else every element
 * that does; when none does (its text changed, or it was read from an SVG), the element at its path.
 */
export function placesOf(note: Pick<CopyNote, "text" | "path">, root: string): Element[] {
  const hits = elementsOf(note.text, root);
  const at = note.path ? atPath(note.path, root) : null;
  if (at && hits.includes(at as HTMLElement)) return [at];
  return hits.length ? hits : at ? [at] : [];
}

export function TextNoteMarks({ notes, root, onOpen }: { notes: CopyNote[]; root: string; onOpen: (id: string) => void }) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const texts = notes.filter((n) => !n.section);

  useEffect(() => {
    if (!texts.length) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setMarks(
          texts.flatMap((note) =>
            placesOf(note, root).flatMap((el) => {
              const r = el.getBoundingClientRect();
              return r.width || r.height ? [{ note, rect: { top: r.top, left: r.left, width: r.width, height: r.height } }] : [];
            }),
          ),
        ),
      );
    };
    measure();
    // the text may render late (a card opened, data loaded): look again now and then
    const timer = setInterval(measure, 1000);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [texts.map((n) => `${n.id}\u0000${n.text}\u0000${n.path}\u0000${n.note}`).join("\u0001"), root]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed by the notes' content

  if (!texts.length || !marks.length) return null;
  return (
    <div {...{ [root]: "" }} className="pointer-events-none fixed inset-0 z-[1999]">
      {marks.map(({ note, rect }, i) => (
        <div key={`${note.id}-${i}`} style={{ top: rect.top - 3, left: rect.left - 3, width: rect.width + 6, height: rect.height + 6 }} className="absolute rounded-md outline-2 outline-dashed outline-amber-400/80">
          <button
            type="button"
            onClick={() => onOpen(note.id)}
            title={note.note}
            // beside the text when there is room, else above its right end
            className={`pointer-events-auto absolute ${rect.left + rect.width + 280 < window.innerWidth ? "left-full top-0 ml-2" : "bottom-full right-0 mb-1"} flex max-w-64 cursor-pointer items-center gap-1 truncate rounded-md border border-amber-400/50 bg-slate-950/95 px-1.5 py-0.5 text-left text-[11px] text-amber-100 shadow hover:bg-amber-500/25`}
          >
            <Icon name="pencil" size={10} className="shrink-0" />
            <span className="truncate">{note.note}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
