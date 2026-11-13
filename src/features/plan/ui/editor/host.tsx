"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Cell, PlanTool } from "../../model/tools";
import type { Block } from "../../model/types";

/**
 * What a page gives the block editor that the plan feature does not own: a tool's few controls (a palette family's) and a widget
 * picker. The stage imports the plan's UI, so the plan never imports the studio; a page wraps its editors in `EditorHostProvider`
 * with the studio's (`@/features/teachers/notes` `NotesEditorHost`).
 */
export interface EditorHost {
  toolControls?: (tool: PlanTool, onChange: (tool: PlanTool) => void) => ReactNode | null;
  /** a picker over the page: each cell picked goes to `onCell`, in the block's key; `onClose` when it is closed */
  picker?: (p: { block: Block; onCell: (cell: Cell) => void; onClose: () => void }) => ReactNode;
}

const Ctx = createContext<EditorHost>({});

export function EditorHostProvider({ host, children }: { host: EditorHost; children: ReactNode }) {
  return <Ctx.Provider value={host}>{children}</Ctx.Provider>;
}

export const useEditorHost = (): EditorHost => useContext(Ctx);
