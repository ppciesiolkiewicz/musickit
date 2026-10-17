import { nameMatches, registerChoice, setNamFactory } from "@/features/instruments/model";
import { createCloud, createNamEffect, getModelLibrary, speedNote, type CloudModel } from "@/features/nam";

let wired = false;

/**
 * Connect the NAM amp-model effect (a separate feature) to the shared effects: the effect factory and the model picker. The looper and
 * the jam's loop inputs both call it; it runs once per page.
 */
export function wireNam() {
  if (wired) return;
  wired = true;
  const lib = getModelLibrary();
  const cloud = createCloud(lib);
  // the cloud list is read once per page for the rig's amps; a model already fetched is not fetched again
  let cloudList: Promise<CloudModel[]> | null = null;
  const fetching = new Map<string, Promise<number | null>>();
  setNamFactory((ctx, p) => createNamEffect(ctx, p, lib));
  registerChoice("nam-model", {
    cloud,
    find: async (words) => {
      await lib.init().catch(() => undefined);
      const local = lib.list().find((m) => nameMatches(words, `${m.cloudPath ?? ""} ${m.name}`));
      if (local) return local.id;
      cloudList ??= cloud.list().then((r) => ("models" in r ? r.models : []));
      const hit = (await cloudList).find((m) => nameMatches(words, m.path));
      if (!hit) return null;
      if (!fetching.has(hit.path)) fetching.set(hit.path, cloud.use(hit).then((r) => ("id" in r ? r.id : null)));
      return fetching.get(hit.path) ?? null;
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
