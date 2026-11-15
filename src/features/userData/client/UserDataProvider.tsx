"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import type { PlanStore } from "@/features/plan/store/PlanStore";
import { PlanStoreProvider } from "@/features/plan/store/usePlan";
import { localPlanStore } from "@/features/plan/store/localPlanStore";
import { memoryPlanStore } from "@/features/plan/store/memoryPlanStore";
import { createServerPlanStore } from "@/features/plan/store/serverPlanStore";
import { memoryNoteStore, localNoteStore, type NoteStore } from "@/features/teachers/notes/model/noteStore";
import { createServerNoteStore } from "@/features/teachers/notes/model/serverNoteStore";
import { NoteStoreProvider } from "@/features/teachers/notes/useNoteStore";
import { useResumeUploads } from "@/features/videos/uploads";
import type { ProgressStore } from "@/features/progress/ProgressStore";
import { ProgressStoreProvider } from "@/features/progress/useProgress";
import { localProgressStore } from "@/features/progress/localProgressStore";
import { memoryProgressStore } from "@/features/progress/memoryProgressStore";
import { createServerProgressStore } from "@/features/progress/serverProgressStore";
import type { DataSource } from "./source";
import { useDataSource } from "./useDataSource";
import { setUserDocSource } from "./useUserDoc";

/** Every store a player's data goes through. A new kind of data is one field here and one line in each source below. */
interface UserStores {
  plan: PlanStore;
  progress: ProgressStore;
  note: NoteStore;
}

/** A read that never answers: until the source is known, pages stay in their loading state and read no store. */
const never = <T,>() => new Promise<T>(() => {});
const WAITING: UserStores = {
  plan: { load: never, save: async () => {} },
  progress: { list: never, put: async () => {}, remove: async () => {} },
  note: { load: never, save: async () => {} },
};

function storesFor(source: DataSource): UserStores {
  switch (source) {
    case "server":
      // new for each signed-in session: the plan store keeps the document it read, which must not outlive the account
      return { plan: createServerPlanStore(), progress: createServerProgressStore(), note: createServerNoteStore() };
    case "local":
      return { plan: localPlanStore, progress: localProgressStore, note: localNoteStore };
    case "memory":
      return { plan: memoryPlanStore(), progress: memoryProgressStore(), note: memoryNoteStore() };
  }
}

/**
 * Mounted once in the root layout: gives every page the stores for the current data source (`useDataSource`): the
 * server for a signed-in player, fresh memory for a visitor, localStorage without accounts. `source` overrides it (a
 * public page that must save nothing passes "memory").
 *
 * Until the source is ready the pages still render, so a public page is drawn on the server and shows at once, but the
 * stores are waiting ones whose reads never answer: `usePlan` and `useProgress` stay not `loaded` and read nothing
 * from the wrong store, then load from the real one when it arrives.
 *
 * The smaller documents (course notes, creator key, records, about me) are module-level (`userDoc`), so the provider
 * points them at the source once it is ready, and again when the source or the account changes. Only an unforced
 * provider does: a forced one would move them for the whole app.
 *
 * It also resumes the video upload queue (`useResumeUploads`, `features/videos/uploads.ts`) for a signed-in player, on every page.
 */
export default function UserDataProvider({ source: forced, children }: { source?: DataSource; children: ReactNode }) {
  const { source: picked, ready: pickedReady, accountId } = useDataSource();
  const source = forced ?? picked;
  const ready = forced !== undefined || pickedReady;
  const stores = useMemo(() => (ready ? storesFor(source) : WAITING), [ready, source]);
  useEffect(() => {
    if (forced === undefined && pickedReady) setUserDocSource(picked, accountId);
  }, [forced, pickedReady, picked, accountId]);
  // a signed-in player's takes still queued in this browser upload on every page load, one at a time
  useResumeUploads();
  return (
    <PlanStoreProvider store={stores.plan}>
      <ProgressStoreProvider store={stores.progress}>
        <NoteStoreProvider store={stores.note}>{children}</NoteStoreProvider>
      </ProgressStoreProvider>
    </PlanStoreProvider>
  );
}
