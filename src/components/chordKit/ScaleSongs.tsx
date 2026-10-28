import type { KeyContext } from "@/features/theory/theory";
import { songsFor } from "@/features/theory/songsInKey";

/** "Songs in this key": well-known recordings in this mode and key, so the scale has a sound you already know. Hidden when there are none. */
export default function ScaleSongs({ ctx, className = "" }: { ctx: KeyContext; className?: string }) {
  const songs = songsFor(ctx);
  if (songs.length === 0) return null;
  return (
    <section id="songs" className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${className}`}>
      <h2 className="mb-1 text-sm font-medium text-slate-100">Songs in {ctx.names[0]} {ctx.modeName}</h2>
      <p className="mb-3 text-xs text-slate-400">Well-known recordings in this key. Put one on and play the scale along with it.</p>
      <ul className="flex flex-wrap gap-2">
        {songs.map((x) => (
          <li key={x.title} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-sm text-slate-100">
            {x.title} <span className="text-xs text-slate-400">· {x.artist}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
