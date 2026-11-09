"use client";

import { Select } from "@/components/ui";
import type { JamRig } from "../../jam/rig";
import { GROOVES, type GrooveId } from "../../sequencer/grooves";

/** The drums' and bass's groove, picked by name. "Custom" (not pickable) once a step or pattern changed it. */
export default function GrooveSelect({ rig, value }: { rig: JamRig; value: GrooveId | null }) {
  return (
    <Select size="sm" className="w-44" value={value ?? ""} onChange={(id) => id && rig.setGroove(id as GrooveId)} aria-label="Groove"
      options={[...(value === null ? [{ value: "", label: "Custom", disabled: true }] : []), ...GROOVES.map((g) => ({ value: g.id, label: g.name }))]} />
  );
}
