"use client";

import { useState } from "react";
import { makeKeyContext } from "@/features/theory";
import { arpeggioMidi, buildArpeggio } from "@/lib/chordKit/arpeggios";
import { strum } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { Select } from "@/components/ui";
import { Body, Hint } from "./common";

const KINDS = [
  { id: "triad", label: "Triads" },
  { id: "seventh", label: "7ths" },
  { id: "ninth", label: "9ths" },
];

/** The arpeggio on every degree of the key, note by note with its chord tone. Click one to hear it. With no key: C major. */
export default function ArpeggiosPlugin() {
  const { ctx, title } = useCreatorKey();
  const [kind, setKind] = useState(1);
  const key = ctx ?? makeKeyContext(0, 0, 0);
  const k = KINDS[kind];
  return (
    <Body title={ctx ? `Arpeggios in ${title}` : "Arpeggios"} general={!ctx} aside={<Select size="xs" aria-label="Triads, sevenths or ninths" value={kind} onChange={setKind} options={KINDS.map((x, i) => ({ value: i, label: x.label }))} />}>
      {!ctx && <Hint>Pick a key above to see its arpeggios. Until then, C major.</Hint>}
      <ul className="flex flex-col gap-1">
        {key.chords.map((c) => {
          const arp = buildArpeggio(key, c.degree, k.id);
          return (
            <li key={c.degree}>
              <button type="button" onClick={() => strum(arpeggioMidi(arp), { gapMs: 200, holdMs: 600 })} className="cursor-pointer flex w-full items-baseline gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-left text-xs hover:border-sky-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                <span className="w-9 shrink-0 text-slate-500">{c.roman}</span>
                <span className="w-20 shrink-0 font-medium text-slate-100">{arp.title.replace(/ arpeggio$/, "")}</span>
                <span className="min-w-0 truncate text-slate-300">{arp.notes.map((n) => <span key={n.role} className="mr-2">{n.name}<sub className="ml-0.5 text-slate-500">{n.role}</sub></span>)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Body>
  );
}
