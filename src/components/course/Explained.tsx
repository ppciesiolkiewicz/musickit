"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { eachLine, keepTogether, type Piece } from "@/features/course/glossary";
import { TERM_FIGURES } from "./termFigures";

/** Loaded when a note with a picture first opens, so a page of text doesn't carry the sound engine. */
const TermFigure = dynamic(() => import("./TermFigure"), { ssr: false });

/**
 * Text from `explain()`: each glossary term keeps its wording, is underlined, and shows its meaning and a link to the article
 * on hover or focus. `link` false leaves the link out: on a public page (/learn) the course needs a login.
 */
export default function Explained({ pieces, link = true }: { pieces: Piece[]; link?: boolean }) {
  return pieces.map((p, i) => (typeof p === "string" ? keepTogether(p) : <Term key={i} piece={p} link={link} />));
}

/** distance kept from the window's edges */
const EDGE = 8;
/** the note's width (w-64), narrowed on a phone to fit between the edges */
const WIDTH = 256;

/**
 * The note is drawn in a portal with fixed coordinates, so a parent that clips (a scroll box, a card) can't cut it off,
 * and it is placed inside the window: moved in from a side edge, and above the word when there is no room below.
 */
function Term({ piece, link }: { piece: Exclude<Piece, string>; link: boolean }) {
  const [open, setOpen] = useState(false);
  const word = useRef<HTMLSpanElement>(null);
  const note = useRef<HTMLSpanElement>(null);
  const line = eachLine(piece);

  useLayoutEffect(() => {
    if (!open) return;
    const put = () => {
      const w = word.current, n = note.current;
      if (!w || !n) return;
      const r = w.getBoundingClientRect();
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const width = Math.min(WIDTH, vw - 2 * EDGE);
      const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, EDGE), vw - width - EDGE);
      n.style.left = `${left}px`;
      n.style.width = `${width}px`;
      const h = n.offsetHeight;
      const above = r.bottom + h > vh - EDGE && r.top - h >= EDGE;
      n.style.top = above ? "" : `${r.bottom}px`;
      n.style.bottom = above ? `${vh - r.top}px` : "";
      n.style.paddingTop = above ? "0" : "6px";
      n.style.paddingBottom = above ? "6px" : "0";
      n.style.visibility = "visible";
    };
    put();
    window.addEventListener("scroll", put, true);
    window.addEventListener("resize", put);
    return () => {
      window.removeEventListener("scroll", put, true);
      window.removeEventListener("resize", put);
    };
  }, [open]);

  // A tap opens the note through focus; a tap inside it (on its text or link) keeps it open, a tap anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!word.current?.contains(t) && !note.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <span
        ref={word}
        tabIndex={0}
        onFocus={() => setOpen(true)}
        // Tabbing away closes it; a blur from a tap is left to the pointerdown check above.
        onBlur={(e) => e.relatedTarget && !note.current?.contains(e.relatedTarget) && setOpen(false)}
        className="cursor-help whitespace-nowrap underline decoration-slate-500 decoration-dotted underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
      >
        {piece.text}
      </span>
      {open &&
        createPortal(
          // The padding is part of the hover area and touches the word, so the pointer can move into the note without closing it.
          // Events from a portal still reach the word's parent in React, so hovering the note keeps it open.
          <span
            ref={note}
            style={{ left: 0, top: 0, width: WIDTH, visibility: "hidden" }}
            className="fixed z-50 block whitespace-normal text-left text-xs text-slate-300"
          >
            <span className="flex flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-xl">
              <span className="font-medium text-slate-100">{piece.term.label}</span>
              <span>{piece.term.short}</span>
              {line && <span className="text-slate-200">{line}</span>}
              {TERM_FIGURES[piece.term.id] && <TermFigure id={piece.term.id} />}
              {link && <Link href={piece.term.href} target="_blank" rel="noopener" className="text-sky-300 hover:underline">Read the article →</Link>}
            </span>
          </span>,
          document.body,
        )}
    </span>
  );
}
