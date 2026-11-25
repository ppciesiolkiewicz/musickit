"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { fetchCapabilities, generateSample } from "./client";
import { sampleLibrary } from "./library";
import type { SampleMeta } from "./model/types";
import type { Capabilities } from "./server/providers";
import { sbtn } from "@/components/ui";

const field = "h-7 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100";

/**
 * Add a sample to the library: generate it from a description (ElevenLabs, with the server's key), upload files, or drop them
 * anywhere on `children`. Each new sample goes to `onAdded`. Failures show inline and add nothing.
 */
export default function AddSample({ onAdded, children }: { onAdded: (meta: SampleMeta) => void; children?: ReactNode }) {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(2);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let off = false;
    void fetchCapabilities().then((c) => !off && setCaps(c));
    return () => {
      off = true;
    };
  }, []);

  const provider = caps?.providers[0];
  const canGenerate = !!provider?.server;

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setMessage(null);
    for (const f of Array.from(files)) {
      try {
        onAdded(await sampleLibrary.addFile(f));
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not add the file.");
      }
    }
  };

  const onGenerate = async () => {
    if (!provider || !prompt.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await generateSample({ provider: provider.id, prompt, seconds });
      onAdded(await sampleLibrary.addAudio(blob, prompt.slice(0, 40), "elevenlabs", prompt));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg ${over ? "outline-2 outline-dashed outline-sky-400" : ""}`}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void onFiles(e.dataTransfer.files);
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-1">
        <input className={`${field} min-w-0 flex-1`} value={prompt} maxLength={300} placeholder="Describe a sound: glass hit, soft pad in C" aria-label="Describe a sound" onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void onGenerate()} />
        <input className={`${field} w-14`} type="number" min={provider?.minSeconds ?? 0.5} max={provider?.maxSeconds ?? 22} step={0.5} value={seconds} aria-label="Seconds" title="Seconds" onChange={(e) => setSeconds(Number(e.target.value))} />
        <button type="button" className={sbtn} disabled={!canGenerate || busy || !prompt.trim()} title={canGenerate ? `Generate with ${provider?.label}` : caps ? "Set ELEVENLABS_API_KEY on the server to generate" : "The sampler runs in development only"} aria-label="Generate" onClick={() => void onGenerate()}>
          <Icon name="sparkles" size={13} />{busy ? "…" : ""}
        </button>
        <button type="button" className={sbtn} title="Upload audio files, or drop them here" aria-label="Upload audio files" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={13} />
        </button>
        <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {message && <p role="alert" className="text-xs text-rose-300">{message}</p>}
    </div>
  );
}
