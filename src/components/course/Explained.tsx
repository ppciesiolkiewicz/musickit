"use client";

import Link from "next/link";
import { InfoTip } from "@/components/ui";
import type { Piece } from "@/features/course/glossary";

/** Text from `explain()`: each glossary term keeps its wording and gets an (i) with its meaning and a link to the article. */
export default function Explained({ pieces }: { pieces: Piece[] }) {
  return pieces.map((p, i) =>
    typeof p === "string" ? p : (
      <span key={i} className="whitespace-nowrap">
        <span className="underline decoration-slate-500 decoration-dotted underline-offset-2">{p.text}</span>{" "}
        <span className="inline-block align-middle">
          <InfoTip label={`What is ${p.term.label.toLowerCase()}?`} hover align="center">
            <span className="font-medium text-slate-100">{p.term.label}</span>
            <span>{p.term.short}</span>
            <Link href={p.term.href} className="text-sky-300 hover:underline">Read the article →</Link>
          </InfoTip>
        </span>
      </span>
    ));
}
