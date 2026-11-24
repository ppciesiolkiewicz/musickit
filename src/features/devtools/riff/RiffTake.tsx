"use client";

import { useEffect, useRef, useState } from "react";
import { getAudioContext, readDeviceChoice } from "@/features/sound";
import { clockTime } from "@/features/recorder/recorder";
import { pickVideoType, videoFileName } from "@/features/videos/recording";
import { asciiTab, type RiffNote } from "./riff";
import { deleteTake, getTake, saveTake, type RiffTake as Take } from "./takes";
import { hearNotes, toRiff } from "./transcribe";

type Phase = "off" | "starting" | "ready" | "recording";
/** where the take on screen stands in this browser's storage */
type Stored = "saving" | "saved" | "failed";

/** A take stops itself here, so a forgotten one doesn't fill the disk. */
const MAX_SECONDS = 180;
const btn = "rounded bg-slate-800 px-3 py-1 text-sm disabled:opacity-40";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Records the riff being played, with the camera and the audio input, and keeps the take with the riff in this browser: it is saved
 * when the recording stops, and **Save file** downloads it. **Transcribe** hears the take's notes (`transcribe.ts`) and hands them to
 * `onNotes`, to replace the riff's notes or to follow them.
 */
export default function RiffTake({ riff, name, bpm, pos, onNotes }: { riff: string; name: string; bpm: number; pos: number; onNotes: (notes: RiffNote[], replace: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>("off");
  const [problem, setProblem] = useState("");
  // the take and its address for the player
  const [shown, setShown] = useState<{ take: Take; url: string } | null>(null);
  const take = shown?.take ?? null;
  const url = shown?.url ?? "";
  const shownUrl = useRef("");
  const [stored, setStored] = useState<Stored>("saved");
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<RiffNote[] | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const live = useRef<HTMLVideoElement>(null);

  /** Put a take (or none) on screen, letting go of the last one's address. */
  const show = (t: Take | null) => {
    if (shownUrl.current) URL.revokeObjectURL(shownUrl.current);
    shownUrl.current = t ? URL.createObjectURL(t.blob) : "";
    setShown(t ? { take: t, url: shownUrl.current } : null);
  };
  const stopCamera = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };

  // the take kept with this riff
  useEffect(() => {
    let gone = false;
    void getTake(riff).then((t) => { if (!gone && t) { show(t); setStored("saved"); } });
    return () => { gone = true; if (shownUrl.current) URL.revokeObjectURL(shownUrl.current); shownUrl.current = ""; };
  }, [riff]);
  // let go of the camera when the panel closes
  useEffect(() => () => { if (recorder.current?.state === "recording") { recorder.current.onstop = null; recorder.current.stop(); } stopCamera(); }, []);
  useEffect(() => { if (live.current && (phase === "ready" || phase === "recording")) live.current.srcObject = stream.current; }, [phase]);
  useEffect(() => {
    if (phase !== "recording") return;
    const from = performance.now();
    const id = window.setInterval(() => {
      const s = (performance.now() - from) / 1000;
      setSeconds(s);
      if (s >= MAX_SECONDS) recorder.current?.stop();
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  const store = async (t: Take) => {
    setStored("saving");
    try { await saveTake(t); setStored("saved"); } catch (e) { setStored("failed"); setProblem(`The browser didn't store this take: ${message(e)}. Press Save to try again, or Save file to keep it on disk.`); }
  };

  const startCamera = async () => {
    setProblem("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { setProblem("This browser can't record video."); return; }
    setPhase("starting");
    try {
      // the guitar as it is: no echo cancelling, noise removal or level riding, which smear the picks and bend the pitch
      const input = readDeviceChoice().input;
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, ...(input ? { deviceId: { ideal: input.id } } : {}) },
      });
      setPhase("ready");
    } catch (e) {
      setPhase("off");
      setProblem(`The camera or the microphone didn't open: ${message(e)}. Allow both in the address bar, then press Start camera.`);
    }
  };

  const record = () => {
    const s = stream.current;
    if (!s) return;
    const type = pickVideoType((t) => MediaRecorder.isTypeSupported(t));
    const chunks: Blob[] = [];
    let r: MediaRecorder;
    try { r = new MediaRecorder(s, type ? { mimeType: type } : undefined); } catch (e) { setProblem(`The recording didn't start: ${message(e)}.`); return; }
    const from = performance.now();
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onerror = () => setProblem("The recording stopped with an error. Record the take again.");
    r.onstop = () => {
      const recorded = r.mimeType || type || "video/webm";
      const t: Take = { id: riff, blob: new Blob(chunks, { type: recorded }), type: recorded, seconds: Math.round((performance.now() - from) / 1000), at: Date.now() };
      stopCamera();
      setPhase("off");
      setHeard(null);
      show(t);
      void store(t);
    };
    recorder.current = r;
    r.start(1000);
    setSeconds(0);
    setProblem("");
    setPhase("recording");
  };

  const remove = async () => {
    setProblem("");
    try { await deleteTake(riff); show(null); setHeard(null); } catch (e) { setProblem(`The take wasn't deleted: ${message(e)}.`); }
  };

  const download = () => {
    if (!take) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = videoFileName(name, take.type);
    a.click();
  };

  const transcribe = async () => {
    if (!take) return;
    setBusy(true);
    setProblem("");
    try {
      const audio = await getAudioContext().decodeAudioData(await take.blob.arrayBuffer());
      // both channels as one: an interface often carries the guitar on one side only
      const mono = new Float32Array(audio.length);
      for (let c = 0; c < audio.numberOfChannels; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i]; }
      setHeard(toRiff(hearNotes(mono, audio.sampleRate), bpm, pos));
    } catch (e) {
      setProblem(`The take's sound couldn't be read: ${message(e)}.`);
    }
    setBusy(false);
  };

  const camera = phase === "ready" || phase === "recording";
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-800 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 font-semibold">Take</h2>
        {phase === "off" && <button onClick={() => void startCamera()} className={btn}>Start camera</button>}
        {phase === "starting" && <span className="text-slate-400">Starting the camera…</span>}
        {phase === "ready" && <button onClick={record} className="rounded bg-rose-700 px-3 py-1 text-sm">{take ? "Record again" : "Record"}</button>}
        {phase === "ready" && <button onClick={() => { stopCamera(); setPhase("off"); }} className={btn}>Close camera</button>}
        {phase === "recording" && <button onClick={() => recorder.current?.stop()} className="rounded bg-rose-700 px-3 py-1 text-sm">Stop</button>}
        {phase === "recording" && <span className="font-mono text-rose-300">{clockTime(seconds)} / {clockTime(MAX_SECONDS)}</span>}
        {phase === "ready" && take && <span className="text-slate-400">A new recording replaces this riff&apos;s take.</span>}
        {take && phase !== "recording" && (
          <>
            <button onClick={() => void transcribe()} disabled={busy} className="rounded bg-emerald-700 px-3 py-1 text-sm disabled:opacity-40">{busy ? "Listening…" : "Transcribe"}</button>
            <button onClick={() => void store(take)} disabled={stored !== "failed"} className={btn}>Save</button>
            <button onClick={download} className={btn}>Save file</button>
            <button onClick={() => void remove()} className={btn}>Delete take</button>
            <span className={stored === "failed" ? "text-rose-400" : "text-slate-400"}>
              {clockTime(take.seconds)} · {stored === "saved" ? "Saved in this browser" : stored === "saving" ? "Saving…" : "Not saved"}
            </span>
          </>
        )}
      </div>
      {problem && <p role="alert" className="text-rose-400">{problem}</p>}
      {!camera && !take && <p className="text-slate-400">Record yourself playing the riff. The take is saved with the riff in this browser, and Transcribe turns its notes into tab at {bpm} bpm. One note at a time: chords aren&apos;t heard.</p>}
      {camera && <video ref={live} autoPlay muted playsInline className="max-h-80 w-full max-w-xl rounded bg-black" />}
      {!camera && take && url && <video key={url} src={url} controls playsInline className="max-h-80 w-full max-w-xl rounded bg-black" />}
      {heard && (
        heard.length === 0
          ? <p className="text-amber-300">No notes heard in this take. Chords and very quiet playing aren&apos;t picked up.</p>
          : (
            <div className="flex flex-col gap-2">
              <p className="text-slate-400">Heard {heard.filter((n) => n.string !== null).length} notes, on a 1/16 grid at {bpm} bpm from the first note, placed at position {pos}.</p>
              <pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">{asciiTab(heard)}</pre>
              <div className="flex gap-2">
                <button onClick={() => { onNotes(heard, true); setHeard(null); }} className={btn}>Replace the riff&apos;s notes</button>
                <button onClick={() => { onNotes(heard, false); setHeard(null); }} className={btn}>Add after the riff&apos;s notes</button>
                <button onClick={() => setHeard(null)} className={btn}>Discard</button>
              </div>
            </div>
          )
      )}
    </section>
  );
}
