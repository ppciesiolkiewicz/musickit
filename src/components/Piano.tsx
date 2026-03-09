"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getScaleNotes, isNoteInScale, getScaleDegree, SCALE_OPTIONS, TONIC_OPTIONS } from "@/lib/musicTheory";
import { playNote, stopNote, stopAllNotes } from "@/lib/audio";

interface PianoKey {
  id: string;
  type: "white" | "black";
  note: string;
  keyCode: string;
  octave: number;
}

const KEY_MAP = ["KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG", "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK"];

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
        keyCode: KEY_MAP[keyIndex % 13],
        octave: oct,
      });
      keyIndex++;
    });
  }
  return keys;
}

const ALL_PIANO_KEYS = buildPianoKeys(4);

const WHITE_KEY_WIDTH = 48;
const BLACK_KEY_WIDTH = 28;
const WHITE_KEY_HEIGHT = 170;
const BLACK_KEY_HEIGHT = 105;

const BLACK_KEY_OFFSETS = [
  { offset: 0.5, note: "C#" },
  { offset: 1.5, note: "D#" },
  { offset: 3.5, note: "F#" },
  { offset: 4.5, note: "G#" },
  { offset: 5.5, note: "A#" },
];

/**
 * Build keyCode -> noteId mapping for the displayed 2 octaves.
 * 13 keyboard keys map 1-to-1 to C(oct)...C(oct+1) in the visible range.
 */
function buildKeyCodeToNote(viewOctave: number): Map<string, string> {
  const map = new Map<string, string>();
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C"];
  KEY_MAP.forEach((keyCode, i) => {
    const octave = i < 12 ? viewOctave : viewOctave + 1;
    const note = noteNames[i];
    map.set(keyCode, `${note}${octave}`);
  });
  return map;
}

export default function Piano() {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [viewOctave, setViewOctave] = useState(1);
  const [scaleTonic, setScaleTonic] = useState("C");
  const [scaleType, setScaleType] = useState("major");
  const [showScaleHighlight, setShowScaleHighlight] = useState(true);

  const scaleName = scaleType ? `${scaleTonic} ${scaleType}`.trim() : "";
  const scaleNotes = useMemo(
    () => (scaleName ? getScaleNotes(scaleName) : []),
    [scaleName]
  );

  const keyCodeToNote = useMemo(() => buildKeyCodeToNote(viewOctave), [viewOctave]);
  const noteToKeyCode = useMemo(() => {
    const map = new Map<string, string>();
    keyCodeToNote.forEach((noteId, code) => map.set(noteId, code.replace("Key", "")));
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
      if (e.code === "BracketLeft") {
        e.preventDefault();
        setViewOctave((o) => Math.max(1, o - 1));
        return;
      }
      if (e.code === "BracketRight") {
        e.preventDefault();
        setViewOctave((o) => Math.min(3, o + 1));
        return;
      }
      const noteId = keyCodeToNote.get(e.code);
      if (noteId) {
        e.preventDefault();
        playNote(noteId);
        setPressedKeys((prev) => new Set(prev).add(noteId));
      }
    },
    [keyCodeToNote]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "BracketLeft" || e.code === "BracketRight") return;
      const noteId = keyCodeToNote.get(e.code);
      if (noteId) {
        e.preventDefault();
        stopNote(noteId);
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
      }
    },
    [keyCodeToNote]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") stopAllNotes();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-5 flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewOctave((o) => Math.max(1, o - 1))}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/20 disabled:opacity-40"
            disabled={viewOctave <= 1}
          >
            ← Shift down
          </button>
          <span className="min-w-[6rem] text-center font-mono text-lg font-medium text-white/95">
            Octaves {viewOctave}–{viewOctave + 1}
          </span>
          <button
            type="button"
            onClick={() => setViewOctave((o) => Math.min(3, o + 1))}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/20 disabled:opacity-40"
            disabled={viewOctave >= 3}
          >
            Shift up →
          </button>
        </div>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={scaleTonic}
            onChange={(e) => setScaleTonic(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white/95 backdrop-blur"
          >
            {TONIC_OPTIONS.map((t) => (
              <option key={t} value={t} className="bg-zinc-800 text-white">
                {t}
              </option>
            ))}
          </select>
          <select
            value={scaleType}
            onChange={(e) => setScaleType(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white/95 backdrop-blur"
          >
            {SCALE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} className="bg-zinc-800 text-white">
                {label}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={showScaleHighlight}
              onChange={(e) => setShowScaleHighlight(e.target.checked)}
              className="rounded border-white/30 bg-white/10"
            />
            Highlight scale
          </label>
        </div>
      </div>

      <div className="pb-4">
        <div
          className="relative mx-auto rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-800/95 to-zinc-900 px-3 py-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
          style={{ width: displayedWhiteKeys.length * WHITE_KEY_WIDTH }}
        >
          {/* White keys */}
          <div className="flex">
            {displayedWhiteKeys.map((key) => {
              const inScale = showScaleHighlight && scaleNotes.length > 0 && isNoteInScale(key.id, scaleName);
              const degree = getScaleDegree(key.id, scaleName);
              return (
                <div
                  key={key.id}
                  className={`
                    relative flex flex-shrink-0 flex-col items-center justify-between rounded-b-lg border transition-all duration-75
                    border-l-stone-300/60 border-r-stone-400/80 border-t-stone-200/90
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_6px_rgba(0,0,0,0.08)]
                    pb-3 pt-2
                    ${pressedKeys.has(key.id)
                      ? "z-10 bg-amber-200 shadow-[inset_0_3px_16px_rgba(251,191,36,0.45)]"
                      : inScale
                        ? "bg-gradient-to-b from-emerald-50/90 via-stone-100 to-stone-200/95 ring-1 ring-inset ring-emerald-400/30"
                        : showScaleHighlight && scaleNotes.length > 0
                          ? "bg-gradient-to-b from-stone-100/80 via-stone-150/80 to-stone-200/70 opacity-75"
                          : "bg-gradient-to-b from-stone-50 via-stone-100 to-stone-200/95 hover:from-stone-100 hover:via-stone-150 hover:to-stone-300/90"}
                  `}
                  style={{ width: WHITE_KEY_WIDTH - 1, height: WHITE_KEY_HEIGHT }}
                >
                  {inScale && degree && (
                    <span className="text-xs font-semibold text-emerald-700/90">{degree}</span>
                  )}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-mono text-sm font-medium text-zinc-600">
                      {key.id}
                    </span>
                    {noteToKeyCode.has(key.id) && (
                      <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600">
                        {noteToKeyCode.get(key.id)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Black keys */}
          {[viewOctave, viewOctave + 1].map((octave) =>
            BLACK_KEY_OFFSETS.map(({ offset, note }) => {
              const key = displayedBlackKeys.find((k) => k.id === `${note}${octave}`);
              if (!key) return null;
              const inScale = showScaleHighlight && scaleNotes.length > 0 && isNoteInScale(key.id, scaleName);
              const degree = getScaleDegree(key.id, scaleName);
              const left =
                12 +
                (octave - viewOctave) * 7 * WHITE_KEY_WIDTH +
                offset * WHITE_KEY_WIDTH -
                BLACK_KEY_WIDTH / 2;
              return (
                <div
                  key={key.id}
                  className={`
                    absolute flex flex-col items-center justify-between rounded-b-lg border border-zinc-900/95 transition-all duration-75
                    shadow-[inset_0_-3px_8px_rgba(0,0,0,0.5),0_3px_8px_rgba(0,0,0,0.25)]
                    z-20 pb-2 pt-1
                    ${pressedKeys.has(key.id)
                      ? "bg-amber-600 shadow-[inset_0_3px_14px_rgba(217,119,6,0.55)]"
                      : inScale
                        ? "bg-gradient-to-b from-emerald-800/90 via-zinc-800 to-zinc-900 ring-1 ring-inset ring-emerald-500/40"
                        : showScaleHighlight && scaleNotes.length > 0
                          ? "bg-gradient-to-b from-zinc-800/80 via-zinc-900/80 to-zinc-950 opacity-80"
                          : "bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 hover:from-zinc-600 hover:via-zinc-700 hover:to-zinc-800"}
                  `}
                  style={{
                    left,
                    top: 20,
                    width: BLACK_KEY_WIDTH,
                    height: BLACK_KEY_HEIGHT,
                  }}
                >
                  {inScale && degree && (
                    <span className="text-[10px] font-semibold text-emerald-400/90">{degree}</span>
                  )}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-mono text-[10px] font-medium text-zinc-500">
                      {key.id}
                    </span>
                    {noteToKeyCode.has(key.id) && (
                      <span className="rounded bg-zinc-600/80 px-1 py-0.5 font-mono text-[9px] font-medium text-zinc-300">
                        {noteToKeyCode.get(key.id)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-white/50">
        <span className="text-white/70">A S D F G H J K</span> white ·{" "}
        <span className="text-white/70">W E T Y U</span> black ·{" "}
        <span className="text-white/70">[ ]</span> shift octaves
      </p>
    </div>
  );
}
