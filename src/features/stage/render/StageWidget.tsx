"use client";

import { useContext, useMemo, useState, type ReactNode } from "react";
import { ArpeggioOnGuitar } from "@/components/chordKit/ArpeggiosExplorer";
import { CagedBoxPanels, CagedNeckMap } from "@/components/chordKit/CagedExplorer";
import { ChordBubble } from "@/components/chordKit/ChordBubbles";
import { KeyScope, PLUGINS, keyContext, type KeyChoice } from "@/features/creator";
import { PracticeBand } from "@/features/instruments";
import type { PlanTool } from "@/features/plan/model/tools";
import { Tool } from "@/features/plan/ui/Tool";
import { LevelPin } from "@/features/guide/Tier";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { Tuner } from "@/features/tuner";
import { nextMelody } from "../model/families";
import { melodyDesignWidth } from "../model/melody";
import { cagedQualityOf, parseText, withOwnKey, type Subject } from "../model/subject";
import BrandWidget from "./BrandWidget";
import ChordWidget from "./ChordWidget";
import CountdownWidget from "./CountdownWidget";
import FitBox from "./FitBox";
import HeadphonesNotice from "./HeadphonesNotice";
import IntroWidget from "./IntroWidget";
import KeyTags from "./KeyTags";
import KeyWidget from "./KeyWidget";
import MelodyWidget from "./MelodyWidget";
import MicWidget, { MicContext } from "./MicWidget";
import NextWidget from "./NextWidget";
import PositionWidget from "./PositionWidget";
import ProgressWidget from "./ProgressWidget";
import SectionWidget from "./SectionWidget";
import TextWidget, { TextBlocks } from "./TextWidget";

/** design width each kind is laid out at before it is scaled into its rect */
const WIDTH: Record<Subject["kind"], number> = { chord: 240, plugin: 640, position: 980, band: 360, section: 760, bubble: 900, neck: 980, caged: 1100, arpeggio: 980, tool: 980, key: 760, tuner: 520, mic: 360, logo: 300, url: 520, text: 760, headphones: 760, camera: 0, screen: 0, melody: 0, countdown: 600, intro: 1000, progress: 400, next: 760 };
/** a cheatsheet page in full is laid out as wide as on the site */
const FULL_WIDTH = 1200;

/** a key to draw with when the subject has none: the site's default key, major */
const withTonic = (k: KeyChoice): KeyChoice => (k.tonicPc === null ? { ...k, tonicPc: DEFAULT_KEY_PC } : k);

export interface StageWidgetProps {
  subject: Subject;
  onSubjectChange: (s: Subject) => void;
  /** the master Key & scale, and how to change it (every widget follows it, except what is pinned on the widget) */
  stageKey: KeyChoice;
  onStageKey: (k: KeyChoice) => void;
  /** camera and screen layers are drawn by the host, which owns the streams */
  renderMedia?: (s: Subject) => ReactNode;
  /** a note being read: no key tags, and text is not a box to type in */
  readOnly?: boolean;
}

/**
 * A subject as a live widget. Props in, callbacks out, no studio state, so the editor can be handed this to replay the widget track.
 */
export default function StageWidget({ subject, onSubjectChange, stageKey, onStageKey, renderMedia, readOnly = false }: StageWidgetProps) {
  const ctx = useMemo(() => ("key" in subject ? keyContext(withTonic(subject.key)) : null), [subject]);
  if (subject.kind === "camera" || subject.kind === "screen") return <>{renderMedia?.(subject) ?? null}</>;
  // a key changed from inside the widget (a mode picked in Same notes) is pinned on it, like one changed with its tags
  const ownKey = (key: KeyChoice) => onSubjectChange(withOwnKey(subject, key));

  let body: ReactNode = null;
  switch (subject.kind) {
    case "chord":
      body = <ChordWidget symbol={subject.symbol} />;
      break;
    case "plugin": {
      const def = PLUGINS.find((p) => p.id === subject.plugin);
      if (!def) return null;
      const View = subject.full && def.Full ? def.Full : def.Component;
      body = (
        <KeyScope value={subject.key} onChange={ownKey}>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 @max-[640px]:p-0">
            <View />
          </div>
        </KeyScope>
      );
      break;
    }
    case "position":
      body = ctx && <PositionWidget ctx={ctx} kind={subject.positionKind} index={subject.index} />;
      break;
    case "band":
      body = (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <PracticeBand view="pocket" storageKey="musickit.pocket" config={{ parts: ["click", "drone", "drums", "bass"], keyPc: subject.key.tonicPc ?? DEFAULT_KEY_PC }} pocket={{ stacked: true }} />
        </div>
      );
      break;
    case "section":
      body = ctx && (
        <SectionWidget
          ctx={ctx}
          section={subject.section}
          familyIndex={subject.key.family}
          onPick={(s) => ownKey({ ...subject.key, tonicPc: s.tonicPc, mode: s.modeIndex })}
        />
      );
      break;
    case "bubble":
      body = ctx && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <ChordBubble ctx={ctx} degree={subject.degree} />
        </div>
      );
      break;
    case "neck":
      body = ctx && <PositionWidget ctx={ctx} kind="scale" index={null} />;
      break;
    case "caged": {
      const rootPc = subject.key.tonicPc ?? DEFAULT_KEY_PC, quality = cagedQualityOf(subject.key);
      const letters = subject.shapes?.length ? subject.shapes : subject.shape === null ? [] : [subject.shape];
      body = letters.length > 1 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {letters.map((l) => <CagedBoxPanels key={l} rootPc={rootPc} quality={quality} letter={l} />)}
        </div>
      ) : letters.length === 0 ? <CagedNeckMap rootPc={rootPc} quality={quality} /> : <CagedBoxPanels rootPc={rootPc} quality={quality} letter={letters[0]} />;
      break;
    }
    case "arpeggio":
      body = ctx && <ArpeggioOnGuitar ctx={ctx} degree={subject.degree} type={subject.type} neck={!!subject.neck} positions={subject.positions !== false} roots={subject.roots} />;
      break;
    case "tool":
      body = (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          {subject.tool.type === "staff" ? (
            <StudioStaff tool={subject.tool} />
          ) : subject.tool.type === "melody-singer" ? (
            <StudioMelody subject={subject} tool={subject.tool} readOnly={readOnly} onSubjectChange={onSubjectChange} />
          ) : (
            <Tool tool={subject.tool} />
          )}
        </div>
      );
      break;
    case "logo":
    case "url":
      body = <BrandWidget kind={subject.kind} />;
      break;
    case "text":
      body = readOnly ? <div className="p-5"><TextBlocks blocks={parseText(subject.text)} large /></div> : <TextWidget text={subject.text} onChange={(text) => onSubjectChange({ kind: "text", text })} />;
      break;
    case "headphones":
      body = <div className="p-3"><HeadphonesNotice /></div>;
      break;
    case "key":
      body = <KeyWidget value={stageKey} onChange={onStageKey} />;
      break;
    case "mic":
      body = <MicWidget />;
      break;
    case "tuner":
      body = (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <StudioTuner />
        </div>
      );
      break;
    // follow a host's timeline (widget videos); nothing without one
    case "melody":
      body = <MelodyWidget beats={subject.beats} />;
      break;
    case "countdown":
      body = <CountdownWidget />;
      break;
    case "intro":
      body = <IntroWidget />;
      break;
    case "progress":
      body = <ProgressWidget />;
      break;
    case "next":
      body = <NextWidget />;
      break;
  }
  // the CAGED map runs the whole neck: wider than one box, so its shape names fit over their colours
  const width = subject.kind === "melody" ? melodyDesignWidth(subject.beats) : subject.kind === "caged" && subject.shape === null && !subject.shapes?.length ? 1400 : subject.kind === "plugin" && subject.full ? FULL_WIDTH : WIDTH[subject.kind];
  // the stage has no level switch: its widgets always show every control, whatever level the teacher set elsewhere
  return (
    <LevelPin level="standard">
      <div className="relative h-full w-full">
        <FitBox width={width} trueSize={subject.kind === "text" && !readOnly} scroll={(subject.kind === "plugin" && !!subject.full) || (subject.kind === "section" && subject.section === "chords")}>{body}</FitBox>
        {!readOnly && <KeyTags subject={subject} master={stageKey} onChange={onSubjectChange} />}
      </div>
    </LevelPin>
  );
}

/** The tuner on the studio's one audio input when there is one (it opens no microphone of its own), else the tuner with its own. */
function StudioTuner() {
  const mic = useContext(MicContext);
  if (!mic) return <Tuner />;
  return <Tuner external={{ hz: mic.hz, listening: mic.status === "on" || mic.status === "asking", onToggle: mic.onToggle }} />;
}

/** A staff on the studio's one audio input when there is one, like the tuner; only it reads the input, so the other tools don't redraw with every pitch. */
function StudioStaff({ tool }: { tool: Extract<PlanTool, { type: "staff" }> }) {
  const mic = useContext(MicContext);
  // no studio audio input (the notes creator, the editor's replay): the staff never opens a microphone of its own
  if (!mic) return <Tool tool={{ ...tool, mic: false }} />;
  return <Tool tool={tool} input={{ hz: mic.hz, listening: mic.status === "on" || mic.status === "asking", onToggle: mic.onToggle }} />;
}

/**
 * A tune from the melody book (the tool names it and its number) with **Next melody**: on the stage the next tune is saved on the
 * widget (and so shared with the note); in a note being read it only changes what this reader sees.
 */
function StudioMelody({ subject, tool, readOnly, onSubjectChange }: { subject: Subject; tool: Extract<PlanTool, { type: "melody-singer" }>; readOnly: boolean; onSubjectChange: (s: Subject) => void }) {
  const [own, setOwn] = useState<{ from: number; tune: number } | null>(null);
  // a reader's own pick, until the widget's tune changes under it
  const tune = readOnly && own?.from === tool.tune ? own.tune : tool.tune;
  const next = () => {
    const n = nextMelody(tune);
    if (readOnly) setOwn({ from: tool.tune, tune: n });
    else onSubjectChange({ ...subject, tool: { ...tool, tune: n } } as Subject);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button type="button" onClick={next} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800">
          Next melody →
        </button>
      </div>
      <Tool key={tune} tool={{ ...tool, tune }} />
    </div>
  );
}
