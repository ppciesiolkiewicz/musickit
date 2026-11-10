"use client";

import { useEffect, useState } from "react";
import { PLUGINS } from "@/features/creator";
import { NoteArticle, StageWidget, type Stage } from "@/features/stage";
import { decodeNote } from "./notes";

const PLUGIN_IDS = PLUGINS.map((p) => p.id);

/** A note's stage read as an article, never editable, with a way into the notes creator. */
export function NoteReader({ stage }: { stage: Stage | null }) {
  return (
    <div className="flex flex-col gap-12 pt-2 sm:pt-4">
      {stage ? (
        <NoteArticle
          stage={stage}
          renderLayer={(l, readOnly) => <StageWidget subject={l.subject} onSubjectChange={() => {}} stageKey={stage.key} onStageKey={() => {}} readOnly={readOnly} />}
        />
      ) : (
        <p className="text-center text-slate-400">This note link could not be opened.</p>
      )}
      <p className="border-t border-slate-800/70 pt-6 text-center text-sm text-slate-500">
        <a href="/teachers/studio?notes=1" className="text-sky-300 hover:text-sky-200">Make your own note</a>
      </p>
    </div>
  );
}

/** A shared note, opened from its link: read as an article, never editable, and it leaves the notes creator's own saved stage alone. */
export default function NoteView({ note }: { note: string }) {
  const [stage, setStage] = useState<Stage | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void decodeNote(note, PLUGIN_IDS).then((s) => live && setStage(s));
    return () => {
      live = false;
    };
  }, [note]);

  if (stage === undefined) return null;
  return <NoteReader stage={stage} />;
}
