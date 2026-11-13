"use client";

import { useSyncExternalStore } from "react";
import { SETTINGS_PLACE_KEY, readSettingsPlace, type SettingsPlace } from "./boot";

export function getSettingsPlace(): SettingsPlace {
  return readSettingsPlace(document.documentElement.dataset.settings ?? null);
}

export function setSettingsPlace(place: SettingsPlace) {
  if (place === "top") document.documentElement.dataset.settings = "top";
  else delete document.documentElement.dataset.settings;
  try {
    localStorage.setItem(SETTINGS_PLACE_KEY, place);
  } catch { /* storage blocked: the choice lasts until the page reloads */ }
}

const subscribe = (onChange: () => void) => {
  const watch = new MutationObserver(onChange);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-settings"] });
  return () => watch.disconnect();
};

/** Where the settings sit now, for layout CSS can't do; "side" on the server and in the first render. */
export function useSettingsPlace(): SettingsPlace {
  return useSyncExternalStore(subscribe, getSettingsPlace, () => "side");
}
