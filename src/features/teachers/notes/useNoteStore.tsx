"use client";

import { createContext, useContext, type ReactNode } from "react";
import { localNoteStore, type NoteStore } from "./model/noteStore";

const StoreContext = createContext<NoteStore>(localNoteStore);

/** Swap the note store for a subtree: `UserDataProvider` picks it for the data source. Without one the note lives in localStorage. */
export function NoteStoreProvider({ store, children }: { store: NoteStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export const useNoteStore = (): NoteStore => useContext(StoreContext);
