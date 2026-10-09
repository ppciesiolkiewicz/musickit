"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { createPlayer, getAudioContext, getOutputBus } from "@/features/sound";
import { fetchCapabilities, generateSample } from "./client";
import { engineId, guessNote, NOTE_RANGE, nextFreeNote } from "./model/project";
import type { SampleMeta } from "./model/types";
import type { Capabilities } from "./server/providers";
import { useSampler } from "./useSampler";

const SETTINGS = "musickit.sampler.settings";
const btn = "inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-40";
const field = "rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100";

interface Settings {
  sitePassword: string;
  /** a person's own key for each provider, by provider id */
  ownKeys: Record<string, string>;
  remember: boolean;
}

function readSettings(): Settings {
  try {
    const v = JSON.parse(window.localStorage.getItem(SETTINGS) ?? "null");
    if (v && typeof v === "object") {
      const keys: Record<string, string> = {};
      if (v.ownKeys && typeof v.ownKeys === "object") for (const [k, x] of Object.entries(v.ownKeys)) keys[k] = String(x);
      else if (v.ownKey) keys.elevenlabs = String(v.ownKey);
      return { sitePassword: String(v.sitePassword ?? v.accessCode ?? ""), ownKeys: keys, remember: Boolean(v.remember) };
    }
  } catch {
    /* ignore */
  }
  return { sitePassword: "", ownKeys: {}, remember: false };
}

async function preview(blob: Blob) {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(getOutputBus());
  src.start();
}

export default function SamplerApp() {
  const s = useSampler();
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [settings, setSettings] = useState<Settings>({ sitePassword: "", ownKeys: {}, remember: false });
  const [showKeys, setShowKeys] = useState(false);
  const [providerId, setProviderId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(3);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(readSettings());
    void fetchCapabilities().then(setCaps);
  }, []);

  const saveSettings = (next: Settings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS, JSON.stringify(next.remember ? next : { ...next, ownKeys: {} }));
    } catch {
      /* ignore */
    }
  };

  const instrument = s.project.instruments.find((i) => i.id === current) ?? s.project.instruments[0] ?? null;
  const provider = caps?.providers.find((p) => p.id === providerId) ?? caps?.providers[0];
  const ownKey = (provider && settings.ownKeys[provider.id]) || "";
  const canGenerate = Boolean(provider) && (Boolean(ownKey.trim()) || Boolean(provider?.server && settings.sitePassword.trim()));
  const sampleName = (id: string) => s.project.samples.find((x) => x.id === id)?.name ?? "?";

  const put = (sample: SampleMeta, name?: string) => {
    if (!instrument) return;
    s.setPad(instrument.id, guessNote(name ?? sample.name) ?? nextFreeNote(instrument.pads), sample.id);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setMessage(null);
    for (const f of Array.from(files)) {
      try {
        await getAudioContext().decodeAudioData(await f.arrayBuffer());
      } catch {
        setMessage(`${f.name} is not audio this browser can play.`);
        continue;
      }
      const meta = await s.addAudio(f, f.name, "upload");
      put(meta, f.name);
    }
  };

  const onGenerate = async () => {
    if (!provider || !prompt.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await generateSample({ provider: provider.id, prompt, seconds, sitePassword: settings.sitePassword, ownKey });
      const meta = await s.addAudio(blob, prompt.slice(0, 40), "elevenlabs", prompt);
      put(meta);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const testNote = (note: string) => {
    if (!instrument) return;
    const p = createPlayer({ instrumentId: engineId(instrument.id) });
    p.noteOn(note);
    window.setTimeout(() => p.noteOff(note), 900);
  };

  const download = async () => {
    const blob = await s.exportAll();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "musickit-sampler.json";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const err = message ?? s.error;

  return (
    <div
      className={`grid gap-3 rounded-xl lg:grid-cols-2 ${over ? "outline outline-2 outline-dashed outline-sky-400" : ""}`}
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
      <section aria-label="Samples" className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-slate-100">Samples</h2>
          <span className="ml-auto flex gap-1">
            <button type="button" className={btn} title="Upload audio files, or drop them anywhere here" aria-label="Upload audio files" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={14} />
            </button>
            <button type="button" className={btn} title="Save the whole project to a file" aria-label="Export project" onClick={() => void download()}>
              <Icon name="download" size={14} />
            </button>
            <button type="button" className={btn} title="Load a project file" aria-label="Import project" onClick={() => importRef.current?.click()}>
              <Icon name="rotate-ccw" size={14} />
            </button>
          </span>
          <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then(s.importAll); e.target.value = ""; }} />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <input className={`${field} min-w-0 flex-1`} value={prompt} maxLength={300} placeholder="Describe a sound: soft sine pad, C3" aria-label="Describe a sound" onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void onGenerate()} />
          <input className={`${field} w-14`} type="number" min={provider?.minSeconds ?? 0.5} max={provider?.maxSeconds ?? 22} step={0.5} value={seconds} aria-label="Seconds" title="Seconds" onChange={(e) => setSeconds(Number(e.target.value))} />
          <button type="button" className={btn} disabled={!canGenerate || busy || !prompt.trim()} title={canGenerate ? `Generate with ${provider?.label}` : "Needs a key: open the key settings"} aria-label="Generate" onClick={() => void onGenerate()}>
            <Icon name="sparkles" size={14} />
            {busy ? "…" : ""}
          </button>
          <button type="button" className={btn} aria-pressed={showKeys} title="Keys and access" aria-label="Keys and access" onClick={() => setShowKeys(!showKeys)}>
            <Icon name="key-round" size={14} />
          </button>
        </div>

        {showKeys && (
          <div className="grid gap-1 rounded-md border border-slate-800 p-2 text-xs text-slate-400">
            {caps && caps.providers.length > 1 && (
              <label className="flex items-center gap-2">
                Provider
                <select className={`${field} flex-1`} value={provider?.id ?? ""} onChange={(e) => setProviderId(e.target.value)}>
                  {caps.providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2">
              Site password
              <input className={`${field} flex-1`} type="password" autoComplete="off" value={settings.sitePassword} placeholder={provider?.server ? `unlocks this site's ${provider.label} key` : "this site holds no key for this provider"} disabled={!provider?.server} onChange={(e) => saveSettings({ ...settings, sitePassword: e.target.value })} />
            </label>
            <label className="flex items-center gap-2">
              Your {provider?.label ?? "provider"} key
              <input className={`${field} flex-1`} type="password" autoComplete="off" value={ownKey} onChange={(e) => provider && saveSettings({ ...settings, ownKeys: { ...settings.ownKeys, [provider.id]: e.target.value } })} />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.remember} onChange={(e) => saveSettings({ ...settings, remember: e.target.checked })} />
              Remember my keys in this browser
            </label>
          </div>
        )}
        {err && <p role="alert" className="text-xs text-rose-300">{err}</p>}

        <ul className="flex max-h-[28rem] flex-col gap-1 overflow-auto">
          {s.project.samples.length === 0 && <li className="text-xs text-slate-500">No samples yet. Upload files or generate one.</li>}
          {s.project.samples.map((x) => (
            <li key={x.id} className="flex items-center gap-1 rounded-md border border-slate-800 px-2 py-1">
              <button type="button" className={btn} title="Play" aria-label={`Play ${x.name}`} onClick={() => void s.getAudio(x.id).then((b) => b && preview(b))}>
                <Icon name="play" size={12} />
              </button>
              <input className="min-w-0 flex-1 bg-transparent text-xs text-slate-100 outline-none focus-visible:underline" value={x.name} aria-label="Sample name" title={x.prompt ?? x.name} onChange={(e) => s.renameSample(x.id, e.target.value)} />
              <span className="text-[10px] text-slate-500">{x.source === "upload" ? "file" : x.source}</span>
              <button type="button" className={btn} disabled={!instrument} title="Put on a pad" aria-label={`Put ${x.name} on a pad`} onClick={() => put(x)}>
                <Icon name="plus" size={12} />
              </button>
              <button type="button" className={btn} title="Delete" aria-label={`Delete ${x.name}`} onClick={() => void s.removeSample(x.id)}>
                <Icon name="trash" size={12} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Instruments" className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-center gap-1">
          <h2 className="mr-1 text-sm font-medium text-slate-100">Instruments</h2>
          <select className={`${field} min-w-0 flex-1`} aria-label="Instrument" value={instrument?.id ?? ""} onChange={(e) => setCurrent(e.target.value)}>
            {s.project.instruments.map((i) => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
          <button type="button" className={btn} title="New instrument" aria-label="New instrument" onClick={() => setCurrent(s.addInstrument(`Instrument ${s.project.instruments.length + 1}`))}>
            <Icon name="plus" size={14} />
          </button>
          {instrument && (
            <button type="button" className={btn} title="Delete instrument" aria-label="Delete instrument" onClick={() => s.removeInstrument(instrument.id)}>
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>

        {!instrument && <p className="text-xs text-slate-500">Create an instrument, then put samples on its pads. It then shows up in every instrument picker.</p>}

        {instrument && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <input className={`${field} w-40`} value={instrument.label} aria-label="Instrument name" onChange={(e) => s.renameInstrument(instrument.id, e.target.value)} />
              <label className="flex items-center gap-1" title="Fade in, seconds">
                <Icon name="activity" size={12} />
                <input type="range" min={0} max={1} step={0.01} value={instrument.attack} aria-label="Attack" onChange={(e) => s.setEnvelope(instrument.id, Number(e.target.value), instrument.release)} />
              </label>
              <label className="flex items-center gap-1" title="Fade out, seconds">
                <Icon name="volume-1" size={12} />
                <input type="range" min={0.02} max={3} step={0.01} value={instrument.release} aria-label="Release" onChange={(e) => s.setEnvelope(instrument.id, instrument.attack, Number(e.target.value))} />
              </label>
            </div>
            <ul className="flex max-h-[28rem] flex-col gap-1 overflow-auto">
              {Object.keys(instrument.pads)
                .sort((a, b) => NOTE_RANGE.indexOf(a) - NOTE_RANGE.indexOf(b))
                .map((note) => (
                  <li key={note} className="flex items-center gap-1 rounded-md border border-slate-800 px-2 py-1">
                    <select className={field} aria-label="Note" value={note} onChange={(e) => s.movePad(instrument.id, note, e.target.value)}>
                      {NOTE_RANGE.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{sampleName(instrument.pads[note])}</span>
                    <button type="button" className={btn} title="Play this note" aria-label={`Play ${note}`} onClick={() => testNote(note)}>
                      <Icon name="piano" size={12} />
                    </button>
                    <button type="button" className={btn} title="Remove pad" aria-label={`Remove pad ${note}`} onClick={() => s.clearPad(instrument.id, note)}>
                      <Icon name="x" size={12} />
                    </button>
                  </li>
                ))}
              {Object.keys(instrument.pads).length === 0 && <li className="text-xs text-slate-500">No pads. Use + on a sample.</li>}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
