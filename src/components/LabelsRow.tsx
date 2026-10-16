"use client";

import type { ReactNode } from "react";
import { ChipRow } from "@/components/ui";
import { LabelSelect, RootSelect } from "@/features/theory/useLabelSystem";
import type { LabelSystem } from "@/features/theory/labels";

const INFO = "How notes are labelled: note names, intervals from the root (R, b3, p5), scale degrees, or each note's job in the chord. One setting for the whole app. Count from picks what R means in a key: the scale's root, or each chord's own root; intervals, degrees and dot colours all follow it, so R is always white.";

/** The "Labels" control row for a page's settings panel. Extra chips (badges, overlays) go in as children. */
export function LabelsRow({ info, children, omit }: { info?: ReactNode; children?: ReactNode; omit?: LabelSystem[] }) {
  return (
    <ChipRow label="Labels" info={info ?? INFO}>
      <LabelSelect showLabel={false} omit={omit} />
      <RootSelect />
      {children}
    </ChipRow>
  );
}
