import { TONICS } from "@/features/theory/theory";

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii"];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

const pcName = (pc: number) => TONICS[((pc % 12) + 12) % 12].name.replace("♭", "b").replace("♯", "#");

/**
 * A Roman numeral in a major key as a chord name: upper case major, lower case minor, `°` (or `o`) diminished,
 * a leading `b`/`#` shifts the root, a trailing 7 adds a seventh (`V7` -> G7 in C, `ii7` -> Dm7). Null when unreadable.
 */
export function numeralChord(numeral: string, keyPc: number): string | null {
  const m = /^([b#♭♯]?)(i{1,3}|iv|vi{0,2}|I{1,3}|IV|VI{0,2})(°|o|dim)?(maj7|7)?$/.exec(String(numeral).trim());
  if (!m) return null;
  const deg = ROMAN.indexOf(m[2].toLowerCase());
  if (deg < 0) return null;
  const shift = m[1] === "b" || m[1] === "♭" ? -1 : m[1] ? 1 : 0;
  const root = pcName(keyPc + MAJOR[deg] + shift);
  const minor = m[2] === m[2].toLowerCase();
  if (m[3]) return root + (m[4] === "7" ? "m7b5" : "dim");
  return root + (minor ? "m" : "") + (m[4] ?? "");
}
