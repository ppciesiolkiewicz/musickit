"use client";

import { useState } from "react";
import Link from "next/link";
import type { Piece } from "@/features/course/glossary";

/** Text from `explain()`: each glossary term keeps its wording, is underlined, and shows its meaning and a link to the article on hover or focus. */
export default function Explained({ pieces }: { pieces: Piece[] }) {
  return pieces.map((p, i) => (typeof p === "string" ? p : <Term key={i} piece={p} />));
}

function Term({ piece }: { piece: Exclude<Piece, string> }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <span
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-help underline decoration-slate-500 decoration-dotted underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
      >
        {piece.text}
      </span>
      {open && (
        // The padding is part of the hover area, so the pointer can move down into the note without closing it.
        <span className="absolute left-1/2 top-full z-30 w-64 -translate-x-1/2 whitespace-normal pt-1.5 text-left text-xs text-slate-300">
          <span className="flex flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-xl">
            <span className="font-medium text-slate-100">{piece.term.label}</span>
            <span>{piece.term.short}</span>
            <Link href={piece.term.href} className="text-sky-300 hover:underline">Read the article →</Link>
          </span>
        </span>
      )}
    </span>
  );
}
