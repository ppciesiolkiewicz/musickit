"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarRow, ScaleSettingsBar, WithSettings } from "@/components/chordKit/ScaleSettings";
import { useMicPitch } from "@/components/practice/useMicPitch";
import Icon from "@/components/Icon";
import { Button, Checkbox, Select, Slider } from "@/components/ui";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { getAudioContext, getSharedPiano, midiToName, onSilence, playSequence, silence, wakeAudio } from "@/features/sound";
import { MAX_BPM, MIN_BPM, type PocketStatus } from "@/features/instruments";
import { ACCURACIES, VOICES, buildLadder, clefFor, hzToMidi, savedVoice, scaleRun, tuneLadderFor, type Ladder, type Range, type Voice } from "@/features/theory/singing";
import { BOOK, DIFFICULTIES, RUNS, lengthLabel, placeRun, placeTune, runPasses, type BookTune, type PlacedNote } from "@/features/theory/singingMelodies";
import SingAlong from "@/features/exercises/basics/sing-along/SingAlong";
import { harmoniseRun, harmoniseTune, type MelodyChord } from "@/features/theory/melodyChords";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { singingQuery, type SingingLink } from "@/features/theory/singingLink";
import { levelSemis, type IntervalDirection } from "@/features/theory/singingIntervals";
import { EAR_LEVELS } from "@/lib/practice/earGame";
import SingingStaff from "./SingingStaff";
import MelodyFeed from "./MelodyFeed";
import { DOT_LAG_MS } from "./MelodyStaff";
import { ShareButton } from "./MelodyControls";
import MicButton from "./MicButton";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import IntervalDrill, { type IntervalPrompt } from "./IntervalDrill";
import { panel, writeQuery } from "@/components/practice/shared";

/** null readings in a row before the voice counts as stopped (about 100 ms), so one dropped frame doesn't break the line */
const GAP_FRAMES = 6;
/** the tempo before the pocket tools report theirs */
const FALLBACK_BPM = 90;
/** how long a tapped note sounds */
const TAP_MS = 900;
const RESTS = [0, 1, 2, 3, 4];
/** where the voice picked last is kept (once its range, which still reads back) */
const VOICE_KEY = "singing.range";
/** where the play-ahead picked last is kept, in ms (a testing knob: how far the bar runs ahead of the voice dot) */
const LAG_KEY = "singing.lag";
/** whether the piano plays the tunes' chords (on unless turned off) */
const CHORDS_KEY = "singing.chords";
const MAX_LAG_MS = 1000;
const savedLag = (v: unknown): number | null => (typeof v === "number" && v >= 0 && v <= MAX_LAG_MS ? v : null);
type Tab = "scales" | "melodies" | "runs" | "intervals";
const TABS: { id: Tab; label: string }[] = [{ id: "scales", label: "Scales" }, { id: "melodies", label: "Melodies" }, { id: "runs", label: "Runs" }, { id: "intervals", label: "Intervals" }];
const DIRECTIONS: { id: IntervalDirection; label: string }[] = [{ id: "up", label: "Up" }, { id: "down", label: "Down" }, { id: "both", label: "Both" }];
const PROMPTS: { id: IntervalPrompt; label: string; title: string }[] = [
  { id: "interval", label: "Both notes", title: "Hear the interval, then sing it back" },
  { id: "root", label: "Root only", title: "Hear only the root and find the other note yourself" },
];
const ALL = [...BOOK, ...RUNS];

/**
 * Sing the notes of a scale against its staff: pick the key, the scale and the voice type in the side column (with the
 * drone and the metronome from the scales pages, and every drill's own settings as dropdowns). Tap a note to hear it, or
 * play the scale up and down on the metronome's tempo, then switch the mic on and a dot follows your voice over the notes.
 * The Melodies tab is the melody book (written tunes in the key that end on a whole-note Do, in book order, filtered by
 * difficulty), each card the plan's sing-along player (`SingAlong`): play, stop, the mic, a loop over a part, staff or
 * piano roll, at the page's tempo. Full screen holds one tune with arrows on its margins (and ←/→ or a swipe) to step
 * through the tunes listed. The address keeps the key, the scale and the tune picked (and whether it is open full screen),
 * so a copied link (or a card's share button, which always opens full screen) opens the same. The Runs tab is the same with
 * the runs book. The Intervals tab puts a root from the scale on the staff and names an interval to sing from it: the
 * interval plays, then the mic listens for the other note.
 */
export default function SingingApp({ initial }: { initial: SingingLink }) {
  const linked = ALL.find((t) => t.n === initial.melody);
  const [tonicPc, setTonicPc] = useState(initial.tonicPc);
  const [scale, setScale] = useState(initial.scale);
  const [voice, setVoice] = useState<Voice>("soprano");
  // how close counts as on the note, shared with the singing tools
  const [cents, pickAccuracy] = useAccuracy();
  // how far the bar runs ahead of the voice dot on a melody
  const [lagMs, setLagMs] = useState(DOT_LAG_MS);
  // the piano's chords under the tunes
  const [chords, setChords] = useState(true);
  // the last voice and play-ahead come back after hydration; a pick is kept as it is made
  useEffect(() => {
    let saved: Voice | null = null;
    let lag: number | null = null;
    let withChords: unknown = null;
    try {
      saved = savedVoice(JSON.parse(window.localStorage.getItem(VOICE_KEY) ?? "null"));
      lag = savedLag(JSON.parse(window.localStorage.getItem(LAG_KEY) ?? "null"));
      withChords = JSON.parse(window.localStorage.getItem(CHORDS_KEY) ?? "null");
    } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved picks after hydration
    if (saved) setVoice(saved);
    if (lag !== null) setLagMs(lag);
    if (withChords === false) setChords(false);
  }, []);
  const pickChords = (on: boolean) => {
    setChords(on);
    try { window.localStorage.setItem(CHORDS_KEY, JSON.stringify(on)); } catch { /* storage blocked */ }
  };
  const pickLag = (ms: number) => {
    setLagMs(ms);
    try { window.localStorage.setItem(LAG_KEY, JSON.stringify(ms)); } catch { /* storage blocked */ }
  };
  const lagSlider = (
    <>
      <Slider min={0} max={MAX_LAG_MS} step={10} value={lagMs} onChange={pickLag} size="sm" className="w-40" aria-label="Play-ahead" />
      <span className="whitespace-nowrap pl-1 text-xs tabular-nums text-slate-500">{lagMs} ms</span>
    </>
  );
  const pickVoice = (v: Voice) => {
    setVoice(v);
    try { window.localStorage.setItem(VOICE_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
  };
  const range = VOICES[voice];
  const [rest, setRest] = useState(2);
  const [tab, setTab] = useState<Tab>(!linked ? "scales" : RUNS.includes(linked) ? "runs" : "melodies");
  const book = tab === "runs" ? RUNS : BOOK;
  const tuneTab = tab === "melodies" || tab === "runs";
  // the Intervals tab: the ear-training level, which way the interval goes, and what is played before singing
  const [intervalLevel, setIntervalLevel] = useState(1);
  const [direction, setDirection] = useState<IntervalDirection>("up");
  const [prompt, setPrompt] = useState<IntervalPrompt>("interval");
  const semis = useMemo(() => levelSemis(intervalLevel), [intervalLevel]);
  // the tune being sung, by number, and the difficulty whose tunes are listed ("all" for the whole book); a linked tune shows
  // under its own difficulty
  const [active, setActive] = useState(linked?.n ?? 1);
  const [level, setLevel] = useState<number | "all">(linked?.difficulty ?? 0);
  // one melody full screen, in the page (not the browser's full screen); a shared link opens its tune this way
  const [focus, setFocus] = useState(!!linked && initial.full);
  useEffect(
    () => writeQuery(singingQuery({ tonicPc, scale, melody: tuneTab ? active : null, full: focus })),
    [tonicPc, scale, tuneTab, active, focus],
  );
  // a link to a tune in this key and scale, opening full screen, for its share button
  const linkTo = (t: BookTune) => `${window.location.origin}${window.location.pathname}?${singingQuery({ tonicPc, scale, melody: t.n, full: true })}`;
  const [mic, setMic] = useState(false);
  const [pocket, setPocket] = useState<PocketStatus | null>(null);
  const clef = clefFor(range);
  const ladder = useMemo(() => buildLadder(scale, tonicPc, range) ?? buildLadder("major-ionian", tonicPc, range)!, [scale, tonicPc, range]);
  // the tunes are written in seven-note degrees: a pentatonic sings them in its major or minor; they can dip under the lowest Do
  const tuneLadder = useMemo(() => tuneLadderFor(ladder, tonicPc, range), [ladder, tonicPc, range]);
  // a run spans the voice whatever the key picked: its last pass tops out on the range's top, its staff in its first pass's key
  const placed = useMemo(() => {
    const ladderIn = (pc: number, r: Range) => tuneLadderFor(buildLadder(scale, pc, r) ?? buildLadder("major-ionian", pc, r)!, pc, r);
    const none: MelodyChord[] = [];
    return new Map<number, { notes: PlacedNote[]; chords: MelodyChord[]; ladder: Ladder }>([
      ...BOOK.map((t) => [t.n, { ...(chords ? harmoniseTune(t.notes, tuneLadder, range) : { notes: placeTune(t.notes, tuneLadder, range), chords: none }), ladder: tuneLadder }] as const),
      ...RUNS.map((t) => [t.n, {
        ...(chords ? harmoniseRun(t.notes, t.keys!, ladderIn, range) : { notes: placeRun(t.notes, t.keys!, ladderIn, range), chords: none }),
        ladder: ladderIn(runPasses(t.notes, t.keys!, ladderIn, range)[0].pc, range),
      }] as const),
    ]);
  }, [tuneLadder, range, scale, chords]);
  const place = useCallback((t: BookTune) => placed.get(t.n)!.notes, [placed]);
  const chordsOf = useCallback((t: BookTune) => placed.get(t.n)!.chords, [placed]);
  const ladderOf = useCallback((t: BookTune) => placed.get(t.n)!.ladder, [placed]);
  const tunes = useMemo(() => book.filter((t) => level === "all" || t.difficulty === level), [book, level]);
  // the difficulties this book has tunes in
  const levels = useMemo(() => DIFFICULTIES.map((_, i) => i).filter((i) => book.some((t) => t.difficulty === i)), [book]);
  // a difficulty that hides the tune being sung picks the first one shown
  const filter = (lv: number | "all") => {
    setLevel(lv);
    const shown = book.filter((t) => lv === "all" || t.difficulty === lv);
    if (shown.length && !shown.some((t) => t.n === active)) setActive(shown[0].n);
  };
  // moving between the melodies and the runs starts on the other book's first tune, under its difficulty
  const switchTab = (id: Tab) => {
    setTab(id);
    const next = id === "runs" ? RUNS : id === "melodies" ? BOOK : null;
    if (next && !next.some((t) => t.n === active)) {
      setActive(next[0].n);
      setLevel(next[0].difficulty);
    }
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
  // a note tapped on a tune's card (each card's player runs its own tune)
  const [tapped, setTapped] = useState<{ n: number; i: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    setPlayed(null);
  }, []);
  useEffect(() => onSilence(clear), [clear]);
  // a run belongs to its ladder: a new key, scale or range (or leaving the page) stops it
  useEffect(() => () => silence(), [ladder, placed, tab]);
  const bpm = pocket?.bpm ?? FALLBACK_BPM;
  const beat = 60000 / bpm;

  // on the click's next beat while the metronome (or any pocket tool) plays, else straight away
  const leadMs = () => {
    const nextBeat = pocket?.nextBeat() ?? null;
    return nextBeat === null ? 60 : Math.max(0, (nextBeat - getAudioContext().currentTime) * 1000);
  };

  // a note tapped on a tune sounds alone, over whatever plays
  const tapTune = async (t: BookTune, i: number) => {
    await wakeAudio();
    const midi = place(t)[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setTimeout(() => piano.noteOff(midi), TAP_MS);
    setActive(t.n);
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

  const openFocus = (t: BookTune) => {
    setActive(t.n);
    setFocus(true);
  };
  const closeFocus = useCallback(() => setFocus(false), []);
  // previous and next step through the tunes listed; a tune playing stops
  const at = tunes.findIndex((t) => t.n === active);
  const step = useCallback((d: number) => {
    const t = tunes[at + d];
    if (!t) return;
    silence();
    setActive(t.n);
  }, [tunes, at]);
  const prev = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);
  const focused = tunes[at] ?? ALL.find((t) => t.n === active) ?? tunes[0] ?? book[0];

  // a tune's card holds its own mic; the page's mic is the scale's and the intervals'
  const message =
    tuneTab ? "Press play on a melody: a bar runs over it and loops, the mic listens, and the dot turns green on the note under the bar, red on another. The loop button sets the part that repeats."
    : micStatusMessage(status)
    ?? (tab === "intervals" ? null
    : status === "on" ? "Listening. Sing the scale up from the root: the dot turns green on a note of the scale, red on a note outside it."
    : "Tap a note to hear it, or play the scale up and down on the metronome's tempo. Then press Start microphone and sing it back.");

  const voiceSelect = (
    <Select size="sm" value={voice} onChange={pickVoice} aria-label="Voice"
      options={(Object.keys(VOICES) as Voice[]).map((v) => ({ value: v, label: `${VOICES[v].label} · ${midiToName(VOICES[v].low)}–${midiToName(VOICES[v].high)}` }))} />
  );
  const accuracySelect = (
    <Select size="sm" value={cents} onChange={pickAccuracy} aria-label="Accuracy" title="How close to the note counts as on it"
      options={ACCURACIES.map((a) => ({ value: a.cents, label: `${a.title} · ±${a.cents}¢` }))} />
  );
  const difficulties = [...levels.map((i) => ({ value: i as number | "all", label: DIFFICULTIES[i].title })), { value: "all" as const, label: "All" }];

  return (
    <div className="flex flex-col gap-5">
      <WithSettings
        side
        bar={
          <ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} side config={{
            scale: { slug: scale, onPick: setScale },
            ...(tab === "runs" ? { keys: false as const } : {}),
            labels: false,
            pocket: { clickAlways: true, onStatus: setPocket },
            rows: <>
              <BarRow label="Voice">{voiceSelect}</BarRow>
              <BarRow label="Accuracy">{accuracySelect}</BarRow>
              {/* the settings of the drill picked, under the ones every drill shares */}
              {tab === "scales" && (
                <BarRow label="Top rest">
                  <Select size="sm" value={rest} onChange={setRest} aria-label="Rest at the top" options={RESTS.map((n) => ({ value: n, label: n === 0 ? "None" : `${n} beat${n > 1 ? "s" : ""}` }))} />
                </BarRow>
              )}
              {tab === "intervals" && (
                <>
                  <BarRow label="Level">
                    <Select size="sm" value={intervalLevel} onChange={setIntervalLevel} aria-label="Level" options={EAR_LEVELS.map((l) => ({ value: l.n, label: `${l.n} · ${l.label}` }))} />
                  </BarRow>
                  <BarRow label="Direction">
                    <Select size="sm" value={direction} onChange={setDirection} aria-label="Direction" options={DIRECTIONS.map((d) => ({ value: d.id, label: d.label }))} />
                  </BarRow>
                  <BarRow label="Played">
                    <Select size="sm" value={prompt} onChange={setPrompt} aria-label="Played first" title={PROMPTS.find((p) => p.id === prompt)?.title} options={PROMPTS.map((p) => ({ value: p.id, label: p.label }))} />
                  </BarRow>
                </>
              )}
              {tuneTab && (
                <BarRow label="Difficulty">
                  <Select size="sm" value={level} onChange={filter} aria-label="Difficulty" title={level === "all" ? undefined : DIFFICULTIES[level].hint} options={difficulties} />
                </BarRow>
              )}
              {/* the mic's timing for the moving bar */}
              {tuneTab && <BarRow label="Play-ahead">{lagSlider}</BarRow>}
              {tuneTab && (
                <BarRow label="Chords">
                  <Checkbox checked={chords} onChange={pickChords} title="The piano plays a chord a bar under the tune">Piano chords under the tune</Checkbox>
                </BarRow>
              )}
            </>,
          }} />
        }
      >
        {/* which drill; its settings are in the side column with the rest */}
        <div role="tablist" aria-label="Drill" className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition sm:px-4 ${tab === t.id ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <section className={`${panel} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-medium text-slate-100">{tab === "runs" ? `Runs across the ${range.label.toLowerCase()} range` : tab === "melodies" ? `Melodies in ${tuneLadder.title}` : tab === "intervals" ? `Intervals from ${ladder.title}` : ladder.title}</h2>
            {tab === "scales" && (
              <Button size="sm" pressed={running} onClick={() => void play()} className={`inline-flex items-center gap-1.5 ${running ? "!border-sky-400/70 !bg-sky-500/20 !text-sky-100" : ""}`}>
                <Icon name={running ? "square" : "play"} size={13} fill={running} />
                {running ? "Stop the scale" : `Play the scale · ${bpm} bpm`}
              </Button>
            )}
            {tab === "scales" && <MicButton on={mic} onClick={toggleMic} />}
            {tab === "scales" && <InputChip status={status} />}
            {message && <p className="min-w-0 basis-full text-sm sm:basis-0 sm:flex-1 text-slate-400" aria-live="polite">{message}</p>}
          </div>
          {tuneTab ? (
            <MelodyFeed
              tunes={tunes}
              place={place}
              chordsOf={chordsOf}
              ladderOf={ladderOf}
              clef={clef}
              beatMs={beat}
              bpm={bpm}
              active={active}
              cents={cents}
              lagMs={lagMs}
              tapped={tapped}
              onNote={(t, i) => void tapTune(t, i)}
              onPick={(t) => setActive(t.n)}
              onFocus={openFocus}
              linkTo={linkTo}
              reveal={linked?.n ?? null}
            />
          ) : tab === "intervals" ? (
            <IntervalDrill ladder={ladder} range={range} clef={clef} pitch={pitch} cents={cents} semis={semis} direction={direction} prompt={prompt} mic={mic} micStatus={status} onMic={toggleMic} />
          ) : (
            <SingingStaff ladder={ladder} clef={clef} pitch={pitch} played={played} onNote={(i) => void tap(i)} cents={cents} />
          )}
        </section>
      </WithSettings>
      {focus && tuneTab && (
        <SingAlong
          // a new tune starts the player over; full screen stays open across them
          key={`focus-${focused.n}-${beat}-${chords}`}
          notes={place(focused)}
          chords={chordsOf(focused)}
          ladder={ladderOf(focused)}
          clef={clef}
          beatMs={beat}
          cents={cents}
          lagMs={lagMs}
          tapped={tapped?.n === focused.n ? tapped.i : null}
          onNote={(i) => void tapTune(focused, i)}
          info={<>#{focused.n} · {focused.stage.title} · {DIFFICULTIES[focused.difficulty].title} · {lengthLabel(focused)}</>}
          full
          onFull={(on) => !on && closeFocus()}
          nav={{ prev: at > 0 ? prev : undefined, next: at >= 0 && at < tunes.length - 1 ? next : undefined, label: `${Math.max(0, at) + 1} / ${tunes.length}` }}
          tools={<ShareButton link={() => linkTo(focused)} />}
          settings={<>
            <label className="flex items-center gap-2">
              <span className="uppercase tracking-wider text-slate-500">Tempo</span>
              <Slider min={MIN_BPM} max={MAX_BPM} step={1} value={bpm} onChange={(b) => pocket?.setTempo(b)} size="sm" className="w-40" aria-label="Tempo" />
              <span className="w-14 tabular-nums text-slate-200">{bpm} bpm</span>
            </label>
            <span className="flex items-center gap-1.5"><span className="uppercase tracking-wider text-slate-500">Voice</span>{voiceSelect}</span>
            <span className="flex items-center gap-1.5"><span className="uppercase tracking-wider text-slate-500">Accuracy</span>{accuracySelect}</span>
            <label className="flex items-center gap-2"><span className="uppercase tracking-wider text-slate-500">Play-ahead</span>{lagSlider}</label>
          </>}
        />
      )}
    </div>
  );
}
