/**
 * Choice sources: lists a parameter can pick from (the NAM amp models). The app registers a source under a name and a
 * ParamDef with `choice: name` shows a picker. The value stored in the effect is the numeric id of the option, 0 = none.
 * The looper does not know where the options come from. Imports nothing.
 */

export interface ChoiceOption {
  id: number;
  name: string;
}

/** An optional private online library next to the local options (the app supplies it; the looper only draws it). */
export interface CloudSource {
  getPassword(): string;
  setPassword(v: string): void;
  list(): Promise<{ models: { path: string; name: string; size: number }[] } | { error: string }>;
  /** Bring one model into the local options; resolves to the option id, or an error. */
  use(m: { path: string; name: string; size: number }): Promise<{ id: number } | { error: string }>;
  upload(files: File[]): Promise<string | null>;
  remove(m: { path: string; name: string; size: number }): Promise<string | null>;
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
}

const sources = new Map<string, ChoiceSource>();

export function registerChoice(name: string, source: ChoiceSource): void {
  sources.set(name, source);
}

export function getChoice(name: string): ChoiceSource | undefined {
  return sources.get(name);
}
