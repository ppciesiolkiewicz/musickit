"use client";

import { useMemo } from "react";
import { VoicePicker } from "@/features/exercises/basics/voiceChoice";
import PlanApp from "./PlanApp";
import { localDate } from "./model/schedule";
import { EMPTY_STATE, type PlanConfig, type PlanState } from "./model/types";
import { memoryPlanStore } from "./store/memoryPlanStore";
import { PlanStoreProvider } from "./store/usePlan";
import { memoryProgressStore } from "@/features/progress/memoryProgressStore";
import { ProgressStoreProvider } from "@/features/progress/useProgress";

/**
 * The plan page running a ready-made plan from day 1, kept in memory only, its ratings too: a visitor's or a signed-in
 * player's own plan and progress are never read or overwritten, and a reload starts the demo again. A plan that sings opens with the Your voice picker, so a visitor of any voice can sing along.
 */
export default function DemoPlan({ config }: { config: PlanConfig }) {
  const store = useMemo(() => {
    const start: PlanState = { ...EMPTY_STATE, current: { id: "demo", config, startedOn: localDate(), done: {} } };
    return memoryPlanStore(start);
  }, [config]);
  const progress = useMemo(() => memoryProgressStore(), []);
  return (
    <VoicePicker data={config}>
      <PlanStoreProvider store={store}>
        <ProgressStoreProvider store={progress}>
          <PlanApp />
        </ProgressStoreProvider>
      </PlanStoreProvider>
    </VoicePicker>
  );
}
