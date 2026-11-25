"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { midiToName } from "@/features/sound";
import AddSample from "./AddSample";
import { detectSampleRoot, previewSample, sampleLibrary, useSampleLibrary } from "./library";
import { tbtn } from "@/components/ui";

/** A sample's name, edited as typed and saved (trimmed) on blur or Enter, so spaces between words survive. */
function NameField({ id, name, title }: { id: string; name: string; title: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) sampleLibrary.rename(id, draft);
    setDraft(null);
  };
  return (
    <input className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none focus-visible:underline" value={draft ?? name} aria-label="Sample name" title={title}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setDraft(null); }} />
  );
}

/** The sample library of this browser: generate (with the server's ElevenLabs key), upload or drop, play, rename, find the note, delete. */
export default function SamplerLab() {
  const lib = useSampleLibrary();
  const [roots, setRoots] = useState<Record<string, string>>({});
  const detect = async (id: string) => {
    const root = await detectSampleRoot(id).catch(() => null);
    setRoots((r) => ({ ...r, [id]: root === null ? "No clear pitch" : midiToName(root) }));
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-400">Samples are kept in this browser (IndexedDB <code>musickit-sampler</code>). Generating uses <code>ELEVENLABS_API_KEY</code> and works in development only.</p>
      <AddSample onAdded={() => undefined}>
        <ul className="flex flex-col gap-1 rounded-lg border border-slate-800 p-2" aria-label="Samples">
          {!lib.ready && <li className="text-sm text-slate-500">Loading…</li>}
          {lib.ready && lib.samples.length === 0 && <li className="text-sm text-slate-500">No samples yet. Generate one, or drop audio files here.</li>}
          {lib.samples.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-900">
              <button type="button" className={tbtn} title="Play" aria-label={`Play ${s.name}`} onClick={() => void previewSample(s.id)}><Icon name="play" size={12} /></button>
              <NameField id={s.id} name={s.name} title={s.prompt ?? s.name} />
              <span className="text-xs text-slate-500">{s.source === "elevenlabs" ? "generated" : "uploaded"} · {Math.round(s.bytes / 1024)} KB</span>
              <button type="button" className={tbtn} title="Find the note it sounds at" aria-label={`Find the note of ${s.name}`} onClick={() => void detect(s.id)}><Icon name="activity" size={12} /></button>
              {roots[s.id] && <span className="w-24 text-xs text-slate-300">{roots[s.id]}</span>}
              <button type="button" className={`${tbtn} hover:!border-rose-400`} title="Delete" aria-label={`Delete ${s.name}`} onClick={() => { if (window.confirm(`Delete ${s.name}?`)) void sampleLibrary.remove(s.id); }}><Icon name="trash" size={12} /></button>
            </li>
          ))}
        </ul>
      </AddSample>
      {lib.error && <p role="alert" className="text-sm text-rose-300">{lib.error}</p>}
    </div>
  );
}
