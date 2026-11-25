"use client";

import { useState } from "react";
import SetupForm from "@/features/account/ui/SetupForm";
import type { Audience } from "@/features/account/ui/planPitch";
import { DEFAULT_TIME, type ReminderSettings } from "../model";
import { ReminderSetupBox, zoneHere } from "./ReminderSetupBox";

/**
 * /account/setup with the daily reminder among its boxes: on at 18:00 until they change it, saved with the account
 * (`reminder` in the setup body) in this browser's time zone, read when Continue is pressed.
 */
export default function SetupWithReminder({ next, start }: { next: string; start?: Audience | null }) {
  const [reminder, setReminder] = useState<ReminderSettings>({ enabled: true, time: DEFAULT_TIME, zone: "" });
  return (
    <SetupForm
      next={next}
      start={start}
      boxes={<ReminderSetupBox value={reminder} onChange={setReminder} />}
      extra={() => ({ reminder: { ...reminder, zone: zoneHere() } })}
    />
  );
}
