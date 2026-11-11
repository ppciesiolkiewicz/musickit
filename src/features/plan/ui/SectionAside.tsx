"use client";

import { createContext, type ReactNode } from "react";
import type { PlainCell } from "../model/tools";

/**
 * What a host page shows beside each section of an exercise (the dev examples page: review comments). `address` says which
 * exercise ("ex" alone, "d2.e1" in a week), `index` which of its cells, flattened (`cellsOf`). The plan page provides nothing.
 */
export type SectionAside = (at: { address: string; index: number; section: PlainCell }) => ReactNode;

export const SectionAsideContext = createContext<SectionAside | null>(null);
