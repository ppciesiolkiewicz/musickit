"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getScaleNotes, isNoteInScale, getScaleDegree, SCALE_OPTIONS, TONIC_OPTIONS } from "./musicTheory";
import { requestMidiAccess, addMidiListener, getMidiInputs } from "./midi";
import { OSCILLATOR_ID } from "../engine/instruments";
import { useInstrumentOptions } from "../engine/useInstrumentOptions";
import { createPlayer } from "../engine/player";
import { noteToMidi } from "../engine/notes";
import type { ScaleVoice } from "./ScalePiano";
import Icon from "@/components/Icon";
import { btnSm, ibtn } from "@/components/controls";

interface PianoKey {
  id: string;
  type: "white" | "black";
  note: string;
  keyCode: string;
  octave: number;
}

/**
 * Piano-style keyboard mapping: letter rows = white keys, row above = black keys.
 * Lower octave: Z=C S=C# X=D D=D# C=E V=F G=F# B=G H=G# N=A J=A# M=B
 * Upper octave: Q=C 2=C# W=D 3=D# E=E R=F 5=F# T=G 6=G# Y=A 7=A# U=B
 */
const KEY_MAP_24 = [
  "KeyZ", "KeyS", "KeyX", "KeyD", "KeyC", "KeyV", "KeyG", "KeyB", "KeyH", "KeyN", "KeyJ", "KeyM",
  "KeyQ", "Digit2", "KeyW", "Digit3", "KeyE", "KeyR", "Digit5", "KeyT", "Digit6", "KeyY", "Digit7", "KeyU",
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function buildPianoKeys(maxOctave: number): PianoKey[] {
  const keys: PianoKey[] = [];
  let keyIndex = 0;
  for (let oct = 1; oct <= maxOctave; oct++) {
    NOTE_NAMES.forEach((noteName) => {
      const isBlack = noteName.includes("#");
      keys.push({
        id: `${noteName}${oct}`,
        type: isBlack ? "black" : "white",
        note: noteName.replace("#", "♯"),
        keyCode: KEY_MAP_24[keyIndex % 24],
        octave: oct,
      });
      keyIndex++;
    });
  }
  return keys;
}

const ALL_PIANO_KEYS = buildPianoKeys(7);

const BLACK_KEY_OFFSETS = [
  { offset: 0.5, note: "C#" },
  { offset: 1.5, note: "D#" },
  { offset: 3.5, note: "F#" },
  { offset: 4.5, note: "G#" },
  { offset: 5.5, note: "A#" },
];

/**
 * Build keyCode -> noteId mapping for all 24 displayed keys.
 * 24 keyboard keys map 1-to-1 to the 2 visible octaves.
 */
function buildKeyCodeToNote(viewOctave: number): Map<string, string> {
  const map = new Map<string, string>();
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  KEY_MAP_24.forEach((keyCode, i) => {
    const octave = i < 12 ? viewOctave : viewOctave + 1;
    const note = noteNames[i % 12];
    map.set(keyCode, `${note}${octave}`);
  });
  return map;
}

/** A key chosen outside the piano (the theory piano page): what to highlight and the degree to print on each key. */
export interface PianoKeyInfo {
  inScale: (midi: number) => boolean;
  isTonic: (midi: number) => boolean;
  degree: (midi: number) => string | null;
}

export interface PianoProps {
  /** where its sound goes (the app's output by default) */
  destination?: () => AudioNode;
  /** the looper's instrument: played instead of its own sound, and no Sound picker */
  voice?: ScaleVoice;
  /** when given, the piano shows this key and hides its own key, scale and highlight pickers */
  keyInfo?: PianoKeyInfo;
  /** every note started or stopped, from the computer keys, a click or tap, or MIDI */
  onNoteOn?: (midi: number) => void;
  onNoteOff?: (midi: number) => void;
}

export default function Piano({ destination, voice, keyInfo, onNoteOn, onNoteOff }: PianoProps = {}) {
  const instrumentOptions = useInstrumentOptions();
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [viewOctave, setViewOctave] = useState(3);
  const [scaleTonic, setScaleTonic] = useState("C");
  const [scaleType, setScaleType] = useState("major");
  const [showScaleHighlight, setShowScaleHighlight] = useState(true);
  const [midiStatus, setMidiStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [instrumentId, setInstrumentId] = useState<string>("PIANO");
  const [midiError, setMidiError] = useState<string | null>(null);

  // This keyboard has its own player, so the instrument chosen here does not change what other pages play.
  const [player] = useState(() => createPlayer({ instrumentId: "PIANO", destination }));
  const playNote = useCallback((n: string) => {
    if (!voice) return player.noteOn(n);
    const m = noteToMidi(n);
    if (m !== null) voice.noteOn(m);
  }, [player, voice]);
  const stopNote = useCallback((n: string) => {
    if (!voice) return player.noteOff(n);
    const m = noteToMidi(n);
    if (m !== null) voice.noteOff(m);
  }, [player, voice]);
  const stopAllNotes = useCallback(() => (voice ?? player).allOff(), [player, voice]);

  // the callbacks change every render on the owner's side; listeners read the latest through a ref
  const callbacks = useRef({ onNoteOn, onNoteOff });
  useEffect(() => { callbacks.current = { onNoteOn, onNoteOff }; });
  /** one path for every source, so the sound, the lit key and the callbacks never disagree */
  // what is down right now, readable from listeners without waiting for a render
  const down = useRef(new Set<string>());
  /** the note each computer key started */
  const codeNote = useRef(new Map<string, string>());
  const pressNote = useCallback((noteId: string) => {
    down.current.add(noteId);
    playNote(noteId);
    setPressedKeys((prev) => new Set(prev).add(noteId));
    const m = noteToMidi(noteId);
    if (m !== null) callbacks.current.onNoteOn?.(m);
  }, [playNote]);
  const releaseNote = useCallback((noteId: string) => {
    down.current.delete(noteId);
    stopNote(noteId);
    setPressedKeys((prev) => {
      if (!prev.has(noteId)) return prev;
      const next = new Set(prev);
      next.delete(noteId);
      return next;
    });
    const m = noteToMidi(noteId);
    if (m !== null) callbacks.current.onNoteOff?.(m);
  }, [stopNote]);
  const pointerProps = (noteId: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); pressNote(noteId); },
    onPointerUp: () => releaseNote(noteId),
    onPointerLeave: (e: React.PointerEvent) => { if (e.buttons) releaseNote(noteId); },
    onPointerCancel: () => releaseNote(noteId),
  });

  useEffect(() => {
    if (!voice) void player.preload().catch(() => undefined);
  }, [player, voice]);

  const changeInstrument = (id: string) => {
    stopAllNotes();
    setPressedKeys(new Set());
    player.setInstrument(id);
    if (id !== OSCILLATOR_ID) void player.preload().catch(() => undefined);
    setInstrumentId(id);
  };

  const scaleName = scaleType ? `${scaleTonic} ${scaleType}`.trim() : "";
  const scaleNotes = useMemo(
    () => (scaleName ? getScaleNotes(scaleName) : []),
    [scaleName]
  );

  const highlighting = keyInfo ? true : showScaleHighlight && scaleNotes.length > 0;
  /** whether a key is in the scale and the degree printed on it, from the owner's key when it gave one */
  const marks = (noteId: string) => {
    if (keyInfo) {
      const m = noteToMidi(noteId);
      return m === null ? { inScale: false, degree: null } : { inScale: keyInfo.inScale(m), degree: keyInfo.degree(m) };
    }
    return { inScale: highlighting && isNoteInScale(noteId, scaleName), degree: getScaleDegree(noteId, scaleName) };
  };

  const keyCodeToNote = useMemo(() => buildKeyCodeToNote(viewOctave), [viewOctave]);
  const noteToKeyCode = useMemo(() => {
    const map = new Map<string, string>();
    const codeToLabel: Record<string, string> = {
      KeyZ: "Z", KeyS: "S", KeyX: "X", KeyD: "D", KeyC: "C", KeyV: "V",
      KeyG: "G", KeyB: "B", KeyH: "H", KeyN: "N", KeyJ: "J", KeyM: "M",
      KeyQ: "Q", Digit2: "2", KeyW: "W", Digit3: "3", KeyE: "E", KeyR: "R",
      Digit5: "5", KeyT: "T", Digit6: "6", KeyY: "Y", Digit7: "7", KeyU: "U",
    };
    keyCodeToNote.forEach((noteId, code) => {
      map.set(noteId, codeToLabel[code] ?? code.replace(/^Key|^Digit/, ""));
    });
    return map;
  }, [keyCodeToNote]);

  const displayedWhiteKeys = useMemo(
    () =>
      ALL_PIANO_KEYS.filter(
        (k) => k.type === "white" && k.octave >= viewOctave && k.octave <= viewOctave + 1
      ),
    [viewOctave]
  );

  const displayedBlackKeys = useMemo(
    () =>
      ALL_PIANO_KEYS.filter(
        (k) => k.type === "black" && k.octave >= viewOctave && k.octave <= viewOctave + 1
      ),
    [viewOctave]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        setViewOctave((o) => Math.max(1, o - 1));
        return;
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        setViewOctave((o) => Math.min(6, o + 1));
        return;
      }
      const noteId = keyCodeToNote.get(e.code);
      if (noteId) {
        e.preventDefault();
        codeNote.current.set(e.code, noteId);
        pressNote(noteId);
      }
    },
    [keyCodeToNote, pressNote]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") return;
      // release the note this key started, even if the octave moved while it was held
      const noteId = codeNote.current.get(e.code) ?? keyCodeToNote.get(e.code);
      codeNote.current.delete(e.code);
      if (noteId) {
        e.preventDefault();
        releaseNote(noteId);
      }
    },
    [keyCodeToNote, releaseNote]
  );

  useEffect(() => {
    // a key let go while the window is away never sends its keyup, so leaving lets everything go
    const releaseAll = () => {
      [...down.current].forEach(releaseNote);
      codeNote.current.clear();
      stopAllNotes();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") releaseAll();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleKeyDown, handleKeyUp, releaseNote, stopAllNotes]);

  useEffect(() => {
    const removeListener = addMidiListener((msg) => {
      if (msg.type === "noteon") pressNote(msg.noteName);
      else releaseNote(msg.noteName);
    });
    return removeListener;
  }, [pressNote, releaseNote]);

  const handleConnectMidi = useCallback(async () => {
    setMidiStatus("connecting");
    setMidiError(null);
    const result = await requestMidiAccess();
    if (result.success) {
      setMidiStatus("connected");
    } else {
      setMidiStatus("error");
      setMidiError(result.error ?? "Unknown error");
    }
  }, []);

  const whites = displayedWhiteKeys;
  const ww = 100 / whites.length;
  /** the colour laid over a key: pressed in amber, the tonic and the scale in the theme's accent */
  const overlay = (id: string, inScale: boolean, tonic: boolean, black: boolean) =>
    pressedKeys.has(id)
      ? black ? "bg-amber-500" : "bg-amber-300"
      : tonic && highlighting
        ? black ? "bg-sky-500/70" : "bg-sky-400/55"
        : inScale
          ? black ? "bg-sky-500/35" : "bg-sky-400/20"
          : "bg-transparent";
  const isTonic = (id: string) => {
    if (keyInfo) {
      const m = noteToMidi(id);
      return m !== null && keyInfo.isTonic(m);
    }
    return highlighting && getScaleDegree(id, scaleName) === 1;
  };
  const field = "h-8 rounded-lg border border-slate-700/80 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-400";

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1" role="group" aria-label="Octave">
          <button type="button" className={ibtn} onClick={() => setViewOctave((o) => Math.max(1, o - 1))} disabled={viewOctave <= 1} title="Octave down (←)" aria-label="Octave down">
            <Icon name="chevron-left" />
          </button>
          <span className="w-16 text-center text-xs tabular-nums text-slate-300">C{viewOctave}–B{viewOctave + 1}</span>
          <button type="button" className={ibtn} onClick={() => setViewOctave((o) => Math.min(6, o + 1))} disabled={viewOctave >= 6} title="Octave up (→)" aria-label="Octave up">
            <Icon name="chevron-right" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleConnectMidi}
          disabled={midiStatus === "connecting"}
          aria-pressed={midiStatus === "connected"}
          className={btnSm}
          title={midiError ?? "Connect a MIDI keyboard (the browser asks for permission)"}
        >
          {midiStatus === "connecting" ? "Connecting…" : midiStatus === "connected" ? `MIDI · ${getMidiInputs().length}` : midiStatus === "error" ? "MIDI failed" : "Connect MIDI"}
        </button>
        {!voice && (
          <select value={instrumentId} onChange={(e) => { changeInstrument(e.target.value); e.target.blur(); }} className={field} aria-label="Sound">
            {instrumentOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        )}
        {!keyInfo && (<>
          <select value={scaleTonic} onChange={(e) => { setScaleTonic(e.target.value); e.target.blur(); }} className={field} aria-label="Key">
            {TONIC_OPTIONS.map((t) => <option key={t} value={t}>{t.replace("#", "♯")}</option>)}
          </select>
          <select value={scaleType} onChange={(e) => { setScaleType(e.target.value); e.target.blur(); }} className={field} aria-label="Scale">
            {SCALE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" className={btnSm} aria-pressed={showScaleHighlight} onClick={() => setShowScaleHighlight((v) => !v)}>Highlight scale</button>
        </>)}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-1.5 sm:p-2">
        <div className="relative h-36 w-full touch-none select-none sm:h-44" role="group" aria-label="Piano keys">
          <div className="flex h-full">
            {whites.map((key) => {
              const { inScale, degree } = marks(key.id);
              const cap = noteToKeyCode.get(key.id);
              return (
                <div
                  key={key.id}
                  {...pointerProps(key.id)}
                  className="relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end overflow-hidden rounded-b-md border border-neutral-400/70 bg-neutral-50 pb-1.5 first:rounded-bl-lg last:rounded-br-lg"
                >
                  <span className={`absolute inset-0 transition-colors duration-75 ${overlay(key.id, inScale, isTonic(key.id), false)}`} aria-hidden />
                  {inScale && degree && <span className="absolute top-[64%] text-[11px] font-semibold text-neutral-800 sm:text-xs">{degree}</span>}
                  <span className="relative text-[9px] font-medium text-neutral-500 sm:text-[10px]">{key.note}{key.octave}</span>
                  {cap && <span className="relative mt-0.5 hidden rounded bg-neutral-200 px-1 text-[9px] font-medium text-neutral-600 sm:inline">{cap}</span>}
                </div>
              );
            })}
          </div>
          {displayedBlackKeys.map((key) => {
            const { inScale, degree } = marks(key.id);
            const offset = BLACK_KEY_OFFSETS.find((b) => b.note === key.id.replace(/\d+$/, ""))!.offset;
            const left = ((key.octave - viewOctave) * 7 + offset) * ww;
            const cap = noteToKeyCode.get(key.id);
            return (
              <div
                key={key.id}
                {...pointerProps(key.id)}
                className="absolute top-0 z-10 flex h-[60%] cursor-pointer flex-col items-center justify-end overflow-hidden rounded-b-md border border-neutral-950 bg-neutral-900 pb-1 shadow-md shadow-black/40"
                style={{ left: `${left - ww * 0.3}%`, width: `${ww * 0.6}%` }}
              >
                <span className={`absolute inset-0 transition-colors duration-75 ${overlay(key.id, inScale, isTonic(key.id), true)}`} aria-hidden />
                {inScale && degree && <span className="relative mb-auto mt-2 text-[9px] font-semibold text-neutral-100 sm:text-[10px]">{degree}</span>}
                {cap && <span className="relative hidden rounded bg-neutral-700 px-0.5 text-[8px] font-medium text-neutral-200 sm:inline">{cap}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
