"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { HeardNote } from "@/components/chordKit/heardNote";

/** Where `InputSection` hands the note it hears; none outside a `HeardNoteProvider`. */
const SetHeard = createContext<((pc: number | null) => void) | null>(null);

/** The setter `InputSection` reports to, or null outside a provider. */
export const useSetHeard = () => useContext(SetHeard);

/** Around a page whose settings have an `InputSection`: the note it hears lights on every neck inside (`HeardNote`). */
export function HeardNoteProvider({ children }: { children: ReactNode }) {
  const [heard, setHeard] = useState<number | null>(null);
  return (
    <SetHeard.Provider value={setHeard}>
      <HeardNote.Provider value={heard}>{children}</HeardNote.Provider>
    </SetHeard.Provider>
  );
}
