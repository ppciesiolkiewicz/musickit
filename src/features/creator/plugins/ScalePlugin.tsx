"use client";

import { FAMILIES, degreeColour, degreeLabels, rotate, scaleToneCaption, scaleToneLabel, shortModeName, stepPattern, type KeyContext } from "@/features/theory";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { playMelody } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { keySignature, scaleMidis } from "../model/key";
import { Body, Hint, PlayButton } from "./common";

/** The notes of the key: spelled, numbered and coloured by degree, with the step pattern and what the mode is for. */
export default function ScalePlugin() {
  const { ctx, choice, title } = useCreatorKey();
  return ctx ? <Key ctx={ctx} title={title} sig={keySignature(choice)} /> : <General />;
}

function Key({ ctx, title, sig }: { ctx: KeyContext; title: string; sig: ReturnType<typeof keySignature> }) {
  const info = FAMILIES[ctx.familyIndex].info[ctx.modeIndex];
  const degs = degreeLabels(ctx.steps);
  const [system] = useLabelSystem();
  const pattern = stepPattern(ctx.steps);
  return (
    <Body title={title} aside={<PlayButton onClick={() => playMelody(scaleMidis(ctx), 320)} label={`Play ${title}`} />}>
      <ol className="flex flex-wrap gap-1.5" aria-label="Notes of the scale">
        {ctx.names.map((n, i) => (
          <li key={i} className="flex w-12 flex-col items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-950/60 py-1.5">
            <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-semibold text-slate-950" style={{ background: degreeColour(i) }} title={n}>{scaleToneLabel(system, ctx, i)}</span>
            <span className="text-xs text-slate-300">{scaleToneCaption(system, ctx, i)}</span>
            <span className="text-[10px] text-slate-500">{pattern[i]}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-400">
        <b className="text-slate-200">Steps</b> {pattern.join(" ")} · <b className="text-slate-200">Formula</b> {degs.join(" ")}
        {sig && <> · <b className="text-slate-200">Signature</b> {sig.kind === "none" ? "no ♯ or ♭" : `${sig.count} ${sig.kind === "sharps" ? "sharp" : "flat"}${sig.count === 1 ? "" : "s"}`}</>}
      </p>
      <p className="text-xs leading-relaxed text-slate-300"><b className="text-slate-200">Makes it:</b> {info.char} <b className="text-slate-200">Sound:</b> {info.mood} <b className="text-slate-200">Use:</b> {info.use}</p>
    </Body>
  );
}

/** No key: every mode as a formula; choosing one fixes the mode and waits for a tonic. */
function General() {
  const { choice, setMode } = useCreatorKey();
  return (
    <Body title="Scales and modes" general>
      <Hint>Pick a key above to see its notes. Until then, the 21 modes by their formula (click one to choose it).</Hint>
      {FAMILIES.map((f, fi) => (
        <div key={f.id} className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">{f.label}</div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {f.names.map((nm, mi) => {
              const on = choice.family === fi && choice.mode === mi;
              return (
                <li key={nm}>
                  <button type="button" onClick={() => setMode(fi, mi)} aria-pressed={on} className={`flex w-full items-baseline gap-2 rounded-lg border px-2 py-1 text-left text-xs ${on ? "border-sky-400 bg-sky-500/15 text-sky-100" : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-600"}`}>
                    <span className="w-24 shrink-0 font-medium">{shortModeName(nm)}</span>
                    <span className="truncate font-mono text-[11px] text-slate-400">{degreeLabels(rotate(f.parent, mi)).join(" ")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </Body>
  );
}
