"use client";

import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import type { Streak } from "../../model/outcome";

/** "3 days in a row": the streak as a plain count of days; with none, the name of the tracker it opens. */
export const streakWords = (days: number): string => (days === 0 ? "Your progress" : `${days} ${days === 1 ? "day" : "days"} in a row`);

/** The day streak, said plainly; pressing it opens the progress tracker. */
export default function StreakButton({ streak, onOpen }: { streak: Streak; onOpen: () => void }) {
  return (
    <Button size="sm" onClick={onOpen} title="Days in a row you rated an exercise or practiced for 5 minutes. Press to see your progress." className="!rounded-full">
      <Icon name="activity" size={12} />
      {streakWords(streak.days)}
    </Button>
  );
}
