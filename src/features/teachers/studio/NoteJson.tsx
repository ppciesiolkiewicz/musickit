"use client";

import { useEffect, useState } from "react";
import type { Stage } from "@/features/stage";
import { noteText, readNoteText } from "./notes";

/**
 * The note as JSON in one text box (**Edit as JSON**): its key and its widgets in page order. Made for a program driving the page
 * (a browser assistant), which reads and writes one field instead of dragging, and handy for copying a note between pages.
 * **Apply** replaces the whole note with what the text says; a widget that cannot be read is left out, and named.
 */
export default function NoteJson({ stage, pluginIds, onApply, onClose }: { stage: Stage; pluginIds: string[]; onApply: (stage: Stage) => void; onClose: () => void }) {
  const [text, setText] = useState(() => noteText(stage));
  const [said, setSaid] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const apply = () => {
    const r = readNoteText(text, pluginIds);
    if ("error" in r) return setSaid({ tone: "error", text: r.error });
    onApply(r.stage);
    if (r.left.length === 0) return onClose();
    setText(noteText(r.stage));
    setSaid({ tone: "error", text: `Applied with ${r.stage.layers.length} widgets. Left out, as they could not be read: widget ${r.left.join(", widget ")}.` });
  };

  return (
    <div data-chrome className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal aria-label="The note as JSON" className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-slate-50">The note as JSON</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          The key and the widgets, top to bottom. Change, reorder, add or delete entries, then press Apply: the note becomes what this text says. A text block is{" "}
          <code className="text-slate-300">{'{ "kind": "text", "text": "# Title\\n\\n## Heading\\n\\nA paragraph." }'}</code>. For any other widget, add it with Add a widget first and copy its entry from here.
        </p>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setSaid(null); }}
          aria-label="Note JSON"
          spellCheck={false}
          className="min-h-64 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-sky-500"
        />
        <p role="status" className={`min-h-5 text-sm ${said?.tone === "error" ? "text-rose-300" : "text-slate-400"}`}>{said?.text}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">Cancel</button>
          <button type="button" onClick={apply} className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500">Apply</button>
        </div>
      </div>
    </div>
  );
}
