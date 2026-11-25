import { nameMatches, registerChoice, setNamFactory } from "@/features/instruments/model";
import { createNamEffect, getModelLibrary, speedNote } from "@/features/nam";

let wired = false;

/**
 * Connect the NAM amp-model effect (a separate feature) to the shared effects: the effect factory and the model picker. The looper and
 * the jam's loop inputs both call it; it runs once per page.
 */
export function wireNam() {
  if (wired) return;
  wired = true;
  const lib = getModelLibrary();
  setNamFactory((ctx, p) => createNamEffect(ctx, p, lib));
  registerChoice("nam-model", {
    // only models loaded from this computer: the online library is not used
    find: async (words) => {
      await lib.init().catch(() => undefined);
      return lib.list().find((m) => nameMatches(words, `${m.cloudPath ?? ""} ${m.name}`))?.id ?? null;
    },
    accept: ".nam",
    // useSyncExternalStore needs the same array back until something changes (a new array every call loops forever: React error 185)
    options: (() => {
      let last: { id: number; name: string; cloudPath?: string }[] = [];
      return () => {
        const next = lib.list().map((m) => ({ id: m.id, name: m.name, cloudPath: m.cloudPath }));
        if (next.length !== last.length || next.some((o, i) => o.id !== last[i].id || o.name !== last[i].name || o.cloudPath !== last[i].cloudPath)) last = next;
        return last;
      };
    })(),
    subscribe: (fn) => lib.subscribe(fn),
    addFiles: async (files) => {
      const errors: string[] = [];
      for (const f of files) {
        try {
          await lib.addFile(f);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }
      return errors.length ? errors.join("; ") : null;
    },
    describe: (id) => {
      const m = lib.get(id);
      if (!m) return null;
      const sp = speedNote(m.speed);
      return { text: [m.info.architecture, `${Math.round((m.info.sampleRate ?? 48000) / 1000)} kHz`, sp?.text].filter(Boolean).join(" · "), warn: sp?.warn };
    },
  });
  void lib.init();
}
