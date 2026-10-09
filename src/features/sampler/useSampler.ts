"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { exportBundle, importBundle } from "./bundle";
import * as P from "./model/project";
import type { SampleMeta, SampleSource, SamplerProject } from "./model/types";
import { getStore } from "./store/idb";
import { forgetSample, syncInstruments } from "./sync";

/** The sampler's project: loaded from the store, saved on every change, and kept playable in the sound engine. */
export function useSampler() {
  const store = getStore();
  const [project, setProject] = useState<SamplerProject>(P.emptyProject);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(P.emptyProject()) as { current: SamplerProject };

  const commit = useCallback(
    (next: SamplerProject) => {
      live.current = next;
      setProject(next);
      store.saveProject(next).catch(() => setError("Could not save."));
      void syncInstruments(next, store);
    },
    [store],
  );

  useEffect(() => {
    let off = false;
    store
      .loadProject()
      .then((raw) => {
        if (off) return;
        const loaded = P.sanitiseProject(raw);
        live.current = loaded;
        setProject(loaded);
        setReady(true);
        void syncInstruments(loaded, store);
      })
      .catch(() => {
        if (!off) {
          setReady(true);
          setError("Could not open saved samples.");
        }
      });
    return () => {
      off = true;
    };
  }, [store]);

  const update = (fn: (p: SamplerProject) => SamplerProject) => commit(fn(live.current));

  const addAudio = async (blob: Blob, name: string, source: SampleSource, prompt?: string): Promise<SampleMeta> => {
    const id = P.uniqueId("s", live.current.samples.map((s) => s.id));
    const meta: SampleMeta = { id, name: name.replace(/\.[^.]+$/, "").slice(0, 60) || "Sample", source, prompt, mime: blob.type || "audio/mpeg", bytes: blob.size, createdAt: Date.now() };
    await store.putAudio(id, blob);
    update((p) => P.addSample(p, meta));
    return meta;
  };

  return {
    project,
    ready,
    error,
    clearError: () => setError(null),
    addAudio,
    removeSample: async (id: string) => {
      update((p) => P.removeSample(p, id));
      forgetSample(id);
      await store.deleteAudio(id);
    },
    renameSample: (id: string, name: string) => update((p) => P.renameSample(p, id, name)),
    addInstrument: (label: string) => {
      const id = P.uniqueId("i", live.current.instruments.map((i) => i.id));
      update((p) => P.addInstrument(p, label, id));
      return id;
    },
    removeInstrument: (id: string) => update((p) => P.removeInstrument(p, id)),
    renameInstrument: (id: string, label: string) => update((p) => P.renameInstrument(p, id, label)),
    setEnvelope: (id: string, attack: number, release: number) => update((p) => P.setEnvelope(p, id, attack, release)),
    setPad: (id: string, note: string, sampleId: string) => update((p) => P.setPad(p, id, note, sampleId)),
    clearPad: (id: string, note: string) => update((p) => P.clearPad(p, id, note)),
    movePad: (id: string, from: string, to: string) => update((p) => P.movePad(p, id, from, to)),
    getAudio: (id: string) => store.getAudio(id),
    exportAll: () => exportBundle(live.current, store),
    importAll: async (text: string) => {
      try {
        commit(await importBundle(text, store));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not import.");
      }
    },
  };
}
