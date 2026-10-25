"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarRow, ScaleSettingsBar, WithSettings } from "@/components/chordKit/ScaleSettings";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { Button, Chip, Select } from "@/components/ui";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { getAudioContext, getSharedPiano, midiToName, onSilence, playSequence, silence, wakeAudio } from "@/features/sound";
import type { PocketStatus } from "@/features/instruments";
import { RANGE_MAX, RANGE_MIN, VOICES, buildLadder, clefFor, hzToMidi, sanitiseRange, scaleRun, setRangeEnd, voiceOf, type Range, type Voice } from "@/features/theory/singing";
import type { MelodyLength } from "@/features/theory/singingMelody";
import { BOOK, LEVELS, levelOf, placeTune, type BookTune, type PlacedNote } from "@/features/theory/singingMelodies";
import SingingStaff from "./SingingStaff";
import MelodyFeed from "./MelodyFeed";
import MicButton from "./MicButton";
import { panel } from "@/components/practice/shared";

/** null readings in a row before the voice counts as stopped (about 100 ms), so one dropped frame doesn't break the line */
const GAP_FRAMES = 6;
/** the tempo before the pocket tools report theirs */
const FALLBACK_BPM = 90;
/** how long a tapped note sounds */
const TAP_MS = 900;
const RESTS = [0, 1, 2, 3, 4];
/** where the voice or range picked last is kept */
const RANGE_KEY = "singing.range";
const LENGTHS: { id: MelodyLength | "all"; label: string }[] = [{ id: "all", label: "All" }, { id: "short", label: "Short · 2 bars" }, { id: "long", label: "Long · 4 bars" }];
type Tab = "scales" | "melodies";
const TABS: { id: Tab; label: string }[] = [{ id: "scales", label: "Scales" }, { id: "melodies", label: "Melodies" }];

const RANGE_NOTES = Array.from({ length: RANGE_MAX - RANGE_MIN + 1 }, (_, i) => ({ value: RANGE_MIN + i, label: midiToName(RANGE_MIN + i) }));

/**
 * Sing the notes of a scale against its staff: pick the key, the scale and the range (a voice type, or any two notes) in
 * the settings bar (with the drone and the metronome from the scales pages). Tap a note to hear it, or play the scale up
 * and down on the metronome's tempo, then switch the mic on and a dot follows your voice over the notes. The Melodies
 * tab does the same with the melody book: written tunes in the key that end on a whole-note Do, easiest first in one
 * list per level, filtered by length; on the tune picked (or last played or tapped) a bar runs in time with the metronome and the dot sings along it.
 */
export default function SingingApp() {
  const [tonicPc, setTonicPc] = useState(DEFAULT_KEY_PC);
  const [scale, setScale] = useState("major-ionian");
  const [range, setRange] = useState<Range>(VOICES.soprano);
  // the last voice or range comes back after hydration; a pick is kept as it is made
  useEffect(() => {
    let saved: Range | null = null;
    try {
      saved = sanitiseRange(JSON.parse(window.localStorage.getItem(RANGE_KEY) ?? "null"));
    } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved range after hydration
    if (saved) setRange(saved);
  }, []);
  const pickRange = (f: (r: Range) => Range) =>
    setRange((r) => {
      const next = f(r);
      try { window.localStorage.setItem(RANGE_KEY, JSON.stringify({ low: next.low, high: next.high })); } catch { /* storage blocked */ }
      return next;
    });
  const [rest, setRest] = useState(2);
  const [tab, setTab] = useState<Tab>("scales");
  const [length, setLength] = useState<MelodyLength | "all">("all");
  // the tune being sung, by number, and the level whose tunes are listed ("all" for the whole book)
  const [active, setActive] = useState(1);
  const [level, setLevel] = useState<number | "all">(0);
  const [mic, setMic] = useState(false);
  const [pocket, setPocket] = useState<PocketStatus | null>(null);
  const voice = voiceOf(range);
  const clef = clefFor(range);
  const ladder = useMemo(() => buildLadder(scale, tonicPc, range) ?? buildLadder("major-ionian", tonicPc, range)!, [scale, tonicPc, range]);
  // the tunes are written in seven-note degrees: a pentatonic sings them in its major or minor
  const tuneLadder = useMemo(
    () => (ladder.pcs.size === 7 ? ladder : buildLadder(ladder.notes.some((n) => n.label === "♭3") ? "natural-minor-aeolian" : "major-ionian", tonicPc, range)!),
    [ladder, tonicPc, range],
  );
  const placed = useMemo(() => new Map(BOOK.map((t) => [t.n, placeTune(t.notes, tuneLadder, range)])), [tuneLadder, range]);
  const place = useCallback((t: BookTune) => placed.get(t.n)!, [placed]);
  const tunes = useMemo(() => BOOK.filter((t) => (length === "all" || t.length === length) && (level === "all" || levelOf(t.stage) === level)), [length, level]);
  // a level or length that hides the tune being sung picks the first one shown
  const filter = (lv: number | "all", len: MelodyLength | "all") => {
    setLevel(lv);
    setLength(len);
    const shown = BOOK.filter((t) => (len === "all" || t.length === len) && (lv === "all" || levelOf(t.stage) === lv));
    if (shown.length && !shown.some((t) => t.n === active)) setActive(shown[0].n);
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
  const toggleMic = () => {
    pitch.current = null;
    setMic((v) => !v);
  };

  // the note sounding now (ladder index), from a run or a tap; a run's highlights are timers, cleared with its sound
  const [played, setPlayed] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  // the tune playing (by number), and when its first beat sounds (performance.now time); a tapped note on a tune
  const [playing, setPlaying] = useState<number | null>(null);
  const [playFrom, setPlayFrom] = useState<number | null>(null);
  const [tapped, setTapped] = useState<{ n: number; i: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    setPlayed(null);
    setPlaying(null);
    setPlayFrom(null);
  }, []);
  useEffect(() => onSilence(clear), [clear]);
  // a run belongs to its ladder: a new key, scale or range (or leaving the page) stops it
  useEffect(() => () => silence(), [ladder, placed, tab]);
  const beat = 60000 / (pocket?.bpm ?? FALLBACK_BPM);

  // on the click's next beat while the metronome (or any pocket tool) plays, else straight away
  const leadMs = () => {
    const nextBeat = pocket?.nextBeat() ?? null;
    return nextBeat === null ? 60 : Math.max(0, (nextBeat - getAudioContext().currentTime) * 1000);
  };
  // the metronome's next beat on the page's clock, for the melody's bar; null while nothing clicks
  const nextBeatAt = useCallback(() => {
    const at = pocket?.nextBeat() ?? null;
    return at === null ? null : performance.now() + (at - getAudioContext().currentTime) * 1000;
  }, [pocket]);

  // a tune plays from its card and becomes the one sung; its own button again stops it
  const playTune = async (t: BookTune) => {
    const was = playing;
    if (running) silence();
    if (was === t.n) return;
    await wakeAudio();
    const lead = leadMs();
    const notes: PlacedNote[] = place(t);
    playSequence(notes.map((n) => ({ note: n.midi, at: lead + n.at * beat, hold: n.beats * beat * 0.9 })));
    const end = notes[notes.length - 1].at + notes[notes.length - 1].beats;
    setActive(t.n);
    setRunning(true);
    setPlaying(t.n);
    setPlayFrom(performance.now() + lead);
    timers.current = [setTimeout(clear, lead + end * beat)];
  };

  const tapTune = async (t: BookTune, i: number) => {
    await wakeAudio();
    const midi = place(t)[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setTimeout(() => piano.noteOff(midi), TAP_MS);
    setActive(t.n);
    if (running) return;
    setTapped({ n: t.n, i });
    timers.current.push(setTimeout(() => setTapped((p) => (p?.n === t.n && p.i === i ? null : p)), TAP_MS));
  };

  const play = async () => {
    if (running) return silence();
    await wakeAudio();
    const lead = leadMs();
    const run = scaleRun(ladder.notes.length, rest);
    playSequence(run.flatMap((n, i) => (n === null ? [] : [{ note: ladder.notes[n].midi, at: lead + i * beat, hold: beat * 0.9 }])));
    setRunning(true);
    timers.current = run.map((n, i) => setTimeout(() => setPlayed(n), lead + i * beat));
    timers.current.push(setTimeout(clear, lead + run.length * beat));
  };

  // a tap sounds over a run without stopping it, and lights its note only when nothing runs
  const tap = async (i: number) => {
    await wakeAudio();
    const midi = ladder.notes[i].midi;
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
    : tab === "melodies" ? (status === "on" ? `Listening on melody #${active}. Sing each note as the bar reaches it: the bar loops in time with the metronome, and the dot turns green on the note under it, red on another.` : "Play a melody or tap its notes to hear it, then press Sing on its card: the mic listens while a bar runs over the tune in time with the metronome.")
    : status === "on" ? "Listening. Sing the scale up from the root: the dot turns green on a note of the scale, red on a note outside it."
    : "Tap a note to hear it, or play the scale up and down on the metronome's tempo. Then press Sing and sing it back.";

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Singing drills" className="flex flex-wrap gap-1 self-start rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
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
                <Chip key={v} on={v === voice} onClick={() => pickRange(() => VOICES[v])} title={`${midiToName(VOICES[v].low)} to ${midiToName(VOICES[v].high)}`}>{VOICES[v].label}</Chip>
              ))}
            </BarRow>
            <BarRow label="Range">
              <Select size="sm" highlighted={!voice} value={range.low} onChange={(m) => pickRange((r) => setRangeEnd(r, "low", m))} options={RANGE_NOTES} aria-label="Lowest note" />
              <span className="text-xs text-slate-500">to</span>
              <Select size="sm" highlighted={!voice} value={range.high} onChange={(m) => pickRange((r) => setRangeEnd(r, "high", m))} options={RANGE_NOTES} aria-label="Highest note" />
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
                <BarRow label="Level">
                  {LEVELS.map((l, i) => <Chip key={l.from} on={level === i} onClick={() => filter(i, length)} title={l.hint}>{l.title}</Chip>)}
                  <Chip on={level === "all"} onClick={() => filter("all", length)}>All</Chip>
                </BarRow>
                <BarRow label="Length">
                  {LENGTHS.map((l) => <Chip key={l.id} on={l.id === length} onClick={() => filter(level, l.id)}>{l.label}</Chip>)}
                </BarRow>
              </>
            )}
          </ScaleSettingsBar>
        }
      >
        <section className={`${panel} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-medium text-slate-100">{tab === "melodies" ? `Melodies in ${tuneLadder.title}` : ladder.title}</h2>
            {tab === "scales" && (
              <Button size="sm" pressed={running} onClick={() => void play()} className={running ? "!border-sky-400/70 !bg-sky-500/20 !text-sky-100" : ""}>
                {running ? "Stop the scale" : `Play the scale · ${pocket?.bpm ?? FALLBACK_BPM} bpm`}
              </Button>
            )}
            {tab === "scales" && <MicButton on={mic} onClick={toggleMic} />}
            <p className="min-w-0 basis-full text-sm sm:basis-0 sm:flex-1 text-slate-400" aria-live="polite">{message}</p>
          </div>
          {tab === "melodies" ? (
            <MelodyFeed
              tunes={tunes}
              place={place}
              ladder={tuneLadder}
              clef={clef}
              pitch={pitch}
              beatMs={beat}
              bpm={pocket?.bpm ?? FALLBACK_BPM}
              active={active}
              playing={playing}
              playFrom={playFrom}
              tapped={tapped}
              nextBeat={nextBeatAt}
              mic={mic}
              onPick={(t) => setActive(t.n)}
              onSing={(t) => {
                // the mic on the card being sung toggles it; on another card it moves the singing there and listens
                if (t.n === active) return toggleMic();
                setActive(t.n);
                if (!mic) toggleMic();
              }}
              onPlay={(t) => void playTune(t)}
              onNote={(t, i) => void tapTune(t, i)}
            />
          ) : (
            <SingingStaff ladder={ladder} clef={clef} pitch={pitch} played={played} onNote={(i) => void tap(i)} />
          )}
        </section>
      </WithSettings>
    </div>
  );
}
