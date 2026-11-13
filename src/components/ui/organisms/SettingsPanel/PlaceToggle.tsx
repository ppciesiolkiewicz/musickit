"use client";

import Icon from "@/components/Icon";
import { getSettingsPlace, setSettingsPlace } from "./place";

/** In a side panel's header on wide screens: moves every page's settings above the page, or back to the side. */
export function PlaceToggle() {
  const flip = () => setSettingsPlace(getSettingsPlace() === "top" ? "side" : "top");
  return (
    <button type="button" tabIndex={-1} onClick={flip}
      className="hidden h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-600 bg-slate-800 text-slate-100 transition hover:border-sky-400 hover:text-sky-200 lg:grid">
      {/* both render; CSS shows the one for where the settings are, so the server and the browser agree. Each shows where it moves them */}
      <span className="hidden h-full w-full place-items-center side:grid" title="Move above: show the settings above the page, at the normal page width">
        <Icon name="panel-top" size={15} /><span className="sr-only">Move above</span>
      </span>
      <span className="grid h-full w-full place-items-center side:hidden" title="Move to side: show the settings in a column on the right">
        <Icon name="panel-right" size={15} /><span className="sr-only">Move to side</span>
      </span>
    </button>
  );
}
