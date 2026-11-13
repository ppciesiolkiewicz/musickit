"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SettingsPanel, SettingsRow, SettingsSection } from "@/components/ui";
import { AccuracyRow, KeyRow, MAX_LAG_MS, MelodyViewRow, PlayAheadRow, PocketSection, ScaleFacts, keyAndScaleName, usePlayAhead } from "@/features/settings";
import { useMicPitch } from "@/components/practice/useMicPitch";
import Icon from "@/components/Icon";
import { Button, Hint, HintProvider, Select, Slider } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { getAudioContext, getSharedPiano, midiToName, onSilence, playSequence, silence, wakeAudio } from "@/features/sound";
import { MAX_BPM, MIN_BPM, type PocketStatus } from "@/features/instruments";
import { VOICES, buildLadder, clefFor, hzToMidi, savedVoice, scaleRun, tuneLadderFor, type Ladder, type Range, type Voice } from "@/features/theory/singing";
import { BOOK, DIFFICULTIES, RUNS, runPasses, type BookTune, type PlacedNote } from "@/features/theory/singingMelodies";
import { harmoniseRun, harmoniseTune, type MelodyChord } from "@/features/theory/melodyChords";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { singingQuery, type SingingLink } from "@/features/theory/singingLink";
import SingingStaff from "./SingingStaff";
import MelodyFeed from "./MelodyFeed";
import InputChip, { micStatusMessage } from "@/components/InputChip";
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
/** which singing page: the scale, the melody book or the runs book (each its own page in the Singing menu) */
export type SingingMode = "scales" | "melodies" | "runs";

/**
 * Sing against the staff: pick the key, the scale and the voice type in the side column (with the drone and the metronome
 * from the scales pages, and the page's own settings as dropdowns). `mode` picks the page:
 * - "scales": tap a note to hear it, or play the scale up and down on the metronome's tempo, then switch the mic on and a
 *   dot follows your voice over the notes.
 * - "melodies": the melody book (written tunes in the key that end on a whole-note Do, in book order, filtered by
 *   difficulty), each card the plan's sing-along player (`SingAlong`): play, stop, the mic, a loop over a part, staff or
 *   piano roll, at the page's tempo. Picking a scale starts the picked tune's mic. Full screen holds one tune with arrows on its margins (and ←/→ or a swipe) to step
 *   through the tunes listed. The address keeps the key, the scale and the tune picked (and whether it is open full
 *   screen), so a copied link (or a card's share button, which always opens full screen) opens the same.
 * - "runs": the same with the runs book.
 */
export default function SingingApp({ mode, initial, lead }: { mode: SingingMode; initial: SingingLink; lead?: ReactNode }) {
  useCoverage({ hints: 2 });
  const tab = mode;
  const book = tab === "runs" ? RUNS : BOOK;
  const tuneTab = tab === "melodies" || tab === "runs";
  const linked = tuneTab ? book.find((t) => t.n === initial.melody) : undefined;
  const [tonicPc, setTonicPc] = useState(initial.tonicPc);
  const [scale, setScale] = useState(initial.scale);
  const [voice, setVoice] = useState<Voice>("soprano");
  // how close counts as on the note, shared with the singing tools
  const [cents] = useAccuracy();
  // how far the bar runs ahead of the voice dot on a melody
  const [lagMs, pickLag] = usePlayAhead();
  // the last voice and play-ahead come back after hydration; a pick is kept as it is made
  useEffect(() => {
    let saved: Voice | null = null;
    try {
      saved = savedVoice(JSON.parse(window.localStorage.getItem(VOICE_KEY) ?? "null"));
    } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved picks after hydration
    if (saved) setVoice(saved);
  }, []);
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
  // the tune being sung, by number, and the difficulty whose tunes are listed ("all", the whole book, to start with)
  const [active, setActive] = useState(linked?.n ?? book[0].n);
  const [level, setLevel] = useState<number | "all">("all");
  // one melody full screen, in the page (not the browser's full screen); a shared link opens its tune this way
  const [focus, setFocus] = useState(!!linked && initial.full);
  useEffect(
    () => writeQuery(singingQuery({ tonicPc, scale, melody: tuneTab ? active : null, full: focus })),
    [tonicPc, scale, tuneTab, active, focus],
  );
  // a link to a tune in this key and scale, opening full screen, for its share button
  const linkTo = (t: BookTune) => `${window.location.origin}${window.location.pathname}?${singingQuery({ tonicPc, scale, melody: t.n, full: true })}`;
  const [mic, setMic] = useState(false);
  // the tune picked listens once a scale is picked (a press, so the browser lets the mic start)
  const [listen, setListen] = useState(false);
  const pickScale = (slug: typeof scale) => {
    setScale(slug);
    if (tuneTab) setListen(true);
  };
  const [pocket, setPocket] = useState<PocketStatus | null>(null);
  const clef = clefFor(range);
  const ladder = useMemo(() => buildLadder(scale, tonicPc, range) ?? buildLadder("major-ionian", tonicPc, range)!, [scale, tonicPc, range]);
  // the tunes are written in seven-note degrees: a pentatonic sings them in its major or minor; they can dip under the lowest Do
  const tuneLadder = useMemo(() => tuneLadderFor(ladder, tonicPc, range), [ladder, tonicPc, range]);
  // a run spans the voice whatever the key picked: its last pass tops out on the range's top, its staff in its first pass's key
  const placed = useMemo(() => {
    const ladderIn = (pc: number, r: Range) => tuneLadderFor(buildLadder(scale, pc, r) ?? buildLadder("major-ionian", pc, r)!, pc, r);
    return new Map<number, { notes: PlacedNote[]; chords: MelodyChord[]; ladder: Ladder }>([
      ...BOOK.map((t) => [t.n, { ...harmoniseTune(t.notes, tuneLadder, range), ladder: tuneLadder }] as const),
      ...RUNS.map((t) => [t.n, {
        // a bar of the first key's I and V before the run, as before each key change, so the key is heard before the singing starts
        ...harmoniseRun(t.notes, t.keys!, ladderIn, range, { intro: true }),
        ladder: ladderIn(runPasses(t.notes, t.keys!, ladderIn, range)[0].pc, range),
      }] as const),
    ]);
  }, [tuneLadder, range, scale]);
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

  // a tune's card holds its own mic; the page's mic is the scale's
  const message =
    tuneTab ? `Press play on a ${tab === "runs" ? "run" : "melody"}: a bar runs over it and loops, the mic listens (picking a scale starts it too), and the dot turns green on the note under the bar, red on another. The loop button sets the part that repeats.`
    : micStatusMessage(status)
    ?? (status === "on" ? "Listening. Sing the scale up from the root: the dot turns green on a note of the scale, red on a note outside it."
    : "Tap a note to hear it, or play the scale up and down on the metronome's tempo. Then press Start microphone and sing it back.");

  const voiceSelect = (
    <Select size="sm" value={voice} onChange={pickVoice} aria-label="Voice"
      options={(Object.keys(VOICES) as Voice[]).map((v) => ({ value: v, label: `${VOICES[v].label} · ${midiToName(VOICES[v].low)}–${midiToName(VOICES[v].high)}` }))} />
  );
  const difficulties = [...levels.map((i) => ({ value: i as number | "all", label: DIFFICULTIES[i].title })), { value: "all" as const, label: "All" }];

  return (
    <HintProvider>
    <div className="flex flex-col gap-5">
      <SettingsPanel
        name={keyAndScaleName(tonicPc, scale)}
        summary={<ScaleFacts labels={false} pocket={pocket} />}
        settings={<>
          {tuneTab && (
            <SettingsSection title="Filter" first>
              <SettingsRow label="Difficulty">
                <Select size="sm" value={level} onChange={filter} aria-label="Difficulty" title={level === "all" ? undefined : DIFFICULTIES[level].hint} options={difficulties} />
              </SettingsRow>
            </SettingsSection>
          )}
          <SettingsSection title="Settings" first={!tuneTab}>
            <KeyRow tonicPc={tonicPc} onTonic={setTonicPc} scale={{ slug: scale, onPick: pickScale }} keys={tab !== "runs"} />
            <SettingsRow label="Voice">{voiceSelect}</SettingsRow>
            <AccuracyRow />
            {tuneTab && <MelodyViewRow />}
            {tuneTab && <PlayAheadRow />}
            {/* the settings of the drill picked, under the ones every drill shares */}
            {tab === "scales" && (
              <SettingsRow label="Top rest">
                <Select size="sm" value={rest} onChange={setRest} aria-label="Rest at the top" options={RESTS.map((n) => ({ value: n, label: n === 0 ? "None" : `${n} beat${n > 1 ? "s" : ""}` }))} />
              </SettingsRow>
            )}
          </SettingsSection>
        </>}
        tools={<PocketSection keyPc={tonicPc} side clickAlways onStatus={setPocket} />}
      >
        {/* the page's lead-in sits in the content column, so the settings column starts at the top beside it */}
        {lead}
        <section data-tour="singing-drill" className={`${panel} flex flex-col gap-3`}>
          <div data-tour="singing-controls" className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-medium text-slate-100">{tab === "runs" ? `Runs across the ${range.label.toLowerCase()} range` : tab === "melodies" ? `Melodies in ${tuneLadder.title}` : ladder.title}</h2>
            {tab === "scales" && (
              <Hint title={running ? "Stop" : "Play the scale"} description={running ? "Ends the scale." : "Runs it up and down on the metronome's tempo."}>
                <Button size="sm" pressed={running} onClick={() => void play()} className={`inline-flex items-center gap-1.5 ${running ? "!border-sky-400/70 !bg-sky-500/20 !text-sky-100" : ""}`}>
                  <Icon name={running ? "square" : "play"} size={13} fill={running} />
                  {running ? "Stop the scale" : `Play the scale · ${bpm} bpm`}
                </Button>
              </Hint>
            )}
            {tab === "scales" && (
              <Hint title="Mic" description="Starts the microphone and opens the list of inputs, with each input's level. Stop it from the list.">
                <InputChip status={status} mic={{ on: mic, onToggle: toggleMic }} />
              </Hint>
            )}
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
              listen={listen}
              cents={cents}
              lagMs={lagMs}
              playAhead={lagSlider}
              hostSettings
              tapped={tapped}
              onNote={(t, i) => void tapTune(t, i)}
              onPick={(t) => setActive(t.n)}
              onFocus={openFocus}
              full={focus}
              onClose={closeFocus}
              nav={{ prev: at > 0 ? prev : undefined, next: at >= 0 && at < tunes.length - 1 ? next : undefined, label: `${Math.max(0, at) + 1} / ${tunes.length}` }}
              fullSettings={<>
                <label className="flex items-center gap-2">
                  <span className="uppercase tracking-wider text-slate-500">Tempo</span>
                  <Slider min={MIN_BPM} max={MAX_BPM} step={1} value={bpm} onChange={(b) => pocket?.setTempo(b)} size="sm" className="w-40" aria-label="Tempo" />
                  <span className="w-14 tabular-nums text-slate-200">{bpm} bpm</span>
                </label>
                <span className="flex items-center gap-1.5"><span className="uppercase tracking-wider text-slate-500">Voice</span>{voiceSelect}</span>
              </>}
              linkTo={linkTo}
              reveal={linked?.n ?? null}
            />
          ) : (
            <SingingStaff ladder={ladder} clef={clef} pitch={pitch} played={played} onNote={(i) => void tap(i)} cents={cents} />
          )}
        </section>
      </SettingsPanel>
    </div>
    </HintProvider>
  );
}
