"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarRow, ScaleSettingsBar, WithSettings } from "@/components/chordKit/ScaleSettings";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { Button, Chip, Select } from "@/components/ui";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { getAudioContext, getSharedPiano, midiToName, onSilence, playSequence, silence, wakeAudio } from "@/features/sound";
import type { PocketStatus } from "@/features/instruments";
import { RANGE_MAX, RANGE_MIN, VOICES, buildLadder, clefFor, hzToMidi, scaleRun, setRangeEnd, voiceOf, type Range, type Voice } from "@/features/theory/singing";
import { makeMelody, type Complexity, type MelodyLength } from "@/features/theory/singingMelody";
import SingingStaff from "./SingingStaff";
import MelodyStaff, { type StaffNote } from "./MelodyStaff";
import { panel } from "@/components/practice/shared";

/** null readings in a row before the voice counts as stopped (about 100 ms), so one dropped frame doesn't break the line */
const GAP_FRAMES = 6;
/** the tempo before the pocket tools report theirs */
const FALLBACK_BPM = 90;
/** how long a tapped note sounds */
const TAP_MS = 900;
const RESTS = [0, 1, 2, 3, 4];
const LENGTHS: { id: MelodyLength; label: string }[] = [{ id: "short", label: "Short · 2 bars" }, { id: "long", label: "Long · 4 bars" }];
const LEVELS: { id: Complexity; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "Steps from Do up to Sol, quarters and halves" },
  { id: "medium", label: "Medium", hint: "Small leaps over the octave, eighths and dotted notes" },
  { id: "hard", label: "Hard", hint: "Leaps up to a 6th, up to the 10th, syncopation" },
];
type Tab = "scales" | "melodies";
const TABS: { id: Tab; label: string }[] = [{ id: "scales", label: "Scales" }, { id: "melodies", label: "Melodies" }];
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

const RANGE_NOTES = Array.from({ length: RANGE_MAX - RANGE_MIN + 1 }, (_, i) => ({ value: RANGE_MIN + i, label: midiToName(RANGE_MIN + i) }));

/**
 * Sing the notes of a scale against its staff: pick the key, the scale and the range (a voice type, or any two notes) in
 * the settings bar (with the drone and the metronome from the scales pages). Tap a note to hear it, or play the scale up
 * and down on the metronome's tempo, then switch the mic on and a dot follows your voice over the notes. The Melodies
 * tab does the same with short random tunes in the key that end on a whole-note Do: pick a length and a level, step
 * back through the ones you have had or make a new one.
 */
export default function SingingApp() {
  const [tonicPc, setTonicPc] = useState(DEFAULT_KEY_PC);
  const [scale, setScale] = useState("major-ionian");
  const [range, setRange] = useState<Range>(VOICES.soprano);
  const [rest, setRest] = useState(2);
  const [tab, setTab] = useState<Tab>("scales");
  const [length, setLength] = useState<MelodyLength>("short");
  const [level, setLevel] = useState<Complexity>("easy");
  // every melody made so far, as seeds (made on the first visit to the tab, so the server never rolls one)
  const [seeds, setSeeds] = useState<number[]>([]);
  const [at, setAt] = useState(0);
  const [mic, setMic] = useState(false);
  const [pocket, setPocket] = useState<PocketStatus | null>(null);
  const voice = voiceOf(range);
  const clef = clefFor(range);
  const ladder = useMemo(() => buildLadder(scale, tonicPc, range) ?? buildLadder("major-ionian", tonicPc, range)!, [scale, tonicPc, range]);
  // the melody's steps on the ladder, from the root (of the ones it fits above) that centres it best in the range
  const melody = useMemo<StaffNote[]>(() => {
    if (seeds[at] === undefined) return [];
    const top = ladder.notes.length - 1;
    const tune = makeMelody(seeds[at], length, level, ladder.pcs.size, top);
    const hi = Math.max(...tune.map((n) => n.step));
    const lo = Math.min(...tune.map((n) => n.step));
    const mid = (range.low + range.high) / 2;
    const roots = ladder.notes.flatMap((n, i) => (n.label === "R" && i + hi <= top ? [i] : []));
    const root = roots.reduce((b, r) => (Math.abs((ladder.notes[r + lo].midi + ladder.notes[r + hi].midi) / 2 - mid) < Math.abs((ladder.notes[b + lo].midi + ladder.notes[b + hi].midi) / 2 - mid) ? r : b), 0);
    return tune.map((n) => ({ ...ladder.notes[root + n.step], beats: n.beats, at: n.at }));
  }, [seeds, at, length, level, ladder, range]);
  const openTab = (t: Tab) => {
    setTab(t);
    if (t === "melodies" && seeds.length === 0) setSeeds([newSeed()]);
  };
  // the next melody: forward through ones already had, else a new one
  const next = () => {
    if (at === seeds.length - 1) setSeeds((s) => [...s, newSeed()]);
    setAt((i) => i + 1);
  };

  const pitch = useRef<number | null>(null);
  const smoother = useRef(createSmoother());
  const gaps = useRef(0);
  const onPitch = useCallback((p: Pitch | null) => {
    if (!p) {
      if (++gaps.current >= GAP_FRAMES) {
        pitch.current = null;
        smoother.current.reset();
      }
      return;
    }
    gaps.current = 0;
    pitch.current = hzToMidi(smoother.current.push(p));
  }, []);
  const { status } = useMicPitch(mic, undefined, onPitch);

  // the note sounding now (ladder index), from a run or a tap; a run's highlights are timers, cleared with its sound
  const [played, setPlayed] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  // when the melody's first beat sounds (performance.now time), while it plays
  const [playFrom, setPlayFrom] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    setPlayed(null);
    setPlayFrom(null);
  }, []);
  useEffect(() => onSilence(clear), [clear]);
  // a run belongs to its ladder: a new key, scale or range (or leaving the page) stops it
  useEffect(() => () => silence(), [ladder, melody, tab]);
  const beat = 60000 / (pocket?.bpm ?? FALLBACK_BPM);

  const play = async () => {
    if (running) return silence();
    await wakeAudio();
    const ctx = getAudioContext();
    // on the click's next beat while the metronome (or any pocket tool) plays, else straight away
    const nextBeat = pocket?.nextBeat() ?? null;
    const lead = nextBeat === null ? 60 : Math.max(0, (nextBeat - ctx.currentTime) * 1000);
    if (tab === "melodies") {
      playSequence(melody.map((n) => ({ note: n.midi, at: lead + n.at * beat, hold: n.beats * beat * 0.9 })));
      const end = melody.length ? melody[melody.length - 1].at + melody[melody.length - 1].beats : 0;
      setRunning(true);
      setPlayFrom(performance.now() + lead);
      timers.current = [setTimeout(clear, lead + end * beat)];
      return;
    }
    const run = scaleRun(ladder.notes.length, rest);
    playSequence(run.flatMap((n, i) => (n === null ? [] : [{ note: ladder.notes[n].midi, at: lead + i * beat, hold: beat * 0.9 }])));
    setRunning(true);
    timers.current = run.map((n, i) => setTimeout(() => setPlayed(n), lead + i * beat));
    timers.current.push(setTimeout(clear, lead + run.length * beat));
  };

  // a tap sounds over a run without stopping it, and lights its note only when nothing runs
  const tap = async (i: number) => {
    await wakeAudio();
    const midi = (tab === "melodies" ? melody : ladder.notes)[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setTimeout(() => piano.noteOff(midi), TAP_MS);
    if (running) return;
    setPlayed(i);
    timers.current.push(setTimeout(() => setPlayed((p) => (p === i ? null : p)), TAP_MS));
  };

  const message =
    status === "asking" ? "Allow the microphone in your browser…"
    : status === "denied" ? "Microphone blocked. Allow it in the browser's site settings and try again."
    : status === "insecure" ? "The browser only allows the microphone on a secure (https) page."
    : status === "error" ? "No microphone found."
    : tab === "melodies" ? (status === "on" ? "Listening. Sing the melody on the beat (or along with it): the dot moves with the beat from your first note, green on the note due, red on another." : "Tap a note to hear it, or play the melody on the metronome's tempo. Then switch the mic on and sing it back.")
    : status === "on" ? "Listening. Sing the scale up from the root: the dot turns green on a note of the scale, red on a note outside it."
    : "Tap a note to hear it, or play the scale up and down on the metronome's tempo. Then switch the mic on and sing.";

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Singing drills" className="flex flex-wrap gap-1 self-start rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => openTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 sm:px-4 text-sm transition ${tab === t.id ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <WithSettings
        side={false}
        bar={
          <ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} scale={scale} onScale={setScale} labels={false} onStatus={setPocket}>
            <BarRow label="Voice">
              {(Object.keys(VOICES) as Voice[]).map((v) => (
                <Chip key={v} on={v === voice} onClick={() => setRange(VOICES[v])} title={`${midiToName(VOICES[v].low)} to ${midiToName(VOICES[v].high)}`}>{VOICES[v].label}</Chip>
              ))}
            </BarRow>
            <BarRow label="Range">
              <Select size="sm" highlighted={!voice} value={range.low} onChange={(m) => setRange((r) => setRangeEnd(r, "low", m))} options={RANGE_NOTES} aria-label="Lowest note" />
              <span className="text-xs text-slate-500">to</span>
              <Select size="sm" highlighted={!voice} value={range.high} onChange={(m) => setRange((r) => setRangeEnd(r, "high", m))} options={RANGE_NOTES} aria-label="Highest note" />
              {!voice && <span className="text-xs text-slate-400">Custom</span>}
            </BarRow>
            {tab === "scales" ? (
              <BarRow label="Top rest">
                {RESTS.map((n) => (
                  <Chip key={n} on={n === rest} onClick={() => setRest(n)}>{n === 0 ? "None" : `${n} beat${n > 1 ? "s" : ""}`}</Chip>
                ))}
              </BarRow>
            ) : (
              <>
                <BarRow label="Length">
                  {LENGTHS.map((l) => <Chip key={l.id} on={l.id === length} onClick={() => setLength(l.id)}>{l.label}</Chip>)}
                </BarRow>
                <BarRow label="Level">
                  {LEVELS.map((l) => <Chip key={l.id} on={l.id === level} onClick={() => setLevel(l.id)} title={l.hint}>{l.label}</Chip>)}
                </BarRow>
              </>
            )}
          </ScaleSettingsBar>
        }
      >
        <section className={`${panel} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-medium text-slate-100">{tab === "melodies" ? `Melody ${at + 1} · ${ladder.title}` : ladder.title}</h2>
            {tab === "melodies" && (
              <>
                <Button size="sm" disabled={at === 0} onClick={() => setAt((i) => Math.max(0, i - 1))} aria-label="The melody before">← Back</Button>
                <Button size="sm" onClick={next}>{at < seeds.length - 1 ? "Forward →" : "New melody →"}</Button>
              </>
            )}
            <Button size="sm" pressed={running} onClick={() => void play()} className={running ? "!border-sky-400/70 !bg-sky-500/20 !text-sky-100" : ""}>
              {running ? `Stop the ${tab === "melodies" ? "melody" : "scale"}` : `Play the ${tab === "melodies" ? "melody" : "scale"} · ${pocket?.bpm ?? FALLBACK_BPM} bpm`}
            </Button>
            <Button size="sm" pressed={mic} onClick={() => { pitch.current = null; setMic((v) => !v); }} className={mic ? "!border-emerald-400/70 !bg-emerald-500/20 !text-emerald-100" : ""}>
              {mic ? "Stop the mic" : "Start the mic"}
            </Button>
            <p className="min-w-0 basis-full text-sm sm:basis-0 sm:flex-1 text-slate-400" aria-live="polite">{message}</p>
          </div>
          {tab === "melodies" ? (
            <MelodyStaff notes={melody} ladder={ladder} clef={clef} pitch={pitch} playFrom={playFrom} beatMs={beat} tapped={running ? null : played} onNote={(i) => void tap(i)} />
          ) : (
            <SingingStaff ladder={ladder} clef={clef} pitch={pitch} played={played} onNote={(i) => void tap(i)} />
          )}
        </section>
      </WithSettings>
    </div>
  );
}
