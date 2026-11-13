"use client";

import { createContext, type ReactNode } from "react";
import type { PlainCell } from "../../model/tools";

/**
 * What a host page shows beside each cell of a block the reader draws (the dev examples page: review comments). `address`
 * says which block ("ex" alone, "d2.e1" in a week), `index` which of its cells, flattened (`cellsOf`). With an aside the
 * reader frames its tools and names their type (the review view). The plan page and a note provide nothing.
 */
export type CellAside = (at: { address: string; index: number; section: PlainCell }) => ReactNode;

export const CellAsideContext = createContext<CellAside | null>(null);
