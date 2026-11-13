"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Modal } from "@/components/ui";
import { devUi } from "@/features/devtools/gate";
import { parseBlock } from "@/features/plan/model/config";
import { editBlock, insertAt, pathOf, readable, selectionAfterRemove, withIds } from "@/features/plan/model/editBlock";
import type { Cell, PlanTool } from "@/features/plan/model/tools";
import type { Block } from "@/features/plan/model/types";
import { BlockEditor, type AddAt } from "@/features/plan/ui/editor";
import { hasBrowserAgentApi, useNoteAgentTools } from "@/features/plan/ui/useBlockAgentTools";
import { VideoPickContext, type Layer, type PaletteResult } from "@/features/stage";
import { VideoChooser, type ChooserTab } from "@/features/videos/VideoChooser";
import type { VideoRef } from "@/features/videos/ref";
import { familyControls, keyOfBlock } from "./NotesEditorHost";
import Palette from "../studio/Palette";
import SharePopover from "../studio/SharePopover";
import { EMPTY_NOTE, cellFromSubject, newCellId, noteFromHash } from "./model/note";
import { localNoteStore } from "./model/noteStore";
import NoteView, { NoteReader } from "./NoteReader";
import { BackToEditing, NOTE_COLUMN, useNoteViewMode } from "./NoteViewMode";
import { presetBlock, savePresetDraft } from "./presetNotes";

/** The notes creator's steps, over the page. Each names a control by its label. */
const NOTE_STEPS = [
  "Press Add a widget to put a scale, a chord box, a neck, a video or some text in the note.",
  "Drag a widget by its handle to move it.",
  "Press View as a note to see the page as your students will.",
];

const RECT = { x: 0, y: 0, w: 1, h: 1 };
const isTyping = () => {
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable);
};

/**
 * The notes creator: a note (one block) written on the block editor, kept in this browser (`localNoteStore`), or a preset opened
 * with `?edit=true` (kept in this tab only). A shared link (`#note=`) opens the note to read instead.
 */
export default function NotesApp({ preset }: { preset?: string }) {
  // the link's hash is known only in the browser: until then nothing is drawn
  const [link, setLink] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is read after hydration
    setLink(noteFromHash(window.location.hash));
  }, []);
  if (link === undefined) return null;
  return link ? <NoteView note={link} /> : <Creator preset={preset} />;
}

function Creator({ preset }: { preset?: string }) {
  const [block, setBlock] = useState<Block | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [palette, setPalette] = useState<AddAt | false>(false);
  const [json, setJson] = useState(false);
  const [share, setShare] = useState(false);
  const [videoPick, setVideoPick] = useState<{ tab: ChooserTab; onPick: (video: VideoRef) => void } | null>(null);
  const mode = useNoteViewMode();
  const [ownViewing, setOwnViewing] = useState(false);
  const viewing = mode ? mode.viewing : ownViewing;
  const setViewing = mode ? mode.setViewing : setOwnViewing;

  // load once: the preset as this tab left it, else the saved note, else an empty one
  useEffect(() => {
    let live = true;
    const start = (b: Block | null) => live && setBlock(withIds(b ?? EMPTY_NOTE, newCellId));
    if (preset) start(presetBlock(preset));
    else void localNoteStore.load().then(start);
    return () => {
      live = false;
    };
  }, [preset]);

  // every change is kept, a moment after the last one, and at once when the page is left
  const first = useRef(true);
  const pending = useRef<Block | null>(null);
  const save = useCallback((b: Block) => (preset ? savePresetDraft(preset, b) : void localNoteStore.save(b)), [preset]);
  useEffect(() => {
    if (!block) return;
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = block;
    const t = setTimeout(() => {
      pending.current = null;
      save(block);
    }, 300);
    return () => clearTimeout(t);
  }, [block, save]);
  useEffect(() => {
    const flush = () => {
      if (pending.current) save(pending.current);
      pending.current = null;
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [save]);

  // the page's header shows the note while viewing
  // (the setter alone: the context value is new on every change, and depending on it would loop)
  const reading = useMemo(() => (block ? readable(block) : null), [block]);
  const setNote = mode?.setNote;
  useEffect(() => setNote?.(reading), [setNote, reading]);

  // / or ⌘K opens the palette (never while typing, viewing or in a dialog)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (palette !== false || viewing || json || videoPick || isTyping()) return;
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setPalette(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette, viewing, json, videoPick, selected]);

  const change = useCallback((b: Block) => setBlock(withIds(b, newCellId)), []);
  // the browser AI's tools: it reads the note and writes a whole one (WebMCP; nothing without it)
  useNoteAgentTools(block, change);
  const [agent, setAgent] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's AI is known only after hydration
  useEffect(() => setAgent(hasBrowserAgentApi()), []);

  /** a new cell at `at` (after a cell, before one, at the start, or at the end); the palette, when open, adds the next one after it */
  const insert = useCallback((cell: Cell, at: AddAt, reopen: boolean) => {
    const id = newCellId();
    setBlock((b) => (b ? insertAt(b, at, { ...cell, id } as Cell) : b));
    setSelected(id);
    if (reopen) setPalette(id);
  }, []);
  /** where the palette adds: where it was opened for, else after the selected cell */
  const paletteAt: AddAt = palette === false ? selected : palette;

  const pickVideo = useCallback((onPick: (video: VideoRef) => void) => setVideoPick({ tab: "record", onPick }), []);
  const videoCell = (video: VideoRef): Cell | null => cellFromSubject({ kind: "video", video });

  const onPick = (r: PaletteResult) => {
    if (r.action.type === "add") {
      const cell = cellFromSubject(r.action.subject);
      if (cell) insert(cell, paletteAt, true);
    } else if (r.action.type === "command") {
      if (r.action.command === "section-add") insert({ type: "section", heading: "", cells: [] }, paletteAt, true);
      else if (r.action.command === "video-add" || r.action.command === "video-record") {
        // the place is taken now: the video comes back after the palette has closed, and the palette stays closed
        const at = paletteAt;
        setVideoPick({ tab: r.action.command === "video-add" ? "mine" : "record", onPick: (v) => { const c = videoCell(v); if (c) insert(c, at, false); } });
        setPalette(false);
      }
    }
  };

  // the palette lists the note's tool cells as its widgets, so a family row shows and edits them
  const layers = useMemo<Layer[]>(() => {
    if (!block) return [];
    const tools = block.cells.flatMap((c) => (c.type === "section" ? c.cells : [c])).flatMap((c) => (c.type === "tool" && c.id ? [{ id: c.id, tool: c.tool }] : []));
    return tools.map((t, z) => ({ id: t.id, subject: { kind: "tool", tool: t.tool }, rect: RECT, visible: true, z }));
  }, [block]);
  const updateTool = (id: string, tool: PlanTool) =>
    setBlock((b) => {
      const at = b && pathOf(b, id);
      if (!b || !at) return b;
      const cell = b.cells[at[0]];
      const own = at.length === 2 && cell.type === "section" ? cell.cells[at[1]] : cell;
      return own.type === "tool" ? editBlock(b, { type: "update", at, cell: { ...own, tool } }) : b;
    });
  const removeCell = (id: string) => {
    if (!block) return;
    const at = pathOf(block, id);
    if (!at) return;
    if (selected === id) setSelected(selectionAfterRemove(block, at));
    setBlock(editBlock(block, { type: "remove", at }));
  };


  if (!block) return null;
  // what a reader gets: the note without the boxes still empty (`reading`)
  const empty = !reading || (reading.cells.length === 0 && !block.title.trim());

  if (viewing) {
    return (
      <div className={NOTE_COLUMN}>
        {!mode && <BackToEditing onBack={() => setViewing(false)} />}
        {empty ? <p className="py-12 text-center text-slate-400">This note is empty.</p> : <NoteReader block={reading!} body={!!mode} footer={false} />}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside data-chrome aria-label="Note" className="flex flex-col gap-2 self-start md:sticky md:top-4">
        <SharePopover open={share} onClose={() => setShare(false)} onView={() => setViewing(true)}>
          <button type="button" disabled={empty} onClick={() => setShare((s) => !s)} aria-expanded={share} className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40">
            <Icon name="share-2" size={12} />
            Share as a note
          </button>
        </SharePopover>
        <button type="button" onClick={() => setViewing(true)} className="flex items-center gap-2 rounded-md border border-slate-800 px-2 py-1 text-left text-xs text-slate-300 hover:border-slate-600">
          <Icon name="eye" size={12} />
          View as a note
        </button>
        {devUi() && (
          <button type="button" onClick={() => setJson(true)} title="The whole note as JSON, to read, change and apply in one go. Development only." className="flex items-center gap-2 rounded-md border border-slate-800 px-2 py-1 text-left text-xs text-slate-300 hover:border-slate-600">
            <Icon name="pencil" size={12} />
            Edit as JSON (dev)
          </button>
        )}
        <button type="button" onClick={() => setPalette(selected)} className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500">
          Add a widget
          <span className="rounded border border-slate-700 px-1.5 font-mono text-[10px] text-slate-400">/ or ⌘K</span>
        </button>
      </aside>

      <main className="flex min-w-0 flex-col gap-4">
        {agent && <AgentLine />}
        <ol className="grid gap-x-6 gap-y-1 text-sm text-slate-400 sm:grid-cols-3">
          {NOTE_STEPS.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-200">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:p-6">
          <VideoPickContext.Provider value={pickVideo}>
            <BlockEditor block={block} onChange={change} selected={selected} onSelect={setSelected} onAdd={(at) => setPalette(at)} toolControls={familyControls} />
          </VideoPickContext.Provider>
          {block.cells.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-slate-400">Nothing in this note yet.</p>
              <button type="button" onClick={() => setPalette(null)} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add a widget</button>
            </div>
          )}
        </div>
      </main>

      {palette !== false && (
        <Palette notes pluginIds={[]} stageKey={keyOfBlock(block)} media={{ camera: "none", screen: "none" }} layers={layers} onPick={onPick} onUpdate={(id, s) => s.kind === "tool" && updateTool(id, s.tool)} onRemove={removeCell} onClose={() => setPalette(false)} />
      )}
      {videoPick && (
        <Modal title="Add a video" medium onClose={() => setVideoPick(null)}>
          <VideoChooser start={videoPick.tab} addTo="the note" onPick={(v) => { videoPick.onPick(v); setVideoPick(null); }} />
        </Modal>
      )}
      {json && <NoteJson block={block} onApply={(b) => { change(b); setJson(false); }} onClose={() => setJson(false)} />}
    </div>
  );
}


/** The whole note as JSON (development only): edit it and Apply; what the parser left out or changed is listed. */
function NoteJson({ block, onApply, onClose }: { block: Block; onApply: (b: Block) => void; onClose: () => void }) {
  const [text, setText] = useState(() => JSON.stringify(block, null, 2));
  const [said, setSaid] = useState<string[]>([]);
  const apply = () => {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      setSaid(["This isn't JSON yet. Check the brackets and quotes."]);
      return;
    }
    const p = parseBlock(raw, { draft: true });
    if (p.warnings.length) setSaid(p.warnings);
    onApply(p.block);
  };
  return (
    <Modal title="Edit as JSON" large onClose={onClose}>
      <div className="flex flex-col gap-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="The note as JSON" rows={24} className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none focus:border-sky-500" />
        {said.map((s) => <p key={s} className="text-xs text-amber-300">{s}</p>)}
        <button type="button" onClick={apply} className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Apply</button>
      </div>
    </Modal>
  );
}

/** The line to paste into the browser's AI extension, with Copy: shown only when the browser has one. */
const AGENT_LINE = "Read the authoring guide, then write a note about what I teach next and send it with write_block.";
function AgentLine() {
  const [copied, setCopied] = useState(false);
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
      <span>Ask your AI extension: “{AGENT_LINE}”</span>
      <button type="button" onClick={() => void navigator.clipboard?.writeText(AGENT_LINE).then(() => setCopied(true))} className="rounded-md border border-violet-400/50 px-2 py-0.5 text-xs hover:border-violet-300">
        {copied ? "Copied" : "Copy"}
      </button>
    </p>
  );
}
