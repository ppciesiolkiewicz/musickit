"use client";

import { useRef, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { Chip, DropdownSection, SettingsRow, Slider, Tile, hueAt } from "@/components/ui";
import { useExerciseSetting, type MelodyView } from "@/components/practice/exerciseSettings";
import { useVolume } from "@/features/sound";
import { ACCURACIES } from "@/features/theory/singing";
import { LABEL_SYSTEMS, type LabelSystem } from "@/features/theory/labels";
import { LabelSelect, useLabelSystem } from "@/features/theory/useLabelSystem";
import { useAccuracy } from "@/features/theory/useAccuracy";

/**
 * The app-wide settings as rows: each saved for the whole app (its own hook), so a page's panel and a tool's sliders
 * button in the plan show and change the same value. `look`: "bar" a `SettingsRow` for a settings panel, "menu" a
 * `DropdownSection` of tiles for the sliders button (`ToolSettings`).
 */
export type RowLook = "bar" | "menu";

const LABEL_INFO = "How notes are labelled: note names, intervals from the root (R, b3, p5), scale degrees, or each note's job in the chord. One setting for the whole app; dot colours stay the same either way.";
const LABEL_MENU_INFO = <>What the notes are called. Note names (C, E, G) are the letters; intervals (R, b3, p5) and scale degrees (1, b3, 5) count up from the root of the key; solfège (Do, Me, Sol) gives each one a syllable to sing.</>;
const ACCURACY_INFO = <>How close your voice has to be to count as on the note. A semitone is 100 cents (¢): Easy takes anything within ±40¢, Pro only ±8¢. Start on Easy and move up when the dot stays green.</>;
const VIEW_INFO = <>How the tune is drawn. Staff shows the notes as written. Piano roll shows each note as a bar at its pitch and keeps the line your voice took.</>;

const LABEL_GLYPH: Record<LabelSystem, string> = { note: "C", interval: "R", degree: "1", solfege: "Do" };
const VIEWS: { id: MelodyView; label: string; icon: "music" | "piano" }[] = [
  { id: "staff", label: "Staff", icon: "music" },
  { id: "roll", label: "Piano roll", icon: "piano" },
];

/**
 * Note labels. `omit`: systems the page can't show; `shown` (menu): the system the tool shows, to light its tile, when it
 * differs from the app's; `extra` (bar): after the picker.
 */
export function LabelsRow({ omit = [], shown, extra, info, look = "bar" }: { omit?: LabelSystem[]; shown?: LabelSystem; extra?: ReactNode; /** (bar) in place of the usual explanation, when `extra` needs one */ info?: ReactNode; look?: RowLook }) {
  const [system, setLabels] = useLabelSystem();
  if (look === "bar") {
    return (
      <SettingsRow label="Labels" info={info ?? LABEL_INFO}>
        <LabelSelect showLabel={false} omit={omit} />
        {extra}
      </SettingsRow>
    );
  }
  const lit = shown ?? system;
  return (
    <DropdownSection title="Labels" info={LABEL_MENU_INFO}>
      <div role="radiogroup" aria-label="Note labels" className="grid grid-cols-4 gap-1.5">
        {LABEL_SYSTEMS.filter((s) => !omit.includes(s.id)).map((s, i) => (
          <Tile key={s.id} radio hue={hueAt(i)} on={lit === s.id} onClick={() => setLabels(s.id)} title={`${s.label} (${s.hint})`}
            icon={<span className="text-sm font-semibold">{LABEL_GLYPH[s.id]}</span>}>
            {s.label.split(" ")[0]}
          </Tile>
        ))}
      </div>
    </DropdownSection>
  );
}

/** How close the voice has to be to count as on the note. */
export function AccuracyRow({ look = "bar" }: { look?: RowLook }) {
  const [cents, setCents] = useAccuracy();
  if (look === "bar") {
    return (
      <SettingsRow label="Accuracy" info={ACCURACY_INFO}>
        {ACCURACIES.map((a) => (
          <Chip key={a.title} on={a.cents === cents} onClick={() => setCents(a.cents)} title={`Within ${a.cents} cents counts as on the note`}>{a.title}</Chip>
        ))}
      </SettingsRow>
    );
  }
  return (
    <DropdownSection title="Accuracy" info={ACCURACY_INFO}>
      <div role="radiogroup" aria-label="Accuracy" className="grid grid-cols-4 gap-1.5">
        {ACCURACIES.map((a, i) => (
          <Tile key={a.title} radio hue={hueAt(i + 8)} on={a.cents === cents} onClick={() => setCents(a.cents)} title={`Within ${a.cents} cents counts as on the note`}
            icon={<span className="text-[11px] font-semibold tabular-nums">±{a.cents}</span>}>
            {a.title}
          </Tile>
        ))}
      </div>
    </DropdownSection>
  );
}

/** How a melody is drawn: staff or piano roll. */
export function MelodyViewRow({ look = "bar" }: { look?: RowLook }) {
  const [view, setView] = useExerciseSetting("view");
  if (look === "bar") {
    return (
      <SettingsRow label="Melody view" info={VIEW_INFO}>
        {VIEWS.map((v) => <Chip key={v.id} on={view === v.id} onClick={() => setView(v.id)}>{v.label}</Chip>)}
      </SettingsRow>
    );
  }
  return (
    <DropdownSection title="Melody view" info={VIEW_INFO}>
      <div role="radiogroup" aria-label="Melody view" className="grid grid-cols-2 gap-1.5">
        {VIEWS.map((v, i) => (
          <Tile key={v.id} radio hue={hueAt(i + 4)} on={view === v.id} onClick={() => setView(v.id)} icon={<Icon name={v.icon} size={16} />}>{v.label}</Tile>
        ))}
      </div>
    </DropdownSection>
  );
}

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

/** The app's volume, as a panel row ("bar") or on its own (anything else: beside the sliders button). */
export function VolumeRow({ look = "bar" }: { look?: RowLook }) {
  if (look === "bar") return <SettingsRow label="Volume"><Volume /></SettingsRow>;
  return <Volume />;
}
