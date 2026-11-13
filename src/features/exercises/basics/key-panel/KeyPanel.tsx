"use client";

import { useState, type ReactNode } from "react";
import { KeyScope, keyChoiceFor, type KeyChoice } from "@/features/creator";

/**
 * A theory panel in the key a tool names (`pc`, a scale slug). The panel may change the key from inside (a mode picked in
 * Same notes, a key tapped on the circle): that holds for this view only and never writes the tool. A new `pc` or `scale`
 * from the tool (the selector, the stage's key) starts it over.
 */
export function useToolKey(pc: number, scale: string): [KeyChoice, (k: KeyChoice) => void] {
  const [own, setOwn] = useState<{ from: string; key: KeyChoice } | null>(null);
  const from = `${pc}:${scale}`;
  const key = own?.from === from ? own.key : keyChoiceFor(pc, scale);
  return [key, (k) => setOwn({ from, key: k })];
}

/** A creator plugin (it reads `useCreatorKey`) drawn in the tool's key. */
export default function KeyPanel({ pc, scale, children }: { pc: number; scale: string; children: ReactNode }) {
  const [key, setKey] = useToolKey(pc, scale);
  return <KeyScope value={key} onChange={setKey}>{children}</KeyScope>;
}
