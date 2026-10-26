"use client";

import { useContext, useMemo, type ReactNode } from "react";
import { CagedBoxPanels, CagedNeckMap } from "@/components/chordKit/CagedExplorer";
import { ChordBubble } from "@/components/chordKit/ChordBubbles";
import { KeyScope, PLUGINS, keyContext, type KeyChoice } from "@/features/creator";
import { PocketTools } from "@/features/instruments";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { Tuner } from "@/features/tuner";
import { cagedQualityOf, withOwnKey, type Subject } from "../model/subject";
import BrandWidget from "./BrandWidget";
import ChordWidget from "./ChordWidget";
import FitBox from "./FitBox";
import KeyTags from "./KeyTags";
import KeyWidget from "./KeyWidget";
import MicWidget, { MicContext } from "./MicWidget";
import PositionWidget from "./PositionWidget";
import SectionWidget from "./SectionWidget";

/** design width each kind is laid out at before it is scaled into its rect */
const WIDTH: Record<Subject["kind"], number> = { chord: 240, plugin: 640, position: 980, band: 360, section: 760, bubble: 900, neck: 980, caged: 1100, key: 760, tuner: 520, mic: 360, logo: 300, url: 520, camera: 0, screen: 0, melody: 1200, countdown: 600 };
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
}

/**
 * A subject as a live widget. Props in, callbacks out, no studio state, so the editor can be handed this to replay the widget track.
 */
export default function StageWidget({ subject, onSubjectChange, stageKey, onStageKey, renderMedia }: StageWidgetProps) {
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
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
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
          <PocketTools keyPc={subject.key.tonicPc ?? DEFAULT_KEY_PC} stacked />
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
      body = subject.shape === null ? <CagedNeckMap rootPc={rootPc} quality={quality} /> : <CagedBoxPanels rootPc={rootPc} quality={quality} letter={subject.shape} />;
      break;
    }
    case "logo":
    case "url":
      body = <BrandWidget kind={subject.kind} />;
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
    // drawn by the widget video renderer
    case "melody":
    case "countdown":
      return null;
  }
  // the CAGED map runs the whole neck: wider than one box, so its shape names fit over their colours
  const width = subject.kind === "caged" && subject.shape === null ? 1400 : subject.kind === "plugin" && subject.full ? FULL_WIDTH : WIDTH[subject.kind];
  return (
    <div className="relative h-full w-full">
      <FitBox width={width} scroll={(subject.kind === "plugin" && !!subject.full) || (subject.kind === "section" && subject.section === "chords")}>{body}</FitBox>
      <KeyTags subject={subject} master={stageKey} onChange={onSubjectChange} />
    </div>
  );
}

/** The tuner on the studio's one audio input when there is one (it opens no microphone of its own), else the tuner with its own. */
function StudioTuner() {
  const mic = useContext(MicContext);
  if (!mic) return <Tuner />;
  return <Tuner external={{ hz: mic.hz, listening: mic.status === "on" || mic.status === "asking", onToggle: mic.onToggle }} />;
}
