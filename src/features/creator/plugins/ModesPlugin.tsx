"use client";

import { FAMILIES, degreeLabels, relativesOf, rotate, shortModeName, type KeyContext } from "@/features/theory";
import { playMelody } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { Body, Hint, PlayButton } from "./common";

/** Modes that share the key's notes, and how the mode differs from major and minor. Without a key: the major modes from bright to dark. */
export default function ModesPlugin() {
  const { ctx } = useCreatorKey();
  return ctx ? <Key ctx={ctx} /> : <General />;
}

function Key({ ctx }: { ctx: KeyContext }) {
  const { setKey } = useCreatorKey();
  const rel = relativesOf(ctx);
  return (
    <Body title={`Same notes as ${ctx.names[0]} ${ctx.modeName}`}>
      <p className="text-xs text-slate-400">The notes of {rel.parentTonic} {rel.parentName}, started on each of its degrees. Click one to move there.</p>
      <ul className="flex flex-col gap-1">
        {rel.siblings.map((s) => (
          <li key={s.modeIndex}>
            <button type="button" aria-pressed={s.isThis} onClick={() => setKey({ tonicPc: s.tonicPc, family: ctx.familyIndex, mode: s.modeIndex })} className={`flex w-full items-baseline gap-2 rounded-lg border px-2 py-1 text-left text-xs ${s.isThis ? "border-sky-400 bg-sky-500/15 text-sky-100" : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-600"}`}>
              <span className="w-8 font-semibold">{s.tonic}</span>
              <span>{s.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400">
        <b className="text-slate-200">vs major</b> {rel.vsMajor.length ? rel.vsMajor.join(" ") : "identical"} · <b className="text-slate-200">vs minor</b> {rel.vsMinor.length ? rel.vsMinor.join(" ") : "identical"}
      </p>
    </Body>
  );
}

// brightest to darkest: Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian
const BRIGHT_TO_DARK = [3, 0, 4, 1, 5, 2, 6];

function General() {
  const { choice, setMode } = useCreatorKey();
  return (
    <Body title="Major modes, bright to dark" general>
      <Hint>Pick a key above to see the modes that share its notes. Each mode here is the major scale started on another note.</Hint>
      <ul className="flex flex-col gap-1">
        {BRIGHT_TO_DARK.map((k) => {
          const f = FAMILIES[0];
          const on = choice.family === 0 && choice.mode === k;
          return (
            <li key={k}>
              <div className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 text-xs ${on ? "border-sky-400 bg-sky-500/10" : "border-slate-800 bg-slate-950/50"}`}>
                <button type="button" onClick={() => setMode(0, k)} aria-pressed={on} className="w-20 shrink-0 text-left font-medium text-slate-100 hover:text-sky-200">{shortModeName(f.names[k])}</button>
                <span className="min-w-0 flex-1 text-slate-400">{f.info[k].mood}<span className="ml-2 font-mono text-[11px] text-slate-500">{degreeLabels(rotate(f.parent, k)).join(" ")}</span></span>
                <PlayButton onClick={() => playMelody(rotate(f.parent, k).map((s) => 60 + s).concat(72), 280)} label={`Play ${shortModeName(f.names[k])} from C`} />
              </div>
            </li>
          );
        })}
      </ul>
    </Body>
  );
}
