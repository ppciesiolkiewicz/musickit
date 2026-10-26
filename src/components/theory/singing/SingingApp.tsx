"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarRow, ScaleSettingsBar, WithSettings } from "@/components/chordKit/ScaleSettings";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { Button, Chip, Slider } from "@/components/ui";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { getAudioContext, getSharedPiano, midiToName, onSilence, playSequence, silence, wakeAudio } from "@/features/sound";
import { MAX_BPM, MIN_BPM, type PocketStatus } from "@/features/instruments";
import { ACCURACIES, IN_TUNE_CENTS, VOICES, buildLadder, clefFor, hzToMidi, savedAccuracy, savedVoice, scaleRun, withNotesUnder, type Voice } from "@/features/theory/singing";
import { BOOK, DIFFICULTIES, placeTune, type BookTune, type PlacedNote } from "@/features/theory/singingMelodies";
import { singingQuery, type SingingLink } from "@/features/theory/singingLink";
import { canFullscreen, enterFullscreen, exitFullscreen, isFullscreen, onFullscreenChange } from "@/lib/fullscreen";
import SingingStaff from "./SingingStaff";
import MelodyFeed from "./MelodyFeed";
import MelodyFocus from "./MelodyFocus";
import MicButton from "./MicButton";
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
/** where the accuracy picked last is kept, in cents */
const ACCURACY_KEY = "singing.accuracy";
type Tab = "scales" | "melodies";
const TABS: { id: Tab; label: string }[] = [{ id: "scales", label: "Scales" }, { id: "melodies", label: "Melodies" }];

/**
 * Sing the notes of a scale against its staff: pick the key, the scale and the voice type (its range shown beside it) in
 * the settings bar (with the drone and the metronome from the scales pages). Tap a note to hear it, or play the scale up
 * and down on the metronome's tempo, then switch the mic on and a dot follows your voice over the notes. The Melodies
 * tab does the same with the melody book: written tunes in the key that end on a whole-note Do, in book order, filtered by
 * difficulty; on the tune picked (or last played or tapped) a bar runs on the metronome's count and the dot sings along it, a
 * moment behind. The metronome runs muted from the first press on the page; playing a tune starts it over on the tune's beat 1.
 * The address keeps the key, the scale and the tune being sung, so a copied link (or a card's share button) opens the same.
 */
export default function SingingApp({ initial }: { initial: SingingLink }) {
  const linked = BOOK.find((t) => t.n === initial.melody);
  const [tonicPc, setTonicPc] = useState(initial.tonicPc);
  const [scale, setScale] = useState(initial.scale);
  const [voice, setVoice] = useState<Voice>("soprano");
  // how close counts as on the note
  const [cents, setCents] = useState<number>(IN_TUNE_CENTS);
  // the last voice and accuracy come back after hydration; a pick is kept as it is made
  useEffect(() => {
    let saved: Voice | null = null;
    let accuracy: number | null = null;
    try {
      saved = savedVoice(JSON.parse(window.localStorage.getItem(VOICE_KEY) ?? "null"));
      accuracy = savedAccuracy(JSON.parse(window.localStorage.getItem(ACCURACY_KEY) ?? "null"));
    } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved picks after hydration
    if (saved) setVoice(saved);
    if (accuracy !== null) setCents(accuracy);
  }, []);
  const pickAccuracy = (c: number) => {
    setCents(c);
    try { window.localStorage.setItem(ACCURACY_KEY, JSON.stringify(c)); } catch { /* storage blocked */ }
  };
  const pickVoice = (v: Voice) => {
    setVoice(v);
    try { window.localStorage.setItem(VOICE_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
  };
  const range = VOICES[voice];
  const [rest, setRest] = useState(2);
  const [tab, setTab] = useState<Tab>(linked ? "melodies" : "scales");
  // the tune being sung, by number, and the difficulty whose tunes are listed ("all" for the whole book); a linked tune shows
  // under its own difficulty
  const [active, setActive] = useState(linked?.n ?? 1);
  const [level, setLevel] = useState<number | "all">(linked?.difficulty ?? 0);
  useEffect(() => writeQuery(singingQuery({ tonicPc, scale, melody: tab === "melodies" ? active : null })), [tonicPc, scale, tab, active]);
  // a link to a tune in this key and scale, for its share button
  const linkTo = (t: BookTune) => `${window.location.origin}${window.location.pathname}?${singingQuery({ tonicPc, scale, melody: t.n })}`;
  const [mic, setMic] = useState(false);
  const [pocket, setPocket] = useState<PocketStatus | null>(null);
  const clef = clefFor(range);
  const ladder = useMemo(() => buildLadder(scale, tonicPc, range) ?? buildLadder("major-ionian", tonicPc, range)!, [scale, tonicPc, range]);
  // the tunes are written in seven-note degrees: a pentatonic sings them in its major or minor; they can dip under the lowest Do
  const tuneLadder = useMemo(
    () => withNotesUnder(ladder.pcs.size === 7 ? ladder : buildLadder(ladder.notes.some((n) => n.label === "♭3") ? "natural-minor-aeolian" : "major-ionian", tonicPc, range)!, range),
    [ladder, tonicPc, range],
  );
  const placed = useMemo(() => new Map(BOOK.map((t) => [t.n, placeTune(t.notes, tuneLadder, range)])), [tuneLadder, range]);
  const place = useCallback((t: BookTune) => placed.get(t.n)!, [placed]);
  const tunes = useMemo(() => BOOK.filter((t) => level === "all" || t.difficulty === level), [level]);
  // a difficulty that hides the tune being sung picks the first one shown
  const filter = (lv: number | "all") => {
    setLevel(lv);
    const shown = BOOK.filter((t) => lv === "all" || t.difficulty === lv);
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
  // beats since the metronome's beat 1, for the melody's bar; null while it isn't running
  const gridBeats = useCallback(() => pocket?.gridBeats() ?? null, [pocket]);

  // a tune plays once from its card and becomes the one sung; Play again starts it over
  const playTune = async (t: BookTune) => {
    if (running) silence();
    await startTune(t);
  };
  // the metronome starts over with the tune, so its beat 1 is the click's (muted unless it was heard); from a later beat, the
  // metronome starts that far into its count, so its beats still fall on the tune's
  const startTune = async (t: BookTune, from = 0) => {
    await wakeAudio();
    const at = pocket ? await pocket.restart(from) : null;
    const lead = at === null ? 60 : Math.max(0, (at - getAudioContext().currentTime) * 1000);
    const notes: PlacedNote[] = place(t);
    playSequence(notes.filter((n) => n.at >= from).map((n) => ({ note: n.midi, at: lead + (n.at - from) * beat, hold: n.beats * beat * 0.9 })));
    const end = notes[notes.length - 1].at + notes[notes.length - 1].beats;
    setActive(t.n);
    setRunning(true);
    setPlaying(t.n);
    setPlayFrom(performance.now() + lead - from * beat);
    timers.current = [setTimeout(clear, lead + (end - from) * beat)];
  };
  // back to the start: the tune picked, the bar and the metronome over on beat 1, nothing played
  const restartTune = async (t: BookTune) => {
    silence();
    setActive(t.n);
    await wakeAudio();
    await pocket?.restart();
  };

  // a new tempo starts the metronome over, and the tune playing with it at the new speed
  const bpm = pocket?.bpm;
  const lastBpm = useRef(bpm);
  useEffect(() => {
    if (lastBpm.current === bpm) return;
    lastBpm.current = bpm;
    const t = BOOK.find((b) => b.n === playing);
    if (!t) return;
    silence();
    void startTune(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a tempo change replays
  }, [bpm]);

  // a note tapped while its tune plays carries the tune on from there; otherwise it sounds alone
  const tapTune = async (t: BookTune, i: number) => {
    if (playing === t.n) {
      silence();
      return startTune(t, place(t)[i].at);
    }
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

  // one melody full screen (the browser's too where it allows it); leaving the browser's full screen closes it
  const [focus, setFocus] = useState(false);
  const openFocus = (t: BookTune) => {
    setActive(t.n);
    setFocus(true);
    if (canFullscreen()) enterFullscreen();
  };
  const closeFocus = useCallback(() => {
    setFocus(false);
    exitFullscreen();
  }, []);
  useEffect(() => {
    if (!focus) return;
    return onFullscreenChange(() => !isFullscreen() && setFocus(false));
  }, [focus]);
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
  const focused = tunes[at] ?? BOOK.find((t) => t.n === active)!;

  const message =
    status === "asking" ? "Allow the microphone in your browser…"
    : status === "denied" ? "Microphone blocked. Allow it in the browser's site settings and try again."
    : status === "insecure" ? "The browser only allows the microphone on a secure (https) page."
    : status === "error" ? "No microphone found."
    : tab === "melodies" ? (status === "on" ? `Listening on melody #${active}. Sing each note as the bar reaches it: the bar loops in time with the metronome, and the dot turns green on the note under it, red on another.` : "Play a melody or tap its notes to hear it, then press Select on its card: the mic listens while a bar runs over the tune in time with the metronome.")
    : status === "on" ? "Listening. Sing the scale up from the root: the dot turns green on a note of the scale, red on a note outside it."
    : "Tap a note to hear it, or play the scale up and down on the metronome's tempo. Then press Sing and sing it back.";

  return (
    <div className="flex flex-col gap-5">
      <WithSettings
        side={false}
        bar={
          <ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} config={{
            scale: { slug: scale, onPick: setScale },
            labels: false,
            pocket: { clickAlways: true, onStatus: setPocket },
            top: (
              <BarRow label="Drill">
                {TABS.map((t) => <Chip key={t.id} on={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Chip>)}
              </BarRow>
            ),
            rows: <>
              <BarRow label="Voice">
                {(Object.keys(VOICES) as Voice[]).map((v) => (
                  <Chip key={v} on={v === voice} onClick={() => pickVoice(v)} title={`${midiToName(VOICES[v].low)} to ${midiToName(VOICES[v].high)}`}>{VOICES[v].label}</Chip>
                ))}
                <span className="whitespace-nowrap pl-1 text-xs tabular-nums text-slate-500">{midiToName(range.low)}–{midiToName(range.high)}</span>
              </BarRow>
              <BarRow label="Accuracy">
                {ACCURACIES.map((a) => (
                  <Chip key={a.title} on={a.cents === cents} onClick={() => pickAccuracy(a.cents)} title={`Within ${a.cents} cents counts as on the note`}>{a.title}</Chip>
                ))}
                <span className="whitespace-nowrap pl-1 text-xs tabular-nums text-slate-500">±{cents}¢</span>
              </BarRow>
              {tab === "scales" ? (
                <BarRow label="Top rest">
                  {RESTS.map((n) => (
                    <Chip key={n} on={n === rest} onClick={() => setRest(n)}>{n === 0 ? "None" : `${n} beat${n > 1 ? "s" : ""}`}</Chip>
                  ))}
                </BarRow>
              ) : (
                <BarRow label="Difficulty">
                  {DIFFICULTIES.map((d, i) => <Chip key={d.title} on={level === i} onClick={() => filter(i)} title={d.hint}>{d.title}</Chip>)}
                  <Chip on={level === "all"} onClick={() => filter("all")}>All</Chip>
                </BarRow>
              )}
            </>,
          }} />
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
              gridBeats={gridBeats}
              mic={mic}
              cents={cents}
              onPick={(t) => setActive(t.n)}
              onSing={(t) => {
                // the mic on the card being sung toggles it; on another card it moves the singing there and listens
                if (t.n === active) return toggleMic();
                setActive(t.n);
                if (!mic) toggleMic();
              }}
              onPlay={(t) => {
                // playing a tune selects it too: the mic listens to it
                void playTune(t);
                if (!mic) toggleMic();
              }}
              onStop={() => silence()}
              onRestart={(t) => void restartTune(t)}
              heard={!!pocket?.heard}
              onHear={(on) => pocket?.hear(on)}
              onNote={(t, i) => void tapTune(t, i)}
              onFocus={openFocus}
              linkTo={linkTo}
              reveal={linked?.n ?? null}
            />
          ) : (
            <SingingStaff ladder={ladder} clef={clef} pitch={pitch} played={played} onNote={(i) => void tap(i)} cents={cents} />
          )}
        </section>
      </WithSettings>
      {focus && tab === "melodies" && (
        <MelodyFocus
          tune={focused}
          index={Math.max(0, at)}
          count={tunes.length}
          staff={{
            notes: place(focused),
            ladder: tuneLadder,
            clef,
            pitch,
            playFrom: playing === focused.n ? playFrom : null,
            beatMs: beat,
            gridBeats,
            tapped: tapped?.n === focused.n ? tapped.i : null,
            onNote: (i) => void tapTune(focused, i),
            cents,
          }}
          bpm={pocket?.bpm ?? FALLBACK_BPM}
          mic={mic}
          playing={playing === focused.n}
          message={status === "on" ? "Sing each note as the bar reaches it" : status === "off" ? "Press Sing and sing along with the bar" : message}
          onPrev={prev}
          onNext={next}
          onSing={toggleMic}
          onPlay={() => {
            void playTune(focused);
            if (!mic) toggleMic();
          }}
          onStop={() => silence()}
          onRestart={() => void restartTune(focused)}
          heard={!!pocket?.heard}
          onHear={(on) => pocket?.hear(on)}
          link={() => linkTo(focused)}
          settings={<>
            <label className="flex items-center gap-2">
              <span className="uppercase tracking-wider text-slate-500">Tempo</span>
              <Slider min={MIN_BPM} max={MAX_BPM} step={1} value={pocket?.bpm ?? FALLBACK_BPM} onChange={(b) => pocket?.setTempo(b)} size="sm" className="w-40" aria-label="Tempo" />
              <span className="w-14 tabular-nums text-slate-200">{pocket?.bpm ?? FALLBACK_BPM} bpm</span>
            </label>
            <span className="flex items-center gap-1.5">
              <span className="uppercase tracking-wider text-slate-500">Accuracy</span>
              {ACCURACIES.map((a) => <Chip key={a.title} on={a.cents === cents} onClick={() => pickAccuracy(a.cents)} title={`Within ${a.cents} cents counts as on the note`}>{a.title}</Chip>)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="uppercase tracking-wider text-slate-500">Voice</span>
              {(Object.keys(VOICES) as Voice[]).map((v) => <Chip key={v} on={v === voice} onClick={() => pickVoice(v)} title={`${midiToName(VOICES[v].low)} to ${midiToName(VOICES[v].high)}`}>{VOICES[v].label}</Chip>)}
            </span>
          </>}
          onClose={closeFocus}
        />
      )}
    </div>
  );
}
