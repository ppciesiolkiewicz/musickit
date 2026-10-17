import { DEFAULT_KEY_PC, TONICS } from "./theory";

/**
 * Keys in URLs as readable note names: `e`, `f-sharp`, `b-flat`. Each key has one canonical slug, spelled the way the
 * app spells the key (D♭, not C♯); `parseKeySlug` also reads the other spellings and the old numeric `?key=4` links.
 */
const LETTER_PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

export const keySlug = (pc: number): string => {
  const t = TONICS[((pc % 12) + 12) % 12];
  return t.name[0].toLowerCase() + (t.name.includes("♯") ? "-sharp" : t.name.includes("♭") ? "-flat" : "");
};

/** Pitch class from a key in a URL: `c-sharp`, `C-Sharp`, `c#`, `db`, `d♭`, `dflat`, or a bare 0–11. Null if unreadable. */
export function parseKeySlug(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s: string;
  try {
    s = decodeURIComponent(String(raw)).trim().toLowerCase();
  } catch {
    return null;
  }
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n < 12 ? n : null;
  }
  const m = /^([a-g])[-_ ]?(sharp|flat|#|♯|♭|b|s)?$/.exec(s);
  if (!m) return null;
  const shift = !m[2] ? 0 : ["sharp", "#", "♯", "s"].includes(m[2]) ? 1 : -1;
  return (LETTER_PC[m[1]] + shift + 12) % 12;
}

/** `parseKeySlug`, falling back to the default key. */
export const keyOr = (raw: string | null | undefined, fallback = DEFAULT_KEY_PC): number => parseKeySlug(raw) ?? fallback;

/** The key as the app spells it, for titles: F♯, B♭. */
export const keyName = (pc: number): string => TONICS[((pc % 12) + 12) % 12].name;

/** A mode page in a key: /theory/scales/dorian/f-sharp */
export const scaleHref = (slug: string, pc: number, hash = ""): string => `/theory/scales/${slug}/${keySlug(pc)}${hash}`;

/** The list of all modes in a key: /theory/scales?key=f-sharp */
export const scalesIndexHref = (pc: number, hash = ""): string => `/theory/scales?key=${keySlug(pc)}${hash}`;
