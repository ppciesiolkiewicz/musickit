"use client";

import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import { Dropdown } from "@/components/ui";
import type { LabelSystem } from "@/features/theory/labels";
import { AccuracyRow, LabelsRow, MelodyViewRow, Volume } from "./rows";

/**
 * A tool's settings where there is no settings panel (a tool in the plan): the volume inline, then behind the sliders
 * button the app-wide rows in their "menu" look (accuracy, note labels, how a melody is drawn), then the tool's own
 * sections (`more`). On a page with a `SettingsPanel` the tool draws none of this (its `hostSettings`) and the page puts
 * the same rows in the panel. `labels` is the system the tool shows, to light its tile; leave it out for a tool with no
 * note labels.
 */
export default function ToolSettings({ labels, omit = [], accuracy = false, view = false, more, volume = true }: { labels?: LabelSystem; /** label systems this tool cannot show, left out of the picker */ omit?: LabelSystem[]; accuracy?: boolean; view?: boolean; more?: ReactNode; /** false when the host shows <Volume /> elsewhere */ volume?: boolean }) {
  if (!accuracy && !labels && !view && !more) return volume ? <Volume /> : null;
  return (
    <span className="inline-flex items-center gap-3">
      {volume && <Volume />}
      {volume && <span aria-hidden className="h-5 w-px bg-slate-700" />}
      <Dropdown label="Sound and view settings" button={<Icon name="sliders-horizontal" size={15} />}>
        {accuracy && <AccuracyRow look="menu" />}
        {labels && <LabelsRow look="menu" shown={labels} omit={omit} />}
        {view && <MelodyViewRow look="menu" />}
        {more}
      </Dropdown>
    </span>
  );
}
