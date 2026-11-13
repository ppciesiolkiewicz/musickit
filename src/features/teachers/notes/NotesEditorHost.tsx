"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import { EMPTY_KEY, keyChoiceFor } from "@/features/creator/model/key";
import type { Cell, PlanTool } from "@/features/plan/model/tools";
import type { Block } from "@/features/plan/model/types";
import { EditorHostProvider, type EditorHost } from "@/features/plan/ui/editor";
import { familyOf, type PaletteResult, type Subject } from "@/features/stage";
import { VideoChooser } from "@/features/videos/VideoChooser";
import { FamilyEditor } from "../studio/FamilyStep";
import Palette from "../studio/Palette";
import { cellFromSubject } from "./model/note";

/** A tool cell's Settings: its palette family's controls, or none when the family has no options (or the tool no family). */
export function familyControls(tool: PlanTool, onChange: (tool: PlanTool) => void): ReactNode | null {
  const subject: Subject = { kind: "tool", tool };
  return familyOf(subject)?.controls.length ? <FamilyEditor key={JSON.stringify(tool)} subject={subject} onUpdate={(s) => s.kind === "tool" && onChange(s.tool)} /> : null;
}

/** The key a block's widgets are made in: its own key and scale, else no key (the families then use C). */
export function keyOfBlock(block: Block) {
  const open = block.choice && "open" in block.choice ? block.choice.open : null;
  return open?.key === undefined ? EMPTY_KEY : keyChoiceFor(open.key, open.scale ?? "major-ionian");
}

/** The studio's palette in notes mode as a cell picker: widgets, a Section, and the Video commands (through Add a video). */
function CellPicker({ block, onCell, onClose }: { block: Block; onCell: (cell: Cell) => void; onClose: () => void }) {
  const [video, setVideo] = useState<"mine" | "record" | null>(null);
  const onPick = (r: PaletteResult) => {
    if (r.action.type === "add") {
      const cell = cellFromSubject(r.action.subject);
      if (cell) onCell(cell);
    } else if (r.action.type === "command") {
      if (r.action.command === "section-add") onCell({ type: "section", heading: "", cells: [] });
      else if (r.action.command === "video-add" || r.action.command === "video-record") setVideo(r.action.command === "video-add" ? "mine" : "record");
    }
  };
  if (video) {
    return (
      <Modal title="Add a video" medium onClose={onClose}>
        <VideoChooser start={video} addTo="the exercise" onPick={(v) => { const c = cellFromSubject({ kind: "video", video: v }); if (c) onCell(c); onClose(); }} />
      </Modal>
    );
  }
  return <Palette notes pluginIds={[]} stageKey={keyOfBlock(block)} media={{ camera: "none", screen: "none" }} layers={[]} onPick={onPick} onUpdate={() => {}} onRemove={() => {}} onClose={onClose} />;
}

/** Block editors under this get the studio's family controls and palette (the plan's day editor, on `/plan`). */
export default function NotesEditorHost({ children }: { children: ReactNode }) {
  const host = useMemo<EditorHost>(() => ({ toolControls: familyControls, picker: (p) => <CellPicker {...p} /> }), []);
  return <EditorHostProvider host={host}>{children}</EditorHostProvider>;
}
