"use client";

import { useRef, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { Dropdown, DropdownSection, Slider, Tile, hueAt } from "@/components/ui";
import { useVolume } from "@/features/sound";
import { ACCURACIES } from "@/features/theory/singing";
import { LABEL_SYSTEMS, type LabelSystem } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { useAccuracy } from "@/features/theory/useAccuracy";
import { useExerciseSetting, type MelodyView } from "./exerciseSettings";

const LABEL_GLYPH: Record<LabelSystem, string> = { note: "C", interval: "R", degree: "1", solfege: "Do" };
const VIEWS: { id: MelodyView; label: string; icon: "music" | "piano" }[] = [
  { id: "staff", label: "Staff", icon: "music" },
  { id: "roll", label: "Piano roll", icon: "piano" },
];

/** The app's volume as a speaker (tap to mute) and a short slider. */
export function Volume() {
  const [volume, setVolume] = useVolume();
  const before = useRef(volume || 0.8);
  const icon = volume === 0 ? "volume-x" : volume < 0.5 ? "volume-1" : "volume-2";
  const toggle = () => {
    if (volume > 0) {
      before.current = volume;
      setVolume(0);
    } else setVolume(before.current);
  };
  return (
    <span className="inline-flex items-center gap-1" title={`Volume of every sound in the app: ${Math.round(volume * 100)}%`}>
      <button type="button" tabIndex={-1} onClick={toggle} aria-label={volume === 0 ? "Unmute" : "Mute"} aria-pressed={volume === 0}
        className={`grid h-8 w-8 place-items-center rounded-lg transition hover:bg-slate-800 ${volume === 0 ? "text-amber-300" : "text-slate-400 hover:text-slate-200"}`}>
        <Icon name={icon} size={16} />
      </button>
      <Slider value={volume} onChange={setVolume} min={0} max={1} step={0.01} size="sm" className="w-16 sm:w-20" aria-label="Volume" />
    </span>
  );
}

/**
 * A tool's sound and view controls: the volume (every sound in the app) inline; behind the sliders button, tiles for
 * singing accuracy, note labels and how a melody is drawn, each section with an (i) saying what it does, then the
 * host's own sections (`more`, e.g. the singing page's play-ahead and chords). What only this tool plays (tempo,
 * looping) stays on the tool. `labels` is the system the tool shows, to light its tile; leave it out for a tool with
 * no note labels.
 */
export default function ToolSettings({ labels, omit = [], accuracy = false, view = false, more, volume = true }: { labels?: LabelSystem; /** label systems this tool cannot show, left out of the picker */ omit?: LabelSystem[]; accuracy?: boolean; view?: boolean; more?: ReactNode; /** false when the host shows <Volume /> elsewhere */ volume?: boolean }) {
  const [, setLabels] = useLabelSystem();
  const [cents, setCents] = useAccuracy();
  const [melodyView, setView] = useExerciseSetting("view");
  if (!accuracy && !labels && !view && !more) return volume ? <Volume /> : null;
  return (
    <span className="inline-flex items-center gap-2">
      {volume && <Volume />}
      <Dropdown label="Sound and view settings" button={<Icon name="sliders-horizontal" size={15} />}>
        {accuracy && (
          <DropdownSection title="Accuracy" info={<>How close your voice has to be to count as on the note. A semitone is 100 cents (¢): Easy takes anything within ±40¢, Pro only ±8¢. Start on Easy and move up when the dot stays green.</>}>
            <div role="radiogroup" aria-label="Accuracy" className="grid grid-cols-4 gap-1.5">
              {ACCURACIES.map((a, i) => (
                <Tile key={a.title} radio hue={hueAt(i + 8)} on={a.cents === cents} onClick={() => setCents(a.cents)} title={`Within ${a.cents} cents counts as on the note`}
                  icon={<span className="text-[11px] font-semibold tabular-nums">±{a.cents}</span>}>
                  {a.title}
                </Tile>
              ))}
            </div>
          </DropdownSection>
        )}
        {labels && (
          <DropdownSection title="Labels" info={<>What the notes are called. Note names (C, E, G) are the letters; intervals (R, b3, p5) and scale degrees (1, b3, 5) count up from the root of the key; solfège (Do, Me, Sol) gives each one a syllable to sing.</>}>
            <div role="radiogroup" aria-label="Note labels" className="grid grid-cols-4 gap-1.5">
              {LABEL_SYSTEMS.filter((s) => !omit.includes(s.id)).map((s, i) => (
                <Tile key={s.id} radio hue={hueAt(i)} on={labels === s.id} onClick={() => setLabels(s.id)} title={`${s.label} (${s.hint})`}
                  icon={<span className="text-sm font-semibold">{LABEL_GLYPH[s.id]}</span>}>
                  {s.label.split(" ")[0]}
                </Tile>
              ))}
            </div>
          </DropdownSection>
        )}
        {view && (
          <DropdownSection title="Melody view" info={<>How the tune is drawn. Staff shows the notes as written. Piano roll shows each note as a bar at its pitch and keeps the line your voice took.</>}>
            <div role="radiogroup" aria-label="Melody view" className="grid grid-cols-2 gap-1.5">
              {VIEWS.map((v, i) => (
                <Tile key={v.id} radio hue={hueAt(i + 4)} on={melodyView === v.id} onClick={() => setView(v.id)} icon={<Icon name={v.icon} size={16} />}>{v.label}</Tile>
              ))}
            </div>
          </DropdownSection>
        )}
        {more}
      </Dropdown>
    </span>
  );
}
