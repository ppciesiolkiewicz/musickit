"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { registerCoverage, type CoverageEntry } from "./coverage";
import type { Level } from "./levels";
import { PageIdContext } from "./pageContext";

type Scope = Pick<CoverageEntry, "kind" | "id">;
type Part = { levels?: Level[]; tourSteps?: number; hints?: number };

/** Chosen once per build: a production build gets the no-ops, so hook order is fixed and the bundler can drop the rest. */
const PRODUCTION = process.env.NODE_ENV === "production";

const ToolScopeContext = createContext<string | undefined>(undefined);

function CoverageToolDev({ type, children }: { type: string; children: ReactNode }) {
  return <ToolScopeContext.Provider value={type}>{children}</ToolScopeContext.Provider>;
}

function Passthrough({ children }: { type: string; children: ReactNode }) {
  return <>{children}</>;
}

/** Marks an exercise tool's subtree, so the levels and hints drawn inside it count for the tool, not the page. */
export const CoverageTool = PRODUCTION ? Passthrough : CoverageToolDev;

function useCoverageDev(part: Part, scope?: Scope): void {
  const tool = useContext(ToolScopeContext);
  const page = useContext(PageIdContext);
  const at: Scope | undefined = scope ?? (tool ? { kind: "tool", id: tool } : page ? { kind: "page", id: page } : undefined);
  const kind = at?.kind;
  const id = at?.id;
  const levels = (part.levels ?? []).join(",");
  const tourSteps = part.tourSteps ?? 0;
  const hints = part.hints ?? 0;
  useEffect(() => {
    if (!kind || !id) return;
    registerCoverage({ kind, id, levels: levels ? (levels.split(",") as Level[]) : [], tourSteps, hints });
  }, [kind, id, levels, tourSteps, hints]);
}

function noop(_part: Part, _scope?: Scope): void {
  void _part;
  void _scope;
}

/**
 * Registers, in development, what this component adds to the page or tool it sits in (the nearest `CoverageTool`, else
 * the `GuideProvider` page): a tagged level, a tour's length, its number of `Hint`s. Outside both it does nothing.
 * `scope` names the page or tool outright (PageHelp, the tool wrapper). In a production build it does nothing at all.
 */
export const useCoverage: (part: Part, scope?: Scope) => void = PRODUCTION ? noop : useCoverageDev;
