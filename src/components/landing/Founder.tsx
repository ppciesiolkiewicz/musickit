import type { ReactNode } from "react";
import { DISPLAY } from "./Display";

/**
 * The founder beside a contact form: his photo, a heading, a line in his own words and his name, then the form (`children`).
 * Used where a visitor writes to attunr: the contact card on the home page and the foot of /demo. The photo is the founder's own.
 */
export default function Founder({ id, title, text, children }: { id: string; title: string; text: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- a small square photo, already sized */}
        <img src="/images/founder.jpg" alt="Pio, founder of attunr, playing bass on stage" width={160} height={160} loading="lazy" className="size-28 shrink-0 rounded-full border border-white/15 object-cover shadow-xl shadow-sky-950/50 ring-4 ring-sky-400/15 sm:size-36" />
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-sky-300">Meet the founder</p>
          <h2 id={id} className="text-3xl leading-tight text-slate-50 text-balance" style={DISPLAY}>{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{text}</p>
          <p className="mt-2 text-sm text-slate-400"><b className="text-slate-200">Pio</b>, founder of attunr</p>
        </div>
      </div>
      {children}
    </div>
  );
}
