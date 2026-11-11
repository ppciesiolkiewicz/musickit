"use client";

import { useMemo } from "react";
import { VoicePicker } from "@/features/exercises/basics/voiceChoice";
import PlanApp from "./PlanApp";
import { localDate } from "./model/schedule";
import { EMPTY_STATE, type PlanConfig, type PlanState } from "./model/types";
import type { PlanStore } from "./store/PlanStore";
import { PlanStoreProvider } from "./store/usePlan";

/**
 * The plan page running a ready-made plan from day 1, kept in memory only: a visitor's own plan in this browser is never read or
 * overwritten, and a reload starts the demo again. A plan that sings opens with the Your voice picker, so a visitor of any voice can sing along.
 */
export default function DemoPlan({ config }: { config: PlanConfig }) {
  const store = useMemo<PlanStore>(() => {
    const held: { state: PlanState } = { state: { ...EMPTY_STATE, current: { id: "demo", config, startedOn: localDate(), done: {} } } };
    return {
      load: async () => held.state,
      save: async (s) => {
        held.state = s;
      },
    };
  }, [config]);
  return (
    <VoicePicker data={config}>
      <PlanStoreProvider store={store}>
        <PlanApp />
      </PlanStoreProvider>
    </VoicePicker>
  );
}
