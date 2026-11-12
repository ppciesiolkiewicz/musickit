"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BarRow, ScaleSettingsBar, WithSettings } from "@/components/chordKit/ScaleSettings";
import { Checkbox, Chip, Select } from "@/components/ui";
import { useLevelAtLeast } from "@/features/guide/Tier";
import { midiToName } from "@/features/sound";
import { VOICES, savedVoice, type Voice } from "@/features/theory/singing";
import { INTERVALS } from "@/lib/chordKit/intervals";
import { EAR_LEVELS, levelSemis } from "@/lib/practice/earGame";
import { View as IntervalSinger } from "@/features/exercises/basics/interval-singer";
import { KeyChips, KeysSwitch, LookSwitch, type Look } from "@/features/exercises/basics/interval-singer/IntervalOptions";
import { INTERVAL_DIRS, toggleOne, type IntervalDir } from "@/features/exercises/basics/interval-singer/asks";
import { panel } from "@/components/practice/shared";

/** where the voice picked last is kept, shared with the other singing pages */
const VOICE_KEY = "singing.range";
const DIR_LABEL: Record<IntervalDir, string> = { up: "Up", down: "Down", both: "Both" };
const ALL_KEYS = Array.from({ length: 12 }, (_, k) => k);
const ONE_TO_TWELVE = INTERVALS.filter((i) => i.semis >= 1 && i.semis <= 12);
const noTonic = () => {};

/**
 * The Sing an interval page: the plan's `interval-singer` tool on its own, with what it asks in the side panel: the
 * voice (the one the other singing pages keep), the keys, the direction, and the intervals by level or a custom set.
 * The keys and the view are Standard controls, as they are on the tool.
 */
export default function IntervalSingerApp({ lead }: { lead?: ReactNode }) {
  const standard = useLevelAtLeast("standard");
  const [voice, setVoice] = useState<Voice>("tenor");
  const [dir, setDir] = useState<IntervalDir>("up");
  const [level, setLevel] = useState<number | "custom">(1);
  const [custom, setCustom] = useState<number[] | null>(null);
  const [picked, setPicked] = useState([0]);
  const [random, setRandom] = useState(false);
  const [lookPicked, setLook] = useState<Look>("roll");
  const [dotPicked, setDot] = useState(true);
  useEffect(() => {
    let saved: Voice | null = null;
    try { saved = savedVoice(JSON.parse(window.localStorage.getItem(VOICE_KEY) ?? "null")); } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved voice after hydration
    if (saved) setVoice(saved);
  }, []);
  const pickVoice = (v: Voice) => {
    setVoice(v);
    try { window.localStorage.setItem(VOICE_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
  };
  const intervals = level === "custom" ? custom ?? [] : levelSemis(level);
  // the first Custom starts from the level it came from; after that it keeps its own set
  const pickCustom = () => {
    setCustom((c) => c ?? intervals);
    setLevel("custom");
  };
  const options = {
    keys: !standard ? [0] : random ? ALL_KEYS : picked,
    look: standard ? lookPicked : "roll" as Look,
    dot: standard ? dotPicked : true,
  };

  const bar = (
    <ScaleSettingsBar tonicPc={0} onTonic={noTonic} side config={{
      keys: false,
      labels: false,
      pocket: false,
      rows: <>
        <BarRow label="Voice">
          <Select size="sm" value={voice} onChange={pickVoice} aria-label="Voice"
            options={(Object.keys(VOICES) as Voice[]).map((v) => ({ value: v, label: `${VOICES[v].label} · ${midiToName(VOICES[v].low)}–${midiToName(VOICES[v].high)}` }))} />
        </BarRow>
        {standard && <BarRow label="Keys" info="Where Do comes from: only the keys picked, or a random one of all twelve each time.">
          <KeysSwitch random={random} onRandom={setRandom} />
          {!random && <KeyChips picked={picked} onToggle={(k) => setPicked((ks) => toggleOne(ks, k))} />}
        </BarRow>}
        <BarRow label="Direction">
          <Select size="sm" value={dir} onChange={setDir} aria-label="Direction" options={INTERVAL_DIRS.map((d) => ({ value: d, label: DIR_LABEL[d] }))} />
        </BarRow>
        <BarRow label="Level" info="Each level adds intervals to the ones before. Start with the 5th and octave, then the 3rds that make chords major or minor. Custom lets you pick your own.">
          {EAR_LEVELS.map((l) => <Chip key={l.n} on={level === l.n} onClick={() => setLevel(l.n)} title={l.label}>{l.n}</Chip>)}
          <Chip on={level === "custom"} onClick={pickCustom}>Custom</Chip>
        </BarRow>
        <BarRow label="Intervals">
          {ONE_TO_TWELVE.filter((i) => level === "custom" || intervals.includes(i.semis)).map((i) => (
            <Chip key={i.semis} disabled={level !== "custom"} on={intervals.includes(i.semis)} onClick={() => setCustom((c) => toggleOne(c ?? [], i.semis))}
              title={level !== "custom" ? `The ${i.name}: pick Custom to change the set` : intervals.includes(i.semis) ? (intervals.length > 1 ? `Leave out the ${i.name}` : "At least one interval") : `Ask the ${i.name} too`}>{i.short}</Chip>
          ))}
        </BarRow>
        {standard && <BarRow label="View">
          <LookSwitch look={options.look} onLook={setLook} />
          <Checkbox checked={options.dot} onChange={setDot} title="Off is harder: you sing without seeing your voice">Show my voice</Checkbox>
        </BarRow>}
      </>,
    }} />
  );

  return (
    <WithSettings side bar={bar}>
      {lead}
      <section className={`${panel} mx-auto w-full max-w-3xl`}>
        <IntervalSinger key={voice} voice={voice} intervals={intervals} dir={dir} options={options} />
      </section>
    </WithSettings>
  );
}
