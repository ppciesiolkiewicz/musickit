"use client";

import { useMemo, type ReactNode } from "react";
import { KeyBar, KeyScope, PLUGINS, keyContext, type KeyChoice } from "@/features/creator";
import { PocketTools } from "@/features/instruments";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import type { Subject } from "../model/subject";
import BrandWidget from "./BrandWidget";
import ChordWidget from "./ChordWidget";
import FitBox from "./FitBox";
import PositionWidget from "./PositionWidget";
import SectionWidget from "./SectionWidget";

/** design width each kind is laid out at before it is scaled into its rect */
const WIDTH: Record<Subject["kind"], number> = { chord: 240, plugin: 640, position: 980, band: 360, section: 760, key: 560, logo: 300, url: 520, camera: 0, screen: 0 };

/** a key to draw with when the subject has none: the site's default key, major */
const withTonic = (k: KeyChoice): KeyChoice => (k.tonicPc === null ? { ...k, tonicPc: DEFAULT_KEY_PC } : k);

export interface StageWidgetProps {
  subject: Subject;
  onSubjectChange: (s: Subject) => void;
  /** the Key widget's key, and how to change it (it re-keys every key-aware widget) */
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

  let body: ReactNode = null;
  switch (subject.kind) {
    case "chord":
      body = <ChordWidget symbol={subject.symbol} />;
      break;
    case "plugin": {
      const def = PLUGINS.find((p) => p.id === subject.plugin);
      if (!def) return null;
      body = (
        <KeyScope value={subject.key} onChange={(key) => onSubjectChange({ ...subject, key })}>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <def.Component />
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
          onPick={(s) => onSubjectChange({ ...subject, key: { ...subject.key, tonicPc: s.tonicPc, mode: s.modeIndex } })}
        />
      );
      break;
    case "logo":
    case "url":
      body = <BrandWidget kind={subject.kind} />;
      break;
    case "key":
      body = (
        <KeyScope value={stageKey} onChange={onStageKey}>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-2">
            <KeyBar />
          </div>
        </KeyScope>
      );
      break;
  }
  return <FitBox width={WIDTH[subject.kind]}>{body}</FitBox>;
}
