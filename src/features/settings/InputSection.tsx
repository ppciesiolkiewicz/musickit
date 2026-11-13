"use client";

import { useEffect, useState } from "react";
import InputChip from "@/components/InputChip";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { PocketLine } from "@/features/instruments";
import { useSetHeard } from "./HeardNoteProvider";

/**
 * The Input line of a settings panel: the input chip as the mic button (off on every visit, so the mic opens only on a
 * click). While on, the steady note it hears goes to `HeardNoteProvider`, which lights it on every neck inside. A line of
 * `PocketSection` (its `lines`), or on its own under a rule (`<div className="panel-rule pt-5">`).
 */
export function InputSection() {
  const [on, setOn] = useState(false);
  const { status, heard } = useMicPitch(on);
  const setHeard = useSetHeard();
  const note = on ? heard : null;
  useEffect(() => {
    setHeard?.(note);
  }, [setHeard, note]);
  useEffect(() => () => setHeard?.(null), [setHeard]);
  return (
    <PocketLine label="Input">
      <InputChip status={status} mic={{ on, onToggle: () => setOn((v) => !v) }} align="right" className="min-w-0" />
    </PocketLine>
  );
}
