/**
 * Choice sources: lists a parameter can pick from (the NAM amp models). The app registers a source under a name and a
 * ParamDef with `choice: name` shows a picker. The value stored in the effect is the numeric id of the option, 0 = none.
 * The looper does not know where the options come from. Imports nothing.
 */

export interface ChoiceOption {
  id: number;
  name: string;
  /** set when the option was copied from the online library (its path there) */
  cloudPath?: string;
}

/** One file in the online library. Files in the same `group` (folder) are variants of one setup. */
export interface CloudItem {
  path: string;
  group: string | null;
  variant: string;
  size: number;
}

/** An optional private online library next to the local options (the app supplies it; the looper only draws it). */
export interface CloudSource {
  getPassword(): string;
  setPassword(v: string): void;
  list(): Promise<{ models: CloudItem[] } | { error: string }>;
  /** Bring one model into the local options; resolves to the option id, or an error. */
  use(m: CloudItem): Promise<{ id: number } | { error: string }>;
  upload(files: File[]): Promise<string | null>;
  remove(m: CloudItem): Promise<string | null>;
}

export interface ChoiceSource {
  cloud?: CloudSource;
  options(): ChoiceOption[];
  subscribe(fn: () => void): () => void;
  /** Add files (a drop or the file input); resolves to an error message, or null when all went well. */
  addFiles?(files: File[]): Promise<string | null>;
  /** File extensions the source accepts, for the file input, e.g. ".nam". */
  accept?: string;
  /** A short line about one option (architecture, speed, warnings). */
  describe?(id: number): { text: string; warn?: boolean } | null;
  /** Find an option by the words of its name (fetching it when it has to come from the online library). Resolves to its id, or null. */
  find?(words: string): Promise<number | null>;
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Does a name (or a library path) hold every one of these words? Case, spaces and punctuation are ignored: "jcm 800" finds "nam/Jcm800.nam". */
export function nameMatches(words: string, text: string): boolean {
  const hay = squash(text);
  const parts = words.split(/\s+/).map(squash).filter(Boolean);
  return parts.length > 0 && parts.every((w) => hay.includes(w));
}

const sources = new Map<string, ChoiceSource>();

export function registerChoice(name: string, source: ChoiceSource): void {
  sources.set(name, source);
}

export function getChoice(name: string): ChoiceSource | undefined {
  return sources.get(name);
}
