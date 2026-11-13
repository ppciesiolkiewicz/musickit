"use client";

import { useState, type ReactNode } from "react";
import ShapesTab from "./ShapesTab";
import KeyTab, { DEFAULT_CHORD_KEY, type ChordKey } from "./KeyTab";
import { KeyPicker, ModePicker } from "./KeyPicker";
import { SettingsPanel, SettingsSection } from "@/components/ui";
import { LabelsRow, VolumeRow } from "@/features/settings";
import { RootSelect } from "@/features/theory/useLabelSystem";

const COUNT_FROM_INFO = "How notes are labelled: note names, intervals from the root (R, b3, p5), scale degrees, or each note's job in the chord. One setting for the whole app. Count from picks what R means in a key: the scale's root, or each chord's own root; intervals, degrees and dot colours all follow it, so R is always white.";
import ProgressionsTab from "./ProgressionsTab";

const TABS = [
  { id: "shapes", label: "Shapes", hint: "Every movable chord shape, no key needed" },
  { id: "key", label: "In a key", hint: "Pick a key and mode, see the chords that fit" },
  { id: "prog", label: "Progressions", hint: "Forms in modes with shapes to use and neck positions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * The chords page's three sections, picked by tab. `initialTab` and `initialKey` start it somewhere else (the cheatsheet
 * builder opens it on its key). On its page (`syncUrl`) the labels, the volume and, on In a key, the key and mode sit in
 * the settings panel; embedded (the creator) the key and mode stay on the tab and there is no panel.
 */
export default function ChordKit({ initialTab = "shapes", initialKey, syncUrl = true, lead }: { initialTab?: TabId; initialKey?: { tonicPc: number; family: number; mode: number }; syncUrl?: boolean; /** the page's text before the explorer, inside the panel layout */ lead?: ReactNode } = {}) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [chordKey, setChordKey] = useState<ChordKey>(initialKey ? { tonicPc: initialKey.tonicPc, family: initialKey.family, mode: initialKey.mode } : DEFAULT_CHORD_KEY);
  const current = TABS.find((t) => t.id === tab)!;
  const body = (
    <div className="flex flex-col gap-4">
      <div data-tour="chords-tabs" role="tablist" aria-label="Chord explorer sections" className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
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
      <p className="text-xs text-slate-500">{current.hint}</p>
      {tab === "shapes" && <ShapesTab syncUrl={syncUrl} labels={!syncUrl} />}
      {tab === "key" && <KeyTab key={`${chordKey.family}:${chordKey.mode}`} chordKey={chordKey} onKey={setChordKey} pickers={!syncUrl} />}
      {tab === "prog" && <ProgressionsTab labels={!syncUrl} />}
    </div>
  );
  if (!syncUrl) return <>{lead}{body}</>;
  const settings = (
    <SettingsSection first>
      {tab === "key" && <>
        <KeyPicker look="bar" tonicPc={chordKey.tonicPc} onTonic={(pc) => setChordKey({ ...chordKey, tonicPc: pc })} />
        <ModePicker look="bar" familyIndex={chordKey.family} modeIndex={chordKey.mode} onChange={(f, m) => setChordKey({ tonicPc: chordKey.tonicPc, family: f, mode: m })} />
      </>}
      <LabelsRow info={COUNT_FROM_INFO} extra={<RootSelect />} />
      <VolumeRow />
    </SettingsSection>
  );
  return <SettingsPanel settings={settings}>{lead}{body}</SettingsPanel>;
}
