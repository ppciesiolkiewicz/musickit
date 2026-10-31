"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import Icon from "@/components/Icon";
import { getAudioContext, readDeviceChoice } from "@/features/sound";
import { clockTime, inputChannels, peakLevel, pickMimeType, soundGate, takeFileName } from "./recorder";
import TakePlayer from "./TakePlayer";

/** Pages with their own recording or no room for it: the landing pages, the looper, the teachers' pages and the creator. */
const HIDDEN = ["/landing-1", "/looper", "/teachers", "/creator", "/_og"];
const hiddenOn = (path: string) => path === "/" || HIDDEN.some((p) => path === p || path.startsWith(`${p}/`));

interface Take {
  n: number;
  url: string;
  file: string;
  seconds: number;
  channels: 1 | 2;
}

/** What one recording holds while it runs: closed with `end`, which hands back the take. */
interface Session {
  end: () => void;
}

/**
 * A quick recorder on most pages: a tab on the right edge opens a card, centred on that edge, that slides in from the right, with one big record
 * button that pulses while it hears sound, its clock, and the takes to play back,
 * download or delete. A two-input interface records both channels apart, so each take mixes them with its own volumes. It records the input chosen in the nav's audio
 * devices menu, raw (no echo cancelling or gain). The page stays usable under it, so you can record over a page's metronome or
 * drone; it closes only on its own button or Escape, and keeps recording while closed. Lives in the root layout, so takes outlast
 * a move to another page; they are held in memory only and go with the tab.
 */
export default function QuickRecord() {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<Session | null>(null);
  const pulses = useRef<(HTMLElement | null)[]>([]);
  const count = useRef(0);

  const start = async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined") return setError("This browser cannot record audio.");
    let stream: MediaStream;
    try {
      const input = readDeviceChoice().input;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: input ? { ideal: input.id } : undefined, channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      return setError("The microphone could not be opened. Allow microphone access for this site and try again.");
    }
    // a two-input interface (guitar left, voice right) records as a stereo take, each input on its own channel, so the take's
    // player can set each one's volume; a one-channel input records mono, and the browser downmixes it if it is stereo after all
    const ctx = getAudioContext();
    await ctx.resume();
    const n = inputChannels(stream.getAudioTracks()[0]?.getSettings().channelCount);
    const src = ctx.createMediaStreamSource(stream);
    const out = ctx.createMediaStreamDestination();
    out.channelCount = n;
    out.channelCountMode = "explicit";
    out.channelInterpretation = n === 2 ? "discrete" : "speakers";
    src.connect(out);

    const type = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(out.stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    // an analyser per channel, read every frame: the loudest opens the sound gate, which sets the record button's pulse without
    // a React render
    const split = ctx.createChannelSplitter(n);
    const mono = n === 1;
    const analysers = Array.from({ length: n }, (_, i) => {
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      if (mono) {
        an.channelCount = 1;
        an.channelCountMode = "explicit";
        src.connect(an);
      } else split.connect(an, i);
      return an;
    });
    if (!mono) src.connect(split);
    const bytes = new Uint8Array(1024);
    const gate = soundGate();
    let raf = 0;
    const tick = () => {
      let loudest = 0;
      analysers.forEach((an) => {
        an.getByteTimeDomainData(bytes);
        loudest = Math.max(loudest, peakLevel(bytes));
      });
      const sound = String(gate(loudest, performance.now()));
      pulses.current.forEach((p) => p && (p.dataset.sound = sound));
      // whole seconds, so React renders once a second rather than every frame
      setElapsed(Math.floor((performance.now() - started) / 1000));
      raf = requestAnimationFrame(tick);
    };

    const started = performance.now();
    recorder.onstop = () => {
      const seconds = (performance.now() - started) / 1000;
      const kind = recorder.mimeType || type;
      const take = ++count.current;
      setTakes((t) => [{ n: take, url: URL.createObjectURL(new Blob(chunks, { type: kind })), file: takeFileName(take, new Date(), kind), seconds, channels: n }, ...t]);
      posthog.capture("quick_recording_completed", { duration_seconds: Math.round(seconds * 10) / 10 });
    };
    session.current = {
      end: () => {
        cancelAnimationFrame(raf);
        if (recorder.state !== "inactive") recorder.stop();
        src.disconnect();
        split.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        pulses.current.forEach((p) => p && (p.dataset.sound = "false"));
        session.current = null;
        setRecording(false);
      },
    };
    recorder.start();
    setElapsed(0);
    setRecording(true);
    tick();
  };
  const stop = () => session.current?.end();

  const remove = (n: number) =>
    setTakes((t) => {
      const gone = t.find((x) => x.n === n);
      if (gone) URL.revokeObjectURL(gone.url);
      return t.filter((x) => x.n !== n);
    });

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  // the takes' URLs and the microphone go with the app
  const latest = useRef(takes);
  useEffect(() => {
    latest.current = takes;
  });
  useEffect(() => () => {
    session.current?.end();
    latest.current.forEach((t) => URL.revokeObjectURL(t.url));
  }, []);

  // a page that hides the tab still lets a running recording be stopped from it
  if (hiddenOn(path) && !recording && !open) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="quick-record" title={recording ? "Recording: open the recorder" : "Quick record"}
        className={`fixed right-0 top-[62%] z-2400 flex w-10 -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl border border-r-0 py-4 pr-0.5 text-xs font-medium uppercase tracking-wider shadow-lg shadow-black/40 backdrop-blur transition-all hover:w-12 focus-visible:outline-2 focus-visible:outline-sky-400 ${open ? "pointer-events-none translate-x-full opacity-0" : ""} ${recording ? "border-rose-500/70 bg-rose-500/20 text-rose-100" : "border-slate-700 bg-slate-900/85 text-slate-300 hover:border-slate-500 hover:text-slate-100"}`}>
        <span aria-hidden ref={(el) => void (pulses.current[0] = el)} data-sound="false" className="h-3 w-3 rounded-full bg-rose-500 data-[sound=true]:animate-pulse" />
        <span className="[writing-mode:vertical-rl]">{recording ? clockTime(elapsed) : "Rec"}</span>
      </button>

      <aside id="quick-record" role="dialog" aria-label="Quick record" aria-hidden={!open} inert={!open}
        className={`fixed right-0 top-1/2 z-2500 flex max-h-[min(36rem,calc(100dvh-2rem))] w-80 max-w-[88vw] -translate-y-1/2 flex-col gap-4 rounded-l-2xl border border-r-0 border-slate-700 bg-slate-950/95 p-4 text-slate-200 shadow-2xl shadow-black/60 backdrop-blur transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center gap-2">
          <Icon name="mic" size={16} className="text-rose-300" />
          <h2 className="text-sm font-medium text-slate-100">Quick record</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close the recorder" title="Close (Esc)"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-slate-500 hover:text-slate-100">
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-5">
          <button type="button" onClick={recording ? stop : () => void start()} aria-pressed={recording} aria-label={recording ? "Stop recording" : "Start recording"}
            ref={(el) => void (pulses.current[1] = el)} data-sound="false"
            className={`rec-pulse grid h-16 w-16 place-items-center rounded-full border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${recording ? "border-rose-400 bg-rose-500/20" : "border-rose-500/70 bg-slate-900 hover:bg-rose-500/10"}`}>
            {recording ? <span className="h-5 w-5 rounded-sm bg-rose-400" /> : <span className="h-7 w-7 rounded-full bg-rose-500" />}
          </button>
          <p className={`text-2xl font-light tabular-nums ${recording ? "text-rose-100" : "text-slate-400"}`} aria-live="off">{clockTime(recording ? elapsed : 0)}</p>
          <p className="text-center text-xs text-slate-500">{recording ? "Recording. You can close this and keep playing." : "Records the input from the audio devices menu."}</p>
          {error && <p role="alert" className="text-center text-xs text-rose-300">{error}</p>}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <h3 className="text-[11px] uppercase tracking-wider text-slate-500">Takes</h3>
          {takes.length === 0 ? (
            <p className="text-xs text-slate-500">Nothing yet. Takes stay until you close the tab.</p>
          ) : (
            <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
              {takes.map((t) => (
                <li key={t.n} className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-slate-100">Take {t.n}</span>
                    <span className="tabular-nums text-slate-500">{clockTime(t.seconds)}</span>
                    <a href={t.url} download={t.file} title="Download" aria-label={`Download take ${t.n}`}
                      className="ml-auto grid h-7 w-7 place-items-center rounded-md border border-slate-700 text-slate-300 transition hover:border-slate-500 hover:text-slate-100">
                      <Icon name="download" size={13} />
                    </a>
                    <button type="button" onClick={() => remove(t.n)} title="Delete" aria-label={`Delete take ${t.n}`}
                      className="grid h-7 w-7 place-items-center rounded-md border border-slate-700 text-slate-300 transition hover:border-rose-500/70 hover:text-rose-200">
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                  <TakePlayer url={t.url} seconds={t.seconds} channels={t.channels} label={`take ${t.n}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
