"use client";

import type { ReactNode } from "react";
import { ChipRow } from "@/components/ui";
import { LabelSelect } from "@/features/theory/useLabelSystem";

const INFO = "How notes are labelled: note names, intervals from the root (R, b3, p5), scale degrees, or each note's job in the chord. One setting for the whole app; dot colours stay the same either way.";

/** The "Labels" control row for a page's settings panel. Extra chips (badges, overlays) go in as children. */
export function LabelsRow({ info, children }: { info?: ReactNode; children?: ReactNode }) {
  return (
    <ChipRow label="Labels" info={info ?? INFO}>
      <LabelSelect showLabel={false} />
      {children}
    </ChipRow>
  );
}
