"use client";

import { useMemo } from "react";
import { VoicePicker } from "@/features/exercises/basics/voiceChoice";
import { LiveGivenPlan } from "./GivenPlan";
import { localDate } from "./model/schedule";
import { EMPTY_STATE, type PlanConfig, type PlanState } from "./model/types";
import { PhoneLabels } from "./ui/planPieces";
import { memoryPlanStore } from "./store/memoryPlanStore";
import { PlanStoreProvider } from "./store/usePlan";
import { memoryProgressStore } from "@/features/progress/memoryProgressStore";
import { ProgressStoreProvider } from "@/features/progress/useProgress";

/**
 * A ready-made week from day 1, drawn as a given plan (the plan page itself only draws a composed day), kept in memory only, its ratings too: a visitor's or a signed-in
 * player's own plan and progress are never read or overwritten, and a reload starts the demo again. A plan that sings opens with the Your voice picker, so a visitor of any voice can sing along.
 */
const DEMO_ID = "demo";

export default function DemoPlan({ config }: { config: PlanConfig }) {
  const today = useMemo(() => localDate(), []);
  const store = useMemo(() => {
    const start: PlanState = { ...EMPTY_STATE, given: [{ id: DEMO_ID, config, startedOn: today, done: {} }] };
    return memoryPlanStore(start);
  }, [config, today]);
  const progress = useMemo(() => memoryProgressStore(), []);
  return (
    <VoicePicker data={config}>
      <PlanStoreProvider store={store}>
        <ProgressStoreProvider store={progress}>
          <LiveGivenPlan id={DEMO_ID} date={today} controls={() => <PhoneLabels />} />
        </ProgressStoreProvider>
      </PlanStoreProvider>
    </VoicePicker>
  );
}
