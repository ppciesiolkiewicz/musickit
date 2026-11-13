/**
 * Where a page's settings sit on wide screens: in a column on the right ("side", the default) or above the page ("top").
 * One choice for the whole app, kept in localStorage and mirrored on <html> as `data-settings="top"`, so CSS (the `side`
 * variant in globals.css) lays the page out before it paints.
 */
export type SettingsPlace = "side" | "top";

export const SETTINGS_PLACE_KEY = "musickit.settingsPlace";

/** Run in <head> before paint: puts the saved place on <html>. */
export const SETTINGS_BOOT = `try{if(localStorage.getItem("${SETTINGS_PLACE_KEY}")==="top")document.documentElement.dataset.settings="top"}catch(e){}`;
